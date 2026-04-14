# Validation Summary: How to Use Dapr MCP (Model Context Protocol) Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Dapr Python SDK (`dapr` package)
- Dapr Agents (`dapr-agents` package)
- MCP (Model Context Protocol) Python SDK (`mcp` package)
- Claude Desktop MCP configuration

## Sources Consulted
- PyPI package page for `dapr-agents`: https://pypi.org/project/dapr-agents/
- `dapr-agents` GitHub repository and source code (dapr_agents.tool.mcp module, pyproject.toml for extras)
- Dapr Python SDK (`dapr` package) API: `dapr.clients.DaprClient`
- MCP Python SDK (`mcp` package): `mcp.server.fastmcp.FastMCP`
- Dapr CLI documentation for `dapr run` flags
- Claude Desktop MCP configuration documentation

## Issues Found

### 1. Fabricated `DaprMCPServer` class (Critical)
**What was wrong:** The post used `from dapr_agents.mcp import DaprMCPServer` and built the entire MCP server around this class. `DaprMCPServer` does not exist anywhere in the `dapr-agents` package. Dapr's MCP support is client-side only (consuming MCP servers via `MCPClient`), not server-side.
**What was changed:** Replaced with the standard MCP Python SDK's `FastMCP` class (`from mcp.server.fastmcp import FastMCP`), which is the correct way to build MCP servers in Python.

### 2. Fabricated `MCPToolProvider` class (Critical)
**What was wrong:** The post used `from dapr_agents.mcp import MCPToolProvider` and `MCPToolProvider.from_server("dapr-tools")`. This class does not exist in `dapr-agents`.
**What was changed:** Replaced with the actual `MCPClient` class from `dapr_agents.tool.mcp`, using the correct API: `client.connect_stdio()` and `client.get_all_tools()`.

### 3. Wrong module path `dapr_agents.mcp` (High)
**What was wrong:** The post imported from `dapr_agents.mcp`. The correct module path is `dapr_agents.tool.mcp`.
**What was changed:** All imports updated to use `dapr_agents.tool.mcp`.

### 4. Wrong Dapr client import (High)
**What was wrong:** `from dapr import Client` — the `Client` class is not exported from the top-level `dapr` package.
**What was changed:** Corrected to `from dapr.clients import DaprClient` and `DaprClient()`.

### 5. Wrong installation instructions (High)
**What was wrong:** `pip install dapr-agents[mcp]` and `pip install dapr-mcp` — neither the `[mcp]` extra nor the `dapr-mcp` package exist. MCP support is a core dependency of `dapr-agents`.
**What was changed:** Replaced with `pip install dapr-agents mcp dapr` with an explanation of each package's role.

### 6. `@server.tool("name")` decorator syntax (Medium)
**What was wrong:** Used `@server.tool("save_state")` with an explicit name string. FastMCP's `@server.tool()` decorator infers the tool name from the function name by default.
**What was changed:** Changed to `@server.tool()` without explicit name arguments.

### 7. Deprecated `--components-path` CLI flag (Medium)
**What was wrong:** `dapr run --components-path ./components` uses a deprecated flag.
**What was changed:** Replaced with `--resources-path ./components`.

### 8. Dapr SDK parameter names (Low)
**What was wrong:** `publish_event` used `topic` instead of `topic_name`; `invoke_method` used `method` instead of `method_name`. These work positionally but are incorrect parameter names.
**What was changed:** Updated to use the correct parameter names `topic_name` and `method_name`.

## Review Notes
- The fundamental concept of the post (exposing Dapr operations via MCP) is valid, but the original implementation was built around fabricated APIs. The corrected version uses the standard MCP Python SDK for the server side and the actual `dapr-agents` MCPClient for the client/agent side.
- The `dapr-agents` package is at version 1.0.0 as of March 2026. The MCP client API may evolve in future releases.
- The `@server.resource()` decorator pattern from FastMCP was kept as-is since it matches the standard MCP SDK API.
- The Claude Desktop configuration section was correct in the original post and required no changes.
