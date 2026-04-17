# How to Instrument MCP Servers with OpenTelemetry for Production Observability

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, OpenTelemetry, AI, Open Source, Monitoring

Description: A practical guide to adding OpenTelemetry tracing to Model Context Protocol (MCP) servers so you can monitor tool calls, latency, errors, and token usage in production.

MCP servers are becoming the standard interface between AI agents and the real world. Your agent calls a tool, the MCP server executes it, and something happens - a database query runs, an API gets called, a file gets written.

The problem? Most teams deploying MCP servers in production have zero visibility into what's actually happening inside them.

You know the tool was called. You know something came back. But you don't know how long the database query took, whether the API call retried three times, or why the response was empty. When your AI agent starts behaving erratically at 3am, you're flying blind.

OpenTelemetry fixes this. Here's how to instrument your MCP servers properly.

## Why MCP Servers Need Observability

MCP servers sit at a critical junction: they're the bridge between your AI agents and your infrastructure. Unlike a traditional API where a human triggers a request and can see the response, MCP tool calls are initiated by an AI model. The human is often not in the loop at all.

This creates several observability challenges:

1. **Unpredictable call patterns.** AI agents decide when and how to call tools. You can't predict the load profile the way you can with a traditional API.
2. **Cascading failures are invisible.** If an MCP tool calls a downstream API that's slow, the agent might retry, call a different tool, or hallucinate a response. Without traces, you can't see the chain of events.
3. **Cost attribution is hard.** Each tool call might trigger API calls, database queries, or compute - and you need to know which agent invocations are expensive.
4. **Error semantics are different.** A tool that returns an error message as text (not an HTTP 500) looks successful to your monitoring unless you instrument the semantics.

## The Architecture

Here's what we're building:

```text
AI Agent → MCP Client → MCP Server → [Your Tools]
                            │
                            ├── OpenTelemetry SDK
                            │     ├── Traces (per tool call)
                            │     ├── Metrics (latency, error rates)
                            │     └── Logs (structured tool execution logs)
                            │
                            └── OTel Collector → Your Backend
```

The MCP server gets instrumented with the OpenTelemetry SDK. Each tool invocation becomes a trace with spans for the internal operations. Metrics are derived from the traces. Everything flows through the OpenTelemetry Collector to whatever backend you use.

## Setting Up the MCP Server

Let's start with a basic MCP server in Node.js using the official `@modelcontextprotocol/sdk`:

```javascript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({
  name: "example-server",
  version: "1.0.0",
});

server.tool("query_database", { query: z.string() }, async ({ query }) => {
  const result = await db.execute(query);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

Nothing special yet. Let's add observability.

## Adding OpenTelemetry Instrumentation

First, install the OpenTelemetry packages:

```bash
npm install @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

### Initialize the SDK

Create a `tracing.js` file that sets up OpenTelemetry before anything else runs:

```javascript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "mcp-server-example",
    [ATTR_SERVICE_VERSION]: "1.0.0",
    "mcp.server.name": "example-server",
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + "/v1/traces",
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + "/v1/metrics",
    }),
    exportIntervalMillis: 15000,
  }),
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Import this file at the very top of your entrypoint, before any other imports:

```javascript
import "./tracing.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// ... rest of your server
```

### Instrument Tool Calls

Now wrap your tool handlers with spans. Here's a utility function that makes this clean:

```javascript
import { trace, SpanStatusCode, metrics } from "@opentelemetry/api";

const tracer = trace.getTracer("mcp-server");
const meter = metrics.getMeter("mcp-server");

// Metrics
const toolCallCounter = meter.createCounter("mcp.tool.calls", {
  description: "Number of MCP tool invocations",
});
const toolCallDuration = meter.createHistogram("mcp.tool.duration", {
  description: "Duration of MCP tool calls in milliseconds",
  unit: "ms",
});
const toolErrorCounter = meter.createCounter("mcp.tool.errors", {
  description: "Number of MCP tool errors",
});

