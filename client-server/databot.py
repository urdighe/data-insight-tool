import re
from dotenv import load_dotenv
from anthropic import Anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from typing import List, Dict, TypedDict
from contextlib import AsyncExitStack
import json
import os
import logging
from phoenix.otel import register


tracer_provider = register(
    project_name="data-insight-tool",
    endpoint="https://app.phoenix.arize.com/s/utkarshrdighe1997/v1/traces",
    auto_instrument=True,
    batch=True,
)
tracer = tracer_provider.get_tracer(__name__)


MODEL = "claude-3-7-sonnet-20250219"
MAX_TOKENS = 2024


load_dotenv()


class MCPTool(TypedDict):
    name: str
    description: str
    input_schema: dict


class DataBot:
    def __init__(self):
        self.sessions: List[ClientSession] = []
        self.exit_stack = AsyncExitStack()
        self.anthropic = Anthropic(api_key=os.getenv("API_KEY"))
        self.available_tools: List[MCPTool] = []
        self.tool_to_session: Dict[str, ClientSession] = {}

    async def connect_to_server(self, server_name: str, server_config: dict) -> None:
        """Connect to a single MCP server."""
        try:
            server_params = StdioServerParameters(**server_config)
            stdio_transport = await self.exit_stack.enter_async_context(
                stdio_client(server_params)
            )
            read, write = stdio_transport
            session = await self.exit_stack.enter_async_context(
                ClientSession(read, write)
            )
            await session.initialize()
            self.sessions.append(session)

            response = await session.list_tools()
            tools = response.tools
            logging.info(
                f"\nConnected to {server_name} with tools:", [t.name for t in tools]
            )

            for tool in tools:
                self.tool_to_session[tool.name] = session
                self.available_tools.append(
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "input_schema": tool.inputSchema,
                    }
                )
        except Exception as e:
            logging.error(f"Failed to connect to {server_name}: {e}")

    async def connect_to_servers(self):
        """Connect to all configured MCP servers."""
        try:
            with open("server_config.json", "r") as file:
                data = json.load(file)

            servers = data.get("mcpServers", {})

            for server_name, server_config in servers.items():
                await self.connect_to_server(server_name, server_config)
        except Exception as e:
            logging.error(f"Error loading server configuration: {e}")
            raise

    def _create_anthropic_response(self, messages):
        response = self.anthropic.messages.create(
            max_tokens=MAX_TOKENS,
            model=MODEL,
            tools=self.available_tools,
            messages=messages,
        )
        with tracer.start_span("llm_call", openinference_span_kind="llm") as span:
            prompt = messages[-1]["content"]
            completion = response.content[0].text
            span.set_attribute("llm.input", prompt)
            span.set_attribute("llm.output", completion)

            prompt_tokens = getattr(response.usage, "input_tokens", None)
            completion_tokens = getattr(response.usage, "output_tokens", None)
            total_tokens = (prompt_tokens or 0) + (completion_tokens or 0)
            span.set_attribute("llm.token_count.prompt", prompt_tokens)
            span.set_attribute("llm.token_count.completion", completion_tokens)
            span.set_attribute("llm.token_count.total", total_tokens)

            span.set_attribute("llm.model_name", MODEL)
            span.set_attribute("llm.provider", "anthropic")

        return response

    @tracer.tool
    def _call_tool(self, session, tool_name, tool_args):
        return session.call_tool(tool_name, arguments=tool_args)

    @tracer.chain(name="process_query")
    async def process_query(self, query):
        messages = [{"role": "user", "content": query}]
        response = self._create_anthropic_response(messages)
        process_query = True
        while process_query:
            assistant_content = []
            for content in response.content:
                if content.type == "text":
                    logging.info(content.text)
                    assistant_content.append(content)
                    if len(response.content) == 1:
                        return response.content[0].text
                elif content.type == "tool_use":
                    assistant_content.append(content)
                    messages.append({"role": "assistant", "content": assistant_content})
                    tool_id = content.id
                    tool_args = content.input
                    tool_name = content.name

                    logging.info(f"Calling tool {tool_name} with args {tool_args}")

                    session = self.tool_to_session[tool_name]
                    result = await self._call_tool(session, tool_name, tool_args)
                    messages.append(
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "tool_result",
                                    "tool_use_id": tool_id,
                                    "content": result.content,
                                }
                            ],
                        }
                    )
                    response = self._create_anthropic_response(messages)

                    if (
                        len(response.content) == 1
                        and response.content[0].type == "text"
                    ):
                        logging.info(response.content[0].text)
                        return response.content[0].text

    async def cleanup(self):
        """Cleanly close all resources using AsyncExitStack."""
        await self.exit_stack.aclose()
