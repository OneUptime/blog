# How to Use the Traceloop MCP Server to Query Production Traces from Your IDE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, MCP, Traceloop, IDE Integration, Production Debugging

Description: Set up the Traceloop MCP server to query production OpenTelemetry traces directly from Cursor, VS Code, or Claude Code.

The Model Context Protocol (MCP) lets AI coding assistants interact with external tools and data sources. Traceloop maintains an OpenTelemetry MCP server that connects your IDE to production OpenTelemetry traces. This means you can ask your AI assistant questions like "show me the slowest traces from the checkout service" without leaving your editor. This post shows you how to set it up.

## What is the Traceloop MCP Server?

Traceloop is a platform built on top of OpenTelemetry that provides trace analytics. The OpenTelemetry MCP server exposes trace data as tools that AI assistants can call. When you ask a question about your traces, the assistant calls the MCP server, which queries the trace backend and returns the results in a format the assistant can interpret and present to you.

## Prerequisites

You need:
- A Traceloop account with an API key (or a supported OpenTelemetry trace backend such as Jaeger or Grafana Tempo)
- An IDE that supports MCP: Cursor, VS Code with the Claude extension, or Claude Code CLI
- Python 3.11 or higher and pipx installed
- Production services sending traces to your backend

## Installing the MCP Server

Install the OpenTelemetry MCP server with pipx:

```bash
pipx install opentelemetry-mcp
```

Verify it is installed:

```bash
opentelemetry-mcp --help
```

## Configuring for Cursor

Cursor supports MCP servers through its settings. Open Cursor settings and navigate to the MCP section. Add a new server configuration:

```json
{
  "mcpServers": {
    "opentelemetry-mcp": {
      "command": "pipx",
      "args": ["run", "opentelemetry-mcp"],
      "env": {
        "BACKEND_TYPE": "traceloop",
        "BACKEND_URL": "https://api.traceloop.com",
        "BACKEND_API_KEY": "YOUR_TRACELOOP_API_KEY"
      }
    }
  }
}
```

Save the settings and restart Cursor. The MCP server starts automatically when Cursor launches.

## Configuring for VS Code with Claude Extension

If you use the Claude Code extension for VS Code, add the MCP server from VS Code's integrated terminal. The extension shares MCP configuration with the Claude Code CLI:

```bash
claude mcp add --transport stdio \
  --env BACKEND_TYPE=traceloop \
  --env BACKEND_URL=https://api.traceloop.com \
  --env BACKEND_API_KEY=YOUR_TRACELOOP_API_KEY \
  opentelemetry-mcp -- pipx run opentelemetry-mcp
```

## Configuring for Claude Code CLI

For Claude Code, add the server to your project's `.mcp.json` file in the repository root:

```json
{
  "mcpServers": {
    "opentelemetry-mcp": {
      "command": "pipx",
      "args": ["run", "opentelemetry-mcp"],
      "env": {
        "BACKEND_TYPE": "traceloop",
        "BACKEND_URL": "https://api.traceloop.com",
        "BACKEND_API_KEY": "YOUR_TRACELOOP_API_KEY"
      }
    }
  }
}
```

Now when you start Claude Code in your project directory, it detects the project-scoped MCP server and prompts you to approve it before connecting.

## Querying Traces from Your IDE

Once configured, you can interact with your production traces through natural language. Here are some practical queries you might use during development:

**Finding slow endpoints:**
Ask your assistant: "What are the slowest API endpoints in the order-service over the last hour?"

The MCP server queries your trace backend and returns a summary of the slowest spans, including their average duration and the endpoints they correspond to.

**Investigating errors:**
Ask: "Show me recent error traces from the payment-service."

You get back trace IDs, error messages, and span attributes that help you understand what went wrong.

**Correlating with code changes:**
After deploying a change, ask: "Compare the p95 latency of the /api/checkout endpoint before and after the last deployment."

This is particularly useful during code review or post-deployment verification.

## Practical Debugging Workflow

Here is a realistic scenario. You are working on a pull request that modifies the order processing logic. Before merging, you want to check how the current production behavior looks.

You ask your assistant: "Show me a sample trace for POST /api/orders including all child spans."

The assistant calls the MCP server, which fetches a representative trace. The response includes the full span tree:

```text
POST /api/orders (245ms)
  -> validate-order (12ms)
  -> check-inventory (89ms)
     -> redis.GET inventory:sku-123 (3ms)
     -> postgres SELECT stock FROM products (45ms)
  -> process-payment (134ms)
     -> POST https://payments.stripe.com/v1/charges (120ms)
```

Now you can see exactly where time is spent. The payment processing takes the most time, which is expected for an external API call. Your code change affects the validate-order step, so you know to watch that span after your deployment.

## Security Considerations

Your API key grants read access to trace data, which may contain sensitive information like user IDs, request parameters, or database queries. Keep these practices in mind:

- Store the API key in an environment variable rather than hardcoding it in config files
- Add `.mcp.json` to your `.gitignore` if it contains secrets
- Use a read-only API key scoped to the trace data you need
- Consider using a separate API key for each developer

```bash
# Set the API key as an environment variable

export BACKEND_API_KEY="your-key-here"
```

Then reference it in your MCP configuration:

```json
{
  "mcpServers": {
    "opentelemetry-mcp": {
      "command": "pipx",
      "args": ["run", "opentelemetry-mcp"],
      "env": {
        "BACKEND_TYPE": "traceloop",
        "BACKEND_URL": "https://api.traceloop.com",
        "BACKEND_API_KEY": "${BACKEND_API_KEY}"
      }
    }
  }
}
```

## Making the Most of It

The MCP server is most valuable when you integrate it into your regular development habits. Before starting work on a bug fix, query the traces related to the bug. During code review, ask for production metrics on the code paths being changed. After deployment, verify that the traces look healthy.

This turns production observability from something you check in a separate tool into something that is always at your fingertips as you write code.
