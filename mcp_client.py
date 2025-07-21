from mcp import ClientSession, StdioServerParameters, types
from mcp.client.stdio import stdio_client
import asyncio
import nest_asyncio
from dotenv import load_dotenv


nest_asyncio.apply()

load_dotenv()


server_params = StdioServerParameters(
    command="uv",
    args=["run", "mcp_server.py"],
    env=None, 
)

async def run():
    async with stdio_client(server_params) as (read, write): 
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()

            result = await session.call_tool("get_tables", arguments={})
            print(result)


if __name__ == "__main__":
    asyncio.run(run())