function instrumentTool(name, schema, handler) {
  return server.tool(name, schema, async (params) => {
    const startTime = Date.now();
    const attributes = {
      "mcp.tool.name": name,
      "mcp.server.name": "example-server",
    };

    return tracer.startActiveSpan(`mcp.tool/${name}`, { attributes }, async (span) => {
      try {
        toolCallCounter.add(1, attributes);

        const result = await handler(params);

        // Check for error content in the response
        const hasError = result.content?.some(
          (c) => c.type === "text" && c.text?.startsWith("Error:")
        );

        if (hasError) {
          span.setStatus({ code: SpanStatusCode.ERROR, message: "Tool returned error content" });
          toolErrorCounter.add(1, attributes);
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        span.recordException(error);
        toolErrorCounter.add(1, attributes);
        throw error;
      } finally {
        const duration = Date.now() - startTime;
        toolCallDuration.record(duration, attributes);
        span.setAttribute("mcp.tool.duration_ms", duration);
        span.end();
      }
    });
  });
}
```

Now use `instrumentTool` instead of `server.tool`:

```javascript
instrumentTool("query_database", { query: z.string() }, async ({ query }) => {
  // Your existing handler - but now every call gets a trace
  const result = await db.execute(query);
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

### Adding Child Spans for Internal Operations

The real power shows up when you add child spans for the operations inside your tools:

```javascript
instrumentTool("search_docs", { query: z.string(), limit: z.number().optional() }, async ({ query, limit }) => {
  // Span for the embedding generation
  const embedding = await tracer.startActiveSpan("generate_embedding", async (span) => {
    span.setAttribute("embedding.model", "text-embedding-3-small");
    span.setAttribute("embedding.input_length", query.length);

    const result = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    span.setAttribute("embedding.dimensions", result.data[0].embedding.length);
    span.end();
    return result.data[0].embedding;
  });

  // Span for the vector search
  const results = await tracer.startActiveSpan("vector_search", async (span) => {
    span.setAttribute("search.limit", limit || 10);
    span.setAttribute("search.collection", "documents");

    const hits = await vectorDb.search({
      collection: "documents",
      vector: embedding,
      limit: limit || 10,
    });

    span.setAttribute("search.results_count", hits.length);
    span.end();
    return hits;
  });

  return {
    content: [{ type: "text", text: JSON.stringify(results) }],
  };
});
```

Now when you look at the trace, you see exactly where time was spent: embedding generation vs. vector search.

## Setting Up the OpenTelemetry Collector

Your MCP server sends telemetry to the OpenTelemetry Collector, which processes and routes it. Here's a collector config:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  attributes:
    actions:
      - key: environment
        value: production
        action: upsert

exporters:
  # Send to your observability backend
  otlphttp:
    endpoint: https://your-backend.example.com

connectors:
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 5s]
    dimensions:
      - name: mcp.tool.name
      - name: mcp.server.name

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, attributes]
      exporters: [otlphttp, spanmetrics]
    metrics:
      receivers: [otlp, spanmetrics]
      processors: [batch]
      exporters: [otlphttp]
```

The `spanmetrics` connector automatically generates RED metrics (Rate, Error, Duration) from your traces - so you get dashboards for free.

## What to Monitor

Once instrumented, here's what to pay attention to:

### Tool Call Latency (P50, P95, P99)

Each tool should have a baseline latency. When an AI agent calls `search_docs` and it usually takes 200ms but suddenly takes 3 seconds, something is wrong downstream.

Set alerts on P95 latency per tool:

```text
mcp.tool.duration{mcp.tool.name="search_docs"} > 1000ms for 5 minutes
```

### Error Rates by Tool

Some tools will fail more than others. A tool that calls an external API will have a higher error rate than one that reads a local file. Know your baselines.

```text
rate(mcp.tool.errors{mcp.tool.name="query_database"}) / rate(mcp.tool.calls{mcp.tool.name="query_database"}) > 0.05
```

5% error rate on database queries? Something's wrong.

### Call Volume Anomalies

AI agents can get into loops. If `search_docs` is normally called 100 times per hour and suddenly it's being called 10,000 times, an agent is probably stuck in a retry loop. This is the kind of thing that runs up your API bills.

### Trace Duration Distribution

Look at the histogram of trace durations. A bimodal distribution (most calls fast, some very slow) usually indicates a downstream dependency issue - cache misses, connection pool exhaustion, or cold starts.

## Semantic Conventions for MCP

OpenTelemetry's GenAI semantic conventions are evolving, but here's a practical set of attributes for MCP servers:

| Attribute | Example | Description |
|-----------|---------|-------------|
| `mcp.server.name` | `example-server` | MCP server identifier |
| `mcp.tool.name` | `search_docs` | Tool being invoked |
| `mcp.tool.duration_ms` | `234` | Execution time |
| `mcp.transport` | `stdio` / `sse` / `streamable-http` | Transport type |
| `mcp.request.id` | `req_abc123` | Request correlation ID |
| `gen_ai.system` | `openai` / `anthropic` | AI provider (if known) |

Consistent attributes let you slice and dice across tools, servers, and agents.

## Connecting Traces to the AI Agent

The full picture requires connecting MCP server traces to the agent that initiated the call. If your AI agent framework supports OpenTelemetry (LangChain, LlamaIndex, and others do), you can propagate trace context through the MCP call.

For HTTP-based MCP transports (SSE, Streamable HTTP), this works naturally - the trace context propagates via HTTP headers. For stdio-based transports, you'll need to pass the trace context explicitly in the tool call parameters or through environment variables.

The result is a single trace that shows: agent reasoning → tool selection → MCP server execution → downstream calls. When something breaks, you see the entire chain.

## A Real Production Example

Here's what a fully instrumented trace looks like for a `search_and_summarize` tool:

```text
[2.3s] mcp.tool/search_and_summarize
  ├── [0.1s] generate_embedding
  │     └── openai.embeddings.create (text-embedding-3-small)
  ├── [0.4s] vector_search
  │     └── pinecone.query (top_k=10, results=8)
  ├── [0.05s] filter_results
  │     └── relevance_threshold=0.85, filtered=3
  └── [1.7s] generate_summary
        └── openai.chat.completions.create (gpt-4o, 1,847 tokens)
```

At a glance: the summary generation is the bottleneck (1.7s of the 2.3s total). If you wanted to optimize, you'd look at the prompt length, model choice, or whether you could cache common summaries.

Without this trace, all you'd see is "search_and_summarize took 2.3s." That's useless for debugging.

## Key Takeaways

MCP servers are infrastructure. Treat them like any other production service: instrument them, monitor them, set alerts.

OpenTelemetry gives you vendor-neutral instrumentation that works with whatever backend you're already using. The `spanmetrics` connector means you get metrics from traces without extra work.

The most important things to track: per-tool latency, error rates, call volume anomalies, and end-to-end traces that connect agent reasoning to tool execution.

AI agents are only as reliable as the tools they call. If you can't see what your MCP servers are doing, you can't make your agents reliable.

Start with traces on your most-called tools. Add child spans for downstream operations. Set up basic alerts on latency and error rates. You'll catch problems before your users - or your agents - do.
