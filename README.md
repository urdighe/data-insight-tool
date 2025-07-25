# Data Insight Tool

A powerful Python-based tool for data analysis, visualization, and insights generation.

## How to load the data from CSV to PG:

`python load_data.py ~/Downloads/archive/retry  --host localhost --port 5432 --user insight_user --password insight_password`

## Run MCP Client

`uv run mcp_client.py`

## Inspect MCP Server

`npx @modelcontextprotocol/inspector uv run mcp_server.py`

## Run MCP Client and Server

`uv run mcp_client.py`

## Start WS server

`uvicorn client_ws_server:app --reload --port 8001`

## Run app

`python -m http.server`