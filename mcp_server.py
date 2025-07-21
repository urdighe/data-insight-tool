#!/usr/bin/env python3
"""
MCP Server for PostgreSQL
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from mcp.server.fastmcp import FastMCP
from psycopg2 import pool


# Database configuration
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "data_insights",
    "user": "insight_user",
    "password": "insight_password",
}


mcp = FastMCP("postgres-server")


_CONN_POOL = pool.SimpleConnectionPool(minconn=1, maxconn=10, **DB_CONFIG)


def get_connection():
    """Get database connection."""
    return _CONN_POOL.getconn()


@mcp.tool()
def get_tables():
    """Get all tables in the database."""
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                )
                tables = [row["table_name"] for row in cursor.fetchall()]
                return {"tables": tables}
    except Exception as e:
        return {"error": f"Database connection failed: {str(e)}"}


@mcp.tool()
def get_schema(table_name):
    """Get schema for a specific table."""
    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = %s AND table_schema = 'public'
                """,
                    (table_name,),
                )
                columns = [dict(row) for row in cursor.fetchall()]
                return {"table": table_name, "columns": columns}
    except Exception as e:
        return {"error": f"Failed to get schema: {str(e)}"}


@mcp.tool()
def execute_query(sql):
    """Execute a SELECT query."""
    if not sql.strip().upper().startswith("SELECT"):
        return {"error": "Only SELECT queries are allowed"}

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql)
                rows = [dict(row) for row in cursor.fetchall()]
                return {"data": rows}
    except Exception as e:
        return {"error": f"Query failed: {str(e)}"}


@mcp.prompt()
def data_insight_prompt():
    """Generic prompt for the Data Insight Assistant."""
    return """You are a Data Insight Assistant for PostgreSQL. 
    You help users analyze data through natural language.

**How to Help:**
1. Start by exploring available tables by using the available tools.
2. Understand data structure with schema.
3. Generate only SELECT SQL queries for analysis.
4. Provide insights and recommendations in concise and crisp manner.

**Example Questions:**
- "What data do we have?"
- "Analyze sales trends"
- "Find data quality issues"

I can help with data exploration, analysis, insights on Ecommerce data. What would you like to explore?"""


if __name__ == "__main__":
    mcp.run(transport="stdio")
