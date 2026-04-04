# Observability for AI Agents in Production

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, AI, LLM, OpenTelemetry, Monitoring

Description: AI agents are taking over production workloads, but most teams have zero visibility into what they actually do. Here is how to instrument them properly.

Every engineering team is shipping AI agents right now. Coding agents, customer support agents, data pipeline agents, autonomous DevOps agents. The "agentic" wave has arrived, and it is moving fast.

But here is the uncomfortable truth: **most teams have zero observability into what their agents are actually doing in production.**

Traditional monitoring was built for request-response cycles. A user hits an endpoint, you measure latency, check the status code, move on. AI agents break this model completely. They make decisions. They chain tool calls. They retry, backtrack, and hallucinate. A single "request" can fan out into dozens of LLM calls, each with different prompts, different token counts, and different failure modes.

If you cannot see inside this process, you are flying blind. And in production, flying blind gets expensive fast.

## Why Traditional APM Falls Short

Application Performance Monitoring tools were designed for a world where code paths are deterministic. Function A calls Function B, which queries the database, which returns a result. You trace the whole thing, measure the latency at each hop, and call it a day.

AI agents are non-deterministic by design. The same input can produce wildly different execution paths depending on the model's response. Consider a typical agent loop:

1. User sends a message
2. Agent calls the LLM to decide what tool to use
3. LLM picks a tool (maybe correctly, maybe not)
4. Tool executes and returns results
5. Agent calls the LLM again with the tool results
6. LLM decides to call another tool, or respond
7. Repeat steps 3-6 anywhere from 1 to 20 times

Traditional traces capture the HTTP calls, but they miss the semantic layer. They do not tell you *why* the agent chose tool A over tool B, *what* the prompt contained, or *whether* the model's reasoning was sound. You get latency numbers but no understanding.

## The Four Pillars of Agent Observability

To properly monitor AI agents, you need to track four distinct signal types that go beyond classical observability:

### 1. Agent Traces (The Decision Chain)

Every agent run should produce a trace that captures the full decision chain, not just the HTTP calls. Each LLM invocation is a span. Each tool call is a child span. The trace should show:

- The original user input
- Each LLM call with its prompt (or a hash of it for privacy)
- The model's response and any tool calls it requested
- Tool execution results
- Token counts (input and output) per call
- The final response delivered to the user

With OpenTelemetry, you can instrument this naturally:

```typescript
const tracer = trace.getTracer('agent-service');

async function runAgent(userMessage: string) {
  return tracer.startActiveSpan('agent.run', async (rootSpan) => {
    rootSpan.setAttribute('agent.input', userMessage);
    
    let iteration = 0;
    while (iteration < MAX_ITERATIONS) {
      const llmSpan = tracer.startSpan('agent.llm_call', {
        attributes: {
          'llm.model': 'gpt-4',
          'llm.iteration': iteration,
          'llm.prompt_tokens': promptTokens,
        }
      });
      
      const response = await callLLM(messages);
      llmSpan.setAttribute('llm.completion_tokens', response.usage.completionTokens);
      llmSpan.setAttribute('llm.tool_calls', response.toolCalls?.length ?? 0);
      llmSpan.end();

      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          const toolSpan = tracer.startSpan('agent.tool_call', {
            attributes: {
              'tool.name': toolCall.name,
              'tool.arguments': JSON.stringify(toolCall.arguments),
            }
          });
          const result = await executeTool(toolCall);
          toolSpan.setAttribute('tool.result_size', JSON.stringify(result).length);
          toolSpan.end();
        }
      } else {
        rootSpan.setAttribute('agent.iterations', iteration + 1);
        rootSpan.setAttribute('agent.output_length', response.content.length);
        break;
      }
      iteration++;
    }
  });
}
```

### 2. Cost Metrics (The Money Trail)

LLM calls are not free. Every token costs money, and an agent that loops 15 times on a complex task can burn through dollars in seconds. You need real-time cost tracking:

- **Token consumption per request**: Input tokens, output tokens, total
- **Cost per agent run**: Calculated from token counts and model pricing
- **Cost per user/tenant**: Aggregated for billing and abuse detection
- **Cost trends**: Are agents getting more expensive over time? Why?

Set up metrics that track this:

```typescript
const tokenCounter = meter.createCounter('agent.tokens.total', {
  description: 'Total tokens consumed by agent',
});

const costHistogram = meter.createHistogram('agent.cost.usd', {
  description: 'Cost per agent run in USD',
});

// After each LLM call:
tokenCounter.add(response.usage.totalTokens, {
  'model': 'gpt-4',
  'direction': 'input',
});

// After agent run completes:
const costUsd = calculateCost(totalInputTokens, totalOutputTokens, model);
costHistogram.record(costUsd, { 'agent.type': 'customer-support' });
```

Alert when a single agent run exceeds a cost threshold. Alert when daily spend trends upward unexpectedly. These are the alerts that save you from a $50K surprise on your next invoice.

