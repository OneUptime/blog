# How to Monitor AI Agents in Production with OpenTelemetry

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: AI Agents, OpenTelemetry, Observability, Monitoring, LLM, Production, Tracing, Open Source

Description: A practical guide to instrumenting AI agents with OpenTelemetry -- covering traces, token tracking, tool calls, and the observability patterns that actually matter in production.

AI agents are shipping to production faster than teams can figure out how to monitor them. The agent calls an LLM, the LLM decides to call a tool, the tool hits an API, the API calls another LLM -- and somewhere in that chain, something goes wrong. Good luck finding it with traditional monitoring.

The problem is not that we lack observability tools. It is that most observability tools were built for request-response HTTP services, not for autonomous systems that make unpredictable decisions at runtime.

This guide covers how to instrument AI agents with OpenTelemetry so you can actually understand what they are doing in production -- without building a custom observability stack from scratch.

## Why Standard APM Falls Short for AI Agents

Traditional APM tracks HTTP requests flowing through services. An agent is different:

- **Non-deterministic execution paths.** The same input can produce completely different chains of tool calls depending on what the LLM decides. You cannot predict the trace shape in advance.
- **Token costs are invisible.** A slow API call costs you latency. An LLM call that uses 50,000 tokens because the agent put the entire database schema in context costs you real money -- and standard APM will not surface that.
- **Tool call chains create deep, branching traces.** An agent might call a search tool, parse results, call a code execution tool, fail, retry with different parameters, then call a different tool entirely. Traditional span hierarchies get messy fast.
- **Latency distribution is wild.** An LLM call can take 200ms or 30 seconds depending on output length, model load, and whether the provider is having a bad day. Percentile-based alerting needs different thresholds.

## The OpenTelemetry Approach

OpenTelemetry (OTel) is the right foundation because it gives you structured traces, metrics, and logs through a single instrumentation layer -- and it is vendor-neutral. You can send your telemetry to any backend that supports OTLP.

Here is the mental model for instrumenting an agent:

```text
Agent Run (root span)
  |-- LLM Call (child span)
  |     |-- attributes: model, tokens_in, tokens_out, temperature
  |-- Tool Call: search_database (child span)
  |     |-- attributes: tool_name, parameters, result_summary
  |-- LLM Call (child span)
  |     |-- attributes: model, tokens_in, tokens_out
  |-- Tool Call: send_email (child span)
  |     |-- attributes: tool_name, parameters, success
  |-- Final Response (child span)
```

Each step in the agent's reasoning becomes a span. The full agent run is the root span. LLM calls and tool calls are child spans with rich attributes.

## Setting Up the Instrumentation

### Step 1: Install the OpenTelemetry SDK

For Python (the most common language for AI agents):

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp
```

For TypeScript/Node.js:

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```

### Step 2: Initialize the Tracer

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "my-ai-agent",
    "service.version": "1.0.0",
    "deployment.environment": "production"
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="https://your-otlp-endpoint/v1/traces")
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("ai-agent")
```

### Step 3: Instrument the Agent Run

Wrap the entire agent execution in a root span:

```python
def run_agent(user_input: str) -> str:
    with tracer.start_as_current_span("agent.run") as span:
        span.set_attribute("agent.input", user_input[:500])  # Truncate for safety
        span.set_attribute("agent.model", "gpt-4")

        result = agent_loop(user_input)

        span.set_attribute("agent.output_length", len(result))
        span.set_attribute("agent.success", True)
        return result
```

### Step 4: Instrument LLM Calls

This is where most of the value lives. Every LLM call should capture:

```python
def call_llm(messages: list, model: str = "gpt-4") -> str:
    with tracer.start_as_current_span("llm.call") as span:
        span.set_attribute("llm.model", model)
        span.set_attribute("llm.message_count", len(messages))

        # Estimate input tokens (or use tiktoken for accuracy)
        input_text = " ".join(m["content"] for m in messages)
        span.set_attribute("llm.input_chars", len(input_text))

        start = time.time()
        response = openai.chat.completions.create(
            model=model,
            messages=messages
        )
        duration = time.time() - start

        # Token usage from the API response
        usage = response.usage
        span.set_attribute("llm.tokens_input", usage.prompt_tokens)
        span.set_attribute("llm.tokens_output", usage.completion_tokens)
        span.set_attribute("llm.tokens_total", usage.total_tokens)
        span.set_attribute("llm.duration_seconds", duration)

        # Cost estimation (update rates as pricing changes)
        cost = estimate_cost(model, usage.prompt_tokens, usage.completion_tokens)
        span.set_attribute("llm.estimated_cost_usd", cost)

        # Track if the model chose to call a tool
        if response.choices[0].message.tool_calls:
            span.set_attribute("llm.tool_calls_requested",
                len(response.choices[0].message.tool_calls))

        return response.choices[0].message
```

### Step 5: Instrument Tool Calls

```python
def execute_tool(tool_name: str, parameters: dict) -> str:
    with tracer.start_as_current_span(f"tool.{tool_name}") as span:
        span.set_attribute("tool.name", tool_name)
        span.set_attribute("tool.parameters", json.dumps(parameters)[:1000])

        try:
            result = tool_registry[tool_name](**parameters)
            span.set_attribute("tool.success", True)
            span.set_attribute("tool.result_length", len(str(result)))
            return result
        except Exception as e:
            span.set_attribute("tool.success", False)
            span.set_attribute("tool.error", str(e)[:500])
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            raise
```

## The Six Metrics That Actually Matter

Once you have traces flowing, here is what to track:

### 1. Token Usage per Agent Run

This is your cost metric. Track it as a histogram:

```python
from opentelemetry import metrics

