# Observability for AI Agents: A Practical OpenTelemetry Guide

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: AI, OpenTelemetry, Observability, Monitoring, LLM, Open Source

Description: AI agents are shipping to production faster than teams can observe them. A practical guide to instrumenting agent workflows with OpenTelemetry for traces, metrics, and cost tracking.

AI coding agents, customer support bots, autonomous DevOps tools - agents are everywhere in 2026. But here's the uncomfortable truth: most teams are shipping them to production with zero observability.

When your agent makes a bad API call, hallucinates a database query, or burns through your token budget at 3am, you need the same level of visibility you'd expect from any production service. Not more. Not less. Just observability.

This guide covers how to instrument AI agent workloads with OpenTelemetry so you can trace every decision, measure what matters, and debug failures without guessing.

## Why Agent Observability Is Different

Traditional request-response services have predictable flows. An HTTP request comes in, you process it, you respond. Agents are different:

- **Non-deterministic execution** - The same input can produce different tool call sequences
- **Multi-step reasoning** - A single user request might trigger 5-20 LLM calls with tool use in between
- **External dependencies** - Agents call APIs, databases, file systems, and other services dynamically
- **Cost sensitivity** - Every LLM call costs money, and runaway agents can burn budgets fast
- **Feedback loops** - Agents often evaluate their own output and retry, creating recursive patterns

Standard APM dashboards don't capture this well. You need traces that show the *reasoning chain*, not just the HTTP calls.

## The Four Signals for Agent Monitoring

### 1. Traces: Follow the Reasoning Chain

Each agent invocation should be a single trace with spans for:

- **Agent session** - The root span covering the entire interaction
- **LLM calls** - Each call to the model, including prompt, completion, and token counts
- **Tool executions** - Each tool the agent invokes (API calls, database queries, file operations)
- **Evaluation steps** - When the agent assesses its own output or decides to retry

Here's how to instrument a basic agent loop in TypeScript with OpenTelemetry:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('ai-agent');

async function runAgent(userMessage: string) {
  return tracer.startActiveSpan('agent.session', async (sessionSpan) => {
    sessionSpan.setAttribute('agent.user_message', userMessage);
    sessionSpan.setAttribute('agent.model', 'claude-4-sonnet');

    let iterations = 0;
    let totalTokens = 0;

    while (iterations < 10) {
      iterations++;

      // Trace each LLM call
      const response = await tracer.startActiveSpan('llm.call', async (llmSpan) => {
        llmSpan.setAttribute('llm.model', 'claude-4-sonnet');
        llmSpan.setAttribute('llm.iteration', iterations);

        const result = await callLLM(userMessage);

        llmSpan.setAttribute('llm.input_tokens', result.inputTokens);
        llmSpan.setAttribute('llm.output_tokens', result.outputTokens);
        llmSpan.setAttribute('llm.stop_reason', result.stopReason);
        totalTokens += result.inputTokens + result.outputTokens;

        llmSpan.end();
        return result;
      });

      // Trace tool executions
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          await tracer.startActiveSpan('tool.execute', async (toolSpan) => {
            toolSpan.setAttribute('tool.name', toolCall.name);
            toolSpan.setAttribute('tool.input', JSON.stringify(toolCall.input));

            try {
              const result = await executeTool(toolCall);
              toolSpan.setAttribute('tool.success', true);
            } catch (error) {
              toolSpan.setAttribute('tool.success', false);
              toolSpan.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message
              });
            }

            toolSpan.end();
          });
        }
      }

      if (response.stopReason === 'end_turn') break;
    }

    sessionSpan.setAttribute('agent.total_iterations', iterations);
    sessionSpan.setAttribute('agent.total_tokens', totalTokens);
    sessionSpan.end();
  });
}
```

The key insight: **each LLM call and tool execution gets its own span**. This lets you see exactly where time and tokens are spent in the reasoning chain.

### 2. Metrics: Track What Matters

For agents, the critical metrics are different from traditional services:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('ai-agent');

// Cost tracking
const tokenCounter = meter.createCounter('agent.tokens.total', {
  description: 'Total tokens consumed by agent',
});

// Performance
const latencyHistogram = meter.createHistogram('agent.session.duration', {
  description: 'Agent session duration in milliseconds',
  unit: 'ms',
});

// Reliability
const iterationHistogram = meter.createHistogram('agent.iterations', {
  description: 'Number of LLM iterations per session',
});

const toolErrorCounter = meter.createCounter('agent.tool.errors', {
  description: 'Tool execution failures',
});
```