### 3. Quality Signals (The Correctness Check)

Latency and cost mean nothing if the agent is producing garbage. Quality monitoring is the hardest part, but it is also the most important:

- **Tool call success rate**: How often do tool calls succeed vs fail?
- **Iteration count distribution**: Agents that consistently need 10+ iterations might have prompt issues
- **Fallback rate**: How often does the agent give up and return a generic response?
- **User feedback signals**: Thumbs up/down, regeneration requests, conversation abandonment

```typescript
const iterationHistogram = meter.createHistogram('agent.iterations', {
  description: 'Number of iterations per agent run',
});

const toolFailureCounter = meter.createCounter('agent.tool.failures', {
  description: 'Tool call failures',
});

const qualityGauge = meter.createUpDownCounter('agent.quality.score', {
  description: 'Aggregated quality score',
});
```

### 4. Safety Guardrails (The Circuit Breaker)

Agents can go off the rails. Without guardrails, a single bad prompt can trigger an infinite loop of expensive LLM calls. Implement:

- **Max iteration limits with alerts**: If an agent hits the iteration cap, something is wrong
- **Token budget per request**: Hard-kill the agent run if it exceeds a budget
- **Rate limiting per user**: Prevent abuse and runaway costs
- **Content filtering on outputs**: Catch hallucinated PII, incorrect data, or harmful content before it reaches users

These are not optional. They are the observability equivalent of seatbelts.

## Practical Architecture

Here is what a properly instrumented agent architecture looks like:

```
User Request
    │
    ▼
┌─────────────┐     ┌──────────────────┐
│ Agent Router │────▶│ OpenTelemetry    │
│             │     │ Collector         │
└──────┬──────┘     └────────┬─────────┘
       │                     │
       ▼                     ▼
┌─────────────┐     ┌──────────────────┐
│ Agent Loop  │     │ Observability    │
│ ┌─────────┐ │     │ Backend          │
│ │ LLM Call│ │     │ (OneUptime/etc)  │
│ └────┬────┘ │     │                  │
│      │      │     │ • Traces         │
│ ┌────▼────┐ │     │ • Metrics        │
│ │ Tool    │ │     │ • Logs           │
│ │ Call    │ │     │ • Alerts         │
│ └─────────┘ │     └──────────────────┘
└─────────────┘
```

The OpenTelemetry Collector sits between your agent and your observability backend. It processes, samples, and routes telemetry data. This is important because agent telemetry can be *verbose*. A single agent run might produce megabytes of trace data if you capture full prompts and responses. The Collector lets you:

- Sample expensive traces (keep all error traces, sample successful ones)
- Redact sensitive content from prompts before it hits storage
- Calculate derived metrics (cost, quality scores) from trace data
- Route different signals to different backends

## What to Alert On

Not everything deserves an alert. Here are the ones that matter:

| Alert | Threshold | Why |
|-------|-----------|-----|
| Agent cost per run | > $2.00 | Runaway loops or prompt regression |
| Iteration count | > 10 | Agent stuck in a loop |
| Tool failure rate | > 20% | External dependency degraded |
| P95 agent latency | > 30s | User experience degradation |
| Daily token spend | > 150% of baseline | Cost anomaly |
| Empty response rate | > 5% | Model or prompt failure |

## The OpenTelemetry Advantage

If you are already using OpenTelemetry for your application observability, extending it to AI agents is straightforward. You are not adopting a new vendor-specific SDK. You are adding semantic conventions to traces you are already collecting.

The OpenTelemetry community is actively working on [semantic conventions for LLM observability](https://opentelemetry.io/docs/specs/semconv/gen-ai/). These standardize attribute names like `gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.input_tokens`, and `gen_ai.usage.output_tokens`. Adopt these conventions now, and your telemetry will be portable across any backend.

## Start Simple

You do not need to instrument everything on day one. Start with:

1. **Wrap your LLM client** with OpenTelemetry spans that capture model, token counts, and latency
2. **Add a cost metric** that calculates spend per request
3. **Set iteration limits** and alert when they are hit
4. **Track tool call success rates** to catch integration failures

This takes an afternoon to implement and immediately gives you visibility you did not have before. From there, you can add quality scoring, prompt versioning, and advanced sampling as your agent architecture matures.

## The Bottom Line

AI agents are not magic. They are software. And like all software in production, they need observability. The teams that instrument their agents properly will ship faster, spend less, and catch problems before users do. The teams that do not will be debugging $10K LLM bills at 3 AM with zero visibility into what went wrong.

The tooling exists. OpenTelemetry gives you the instrumentation layer. Platforms like OneUptime give you the traces, metrics, and alerts in one place, with the added benefit of being open source and self-hostable, so your agent telemetry stays on your infrastructure.

The question is not whether to monitor your AI agents. It is how quickly you can start.
