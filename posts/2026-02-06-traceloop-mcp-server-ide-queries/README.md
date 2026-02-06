# How to Use the Traceloop MCP Server to Query Production Traces from Your IDE (Cursor, VS Code, Claude)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, MCP, Traceloop, IDE Integration, Production Debugging

Description: Set up the Traceloop MCP server to query production OpenTelemetry traces directly from Cursor, VS Code, or Claude Code.

The Model Context Protocol (MCP) lets AI coding assistants interact with external tools and data sources. Traceloop provides an MCP server that connects your IDE to production OpenTelemetry traces. This means you can ask your AI assistant questions like "show me the slowest traces from the checkout service" without leaving your editor. This post shows you how to set it up.

## What is the Traceloop MCP Server?

Traceloop is a platform built on top of OpenTelemetry that provides trace analytics. Their MCP server exposes trace data as a tool that AI assistants can call. When you ask a question about your traces, the assistant calls the Traceloop MCP server, which queries the trace backend and returns the results in a format the assistant can interpret and present to you.

## Prerequisites

You need:
- A Traceloop account with an API key (or a compatible OTLP backend)
- An IDE that supports MCP: Cursor, VS Code with the Claude extension, or Claude Code CLI
- Production services sending traces to your backend

## Installing the MCP Server

Install the Traceloop MCP server globally:

```bash
npm install -g @traceloop/mcp-server
```

Verify it is installed:

```bash
traceloop-mcp-server --version
```

## Configuring for Cursor

Cursor supports MCP servers through its settings. Open Cursor settings and navigate to the MCP section. Add a new server configuration:

```json
{
  "mcpServers": {
    "traceloop": {
      "command": "traceloop-mcp-server",
      "args": ["--api-key", "YOUR_TRACELOOP_API_KEY"],
      "env": {
        "TRACELOOP_BASE_URL": "https://api.traceloop.com"
      }
    }
  }
}
```

Save the settings and restart Cursor. The MCP server starts automatically when Cursor launches.

## Configuring for VS Code with Claude Extension

If you use the Claude extension for VS Code, add the MCP server to your VS Code settings (`settings.json`):

```json
{
  "claude.mcpServers": {
    "traceloop": {
      "command": "traceloop-mcp-server",
      "args": ["--api-key", "YOUR_TRACELOOP_API_KEY"],
      "env": {
        "TRACELOOP_BASE_URL": "https://api.traceloop.com"
      }
    }
  }
}
```

## Configuring for Claude Code CLI

For Claude Code, add the server to your project's `.mcp.json` file in the repository root:

```json
{
  "mcpServers": {
    "traceloop": {
      "command": "traceloop-mcp-server",
      "args": ["--api-key"],
      "env": {
        "TRACELOOP_API_KEY": "YOUR_TRACELOOP_API_KEY",
        "TRACELOOP_BASE_URL": "https://api.traceloop.com"
      }
    }
  }
}
```

Now when you start Claude Code in your project directory, it automatically connects to the Traceloop MCP server.

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

The assistant calls the Traceloop MCP server, which fetches a representative trace. The response includes the full span tree:

```
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
export TRACELOOP_API_KEY="your-key-here"
```

Then reference it in your MCP configuration:

```json
{
  "mcpServers": {
    "traceloop": {
      "command": "traceloop-mcp-server",
      "env": {
        "TRACELOOP_API_KEY": "${TRACELOOP_API_KEY}"
      }
    }
  }
}
```

## Making the Most of It

The MCP server is most valuable when you integrate it into your regular development habits. Before starting work on a bug fix, query the traces related to the bug. During code review, ask for production metrics on the code paths being changed. After deployment, verify that the traces look healthy.

This turns production observability from something you check in a separate tool into something that is always at your fingertips as you write code.