**The metrics that actually matter for agents:**

| Metric | Why It Matters |
|--------|---------------|
| `agent.tokens.total` | Cost control - detect runaway token usage |
| `agent.session.duration` | User experience - are agents responsive? |
| `agent.iterations` | Efficiency - more iterations = more cost and latency |
| `agent.tool.errors` | Reliability - broken tools = broken agents |
| `agent.tool.invocations` | Usage patterns - which tools are agents actually using? |
| `agent.session.success_rate` | Overall reliability - are agents completing tasks? |

### 3. Logs: Structured Context for Debugging

Agent logs should be structured and correlated with traces:

```typescript
import { trace } from '@opentelemetry/api';

function agentLog(
  level: string,
  message: string,
  attributes: Record<string, any>
) {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    traceId,
    ...attributes,
  }));
}

// Usage
agentLog('info', 'Agent decided to use tool', {
  tool: 'database_query',
  reasoning: 'User asked about recent orders',
  iteration: 3,
});
```

The trace ID in every log line lets you jump from a log entry straight to the full reasoning chain in your observability platform.

### 4. Events: Capture Decisions

Agent decisions are the most valuable signal. Use span events to record them:

```typescript
const span = trace.getActiveSpan();

span?.addEvent('agent.decision', {
  'decision.type': 'tool_selection',
  'decision.chosen_tool': 'search_api',
  'decision.reasoning': 'User query requires external data lookup',
  'decision.alternatives_considered': 'cache_lookup, database_query',
});
```

## Setting Up the Pipeline

### OpenTelemetry Collector Configuration

Your collector config should handle agent telemetry alongside everything else:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  # Add cost attributes based on token counts
  transform:
    trace_statements:
      - context: span
        statements:
          - set(attributes["agent.estimated_cost_usd"],
              attributes["llm.input_tokens"] * 0.000003 +
              attributes["llm.output_tokens"] * 0.000015)
            where: attributes["llm.model"] == "claude-4-sonnet"

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, transform]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

The `transform` processor automatically calculates estimated cost per span - so you can see cost attribution in your traces without any application code changes.

### Alerting on Agent Behavior

Set up alerts for the failure modes that matter:

- **Token budget exceeded** - `agent.tokens.total` per session exceeds threshold
- **Infinite loops** - `agent.iterations` exceeds expected maximum
- **Tool failure spikes** - `agent.tool.errors` rate exceeds normal baseline
- **Latency degradation** - `agent.session.duration` P95 exceeds SLO
- **Cost anomaly** - Daily token spend exceeds projected budget by more than 20%

## What Good Agent Observability Looks Like

When you open a trace for a failed agent session, you should be able to see:

1. **The user's original request**
2. **Every LLM call** with input/output token counts and latency
3. **Every tool call** with inputs, outputs, and success/failure
4. **The agent's decisions** at each step (via span events)
5. **Where it went wrong** - the specific span that failed or took too long
6. **How much it cost** - total tokens and estimated USD

This is the same level of visibility you'd expect when debugging a microservices request. Agents deserve the same treatment.

## The Open Source Advantage

Here's where open source matters: agent observability is still a new category. The vendor landscape is fragmented, with proprietary SDKs and incompatible formats everywhere.

OpenTelemetry gives you a vendor-neutral instrumentation layer. Instrument once, send to any backend. If you start with one observability platform and outgrow it, you switch the exporter - not the instrumentation.

And with platforms like OneUptime that support OpenTelemetry natively, you get traces, metrics, logs, alerting, and incident management in one place. No separate tool for each signal. No context-switching between dashboards.

## Getting Started

1. **Add OpenTelemetry SDK** to your agent service
2. **Instrument the agent loop** - one span per LLM call, one per tool execution
3. **Add semantic attributes** - token counts, model name, tool name, iteration count
4. **Set up the collector** with cost calculation transforms
5. **Create alerts** for token budget, iteration count, and error rate
6. **Build a dashboard** showing sessions, cost, latency, and success rate

The agents are already in production. The observability should be too.