meter = metrics.get_meter("ai-agent")
token_counter = meter.create_counter(
    "agent.tokens.total",
    description="Total tokens consumed per agent run"
)
cost_counter = meter.create_counter(
    "agent.cost.usd",
    description="Estimated cost in USD per agent run"
)

# In your agent run:
token_counter.add(total_tokens, {"model": model_name, "agent": agent_name})
cost_counter.add(estimated_cost, {"model": model_name, "agent": agent_name})
```

### 2. Tool Call Success Rate

If your agent's tools start failing, the agent will either retry (burning tokens) or give bad answers. Track tool reliability:

```python
tool_calls = meter.create_counter("agent.tool.calls")
tool_failures = meter.create_counter("agent.tool.failures")

# Alert when: tool_failures / tool_calls > 0.05 for any tool
```

### 3. LLM Latency Distribution

Track p50, p95, and p99 per model. LLM latency varies wildly:

```python
llm_duration = meter.create_histogram(
    "agent.llm.duration",
    unit="s",
    description="LLM call duration in seconds"
)
```

### 4. Agent Loop Iterations

How many LLM calls does the agent make before completing? A sudden increase means the agent is struggling:

```python
loop_iterations = meter.create_histogram(
    "agent.loop.iterations",
    description="Number of LLM calls per agent run"
)

# Alert when: avg iterations > 2x your baseline
```

### 5. Context Window Utilization

Track how full the context window gets. When agents approach the limit, they start losing information:

```python
context_utilization = meter.create_histogram(
    "agent.context.utilization",
    description="Percentage of context window used"
)

# In your LLM call wrapper:
max_tokens = MODEL_CONTEXT_LIMITS[model]
utilization = usage.prompt_tokens / max_tokens
context_utilization.record(utilization, {"model": model})

# Alert when: p95 utilization > 0.8
```

### 6. End-to-End Agent Latency

The total time from user input to final response. This is what users feel:

```python
agent_duration = meter.create_histogram(
    "agent.run.duration",
    unit="s",
    description="Total agent run duration"
)
```

## Structured Logging for Agent Decisions

Traces show you the shape of execution. Logs show you why the agent made specific decisions:

```python
import logging
from opentelemetry.sdk._logs import LoggerProvider
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter

# Emit structured log events at decision points
logger = logging.getLogger("ai-agent")

def log_agent_decision(decision_type: str, details: dict):
    logger.info(
        f"Agent decision: {decision_type}",
        extra={
            "decision.type": decision_type,
            "decision.tool_chosen": details.get("tool"),
            "decision.reasoning_length": details.get("reasoning_length"),
            "decision.alternatives_considered": details.get("alternatives", []),
        }
    )
```

Key moments to log:

- **Tool selection**: Which tool did the agent pick and what were the alternatives?
- **Retry decisions**: Why did the agent retry? What changed?
- **Context truncation**: When the agent drops messages from context, log what was dropped.
- **Guardrail triggers**: When safety filters or output validators fire.

## Connecting Traces to Your Observability Backend

The traces, metrics, and logs from your agent need to go somewhere useful. Any OTLP-compatible backend works. Here is the OTel Collector configuration:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: "0.0.0.0:4318"
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: "https://your-observability-platform/v1"
    headers:
      Authorization: "Bearer ${OTLP_AUTH_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

The advantage of using OTel and OTLP: you are not locked into any vendor. You can send the same telemetry to multiple backends, switch providers without re-instrumenting, and use the same SDK across all your services -- AI agents and traditional microservices alike.

## Common Pitfalls

**Do not log full prompts and responses in production.** They contain user data. Log lengths, token counts, and truncated summaries instead. If you need full content for debugging, use sampling and make sure the data goes somewhere with appropriate access controls.

**Do not set static latency thresholds.** LLM latency depends on output length. A 10-second response generating 2,000 tokens is fine. A 10-second response generating 50 tokens means something is wrong. Normalize by tokens per second instead.

**Do not ignore retries.** If your agent retries an LLM call due to a rate limit or timeout, that retry should be a separate span with its own attributes. Silent retries are the number one cause of mysterious cost spikes.

**Do not forget to track model versions.** When your provider rolls out a new model version, you want to see if behavior changed. Include the full model identifier (including any version suffix) in your span attributes.

## What Good Looks Like

When your agent observability is working, you should be able to answer these questions in under 60 seconds:

1. How much did this agent cost to run yesterday?
2. Which tool is failing most often, and why?
3. What is the p95 latency for agent runs this week vs. last week?
4. Are any agents hitting context window limits?
5. When an agent gives a bad answer, what was the chain of decisions that led there?

If you cannot answer those questions, you are flying blind with an autonomous system in production. That is not a theoretical risk -- it is how teams discover their AI agent has been burning through API credits or giving hallucinated answers for days before anyone notices.

## Start Simple, Add Complexity Later

You do not need all of this on day one. Start with:

1. **Root span per agent run** with total tokens and duration
2. **Child spans for each LLM call** with token counts
3. **Child spans for each tool call** with success/failure

That alone gives you cost visibility, latency tracking, and error attribution. Add the detailed metrics, structured logging, and context window tracking as your agents get more complex and the stakes get higher.

The agents are already in production. The question is whether you can see what they are doing.
