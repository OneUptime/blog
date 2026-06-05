# Validation Summary: How to Use the Traceloop MCP Server to Query Production Traces from Your IDE

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Model Context Protocol (MCP)
- OpenTelemetry
- Traceloop
- Jaeger
- Grafana Tempo
- Cursor MCP configuration
- Claude Code CLI and VS Code extension MCP configuration
- Python / pipx

## Sources Consulted
- Traceloop OpenTelemetry MCP Server GitHub repository: https://github.com/traceloop/opentelemetry-mcp-server
- opentelemetry-mcp PyPI package page: https://pypi.org/project/opentelemetry-mcp/
- Model Context Protocol architecture documentation: https://modelcontextprotocol.io/docs/learn/architecture
- Cursor MCP documentation: https://docs.cursor.com/context/model-context-protocol
- Claude Code MCP documentation: https://code.claude.com/docs/en/mcp
- Claude Code VS Code extension documentation: https://code.claude.com/docs/en/ide-integrations
- npm registry check for `@traceloop/mcp-server`
- Downloaded `opentelemetry-mcp==0.2.2` wheel metadata and source to verify console entry point, environment variables, supported backends, and CLI flags

## Issues Found
- The post referenced an npm package, `@traceloop/mcp-server`, and executable, `traceloop-mcp-server`, that are not published in the npm registry. Updated installation and execution examples to use the documented PyPI package `opentelemetry-mcp` and executable `opentelemetry-mcp`.
- The post used `traceloop-mcp-server --version`, but the verified Click CLI exposes `--help` and does not define a version flag. Updated the verification command to `opentelemetry-mcp --help`.
- The post used `TRACELOOP_API_KEY` and `TRACELOOP_BASE_URL` environment variables, but the server uses `BACKEND_TYPE`, `BACKEND_URL`, and `BACKEND_API_KEY`. Updated all configuration snippets accordingly.
- The post described a "compatible OTLP backend" as a prerequisite. The server supports Jaeger, Tempo, and Traceloop trace backends; it is not configured directly against a generic OTLP endpoint. Updated the prerequisite wording.
- The VS Code section used a `claude.mcpServers` setting that is not the documented path for the Claude Code extension. Updated it to use `claude mcp add` from the integrated terminal, matching the extension's documented MCP workflow.
- The Claude Code section said project `.mcp.json` servers connect automatically. Claude Code detects project-scoped MCP servers and prompts for approval before use. Updated the wording.
- The security example exported `TRACELOOP_API_KEY` while the corrected config referenced `BACKEND_API_KEY`. Updated the export command.

## Review Notes
The article is now technically aligned with the current Traceloop-maintained OpenTelemetry MCP server. Future improvements could mention that `pipx run opentelemetry-mcp` avoids a global install, but the current pipx install path is valid.
