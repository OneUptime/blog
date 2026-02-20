# Observability for AI Agents: Why Your LLM Apps Are Flying Blind

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, AI, OpenTelemetry, Monitoring

Description: Most teams shipping AI agents have zero visibility into what's actually happening. Here's why that's terrifying and how to fix it.

Everyone's shipping AI agents right now. Coding assistants, customer support bots, autonomous workflows that chain together dozens of LLM calls. It's the biggest shift in how software gets built since containers.

But here's the thing nobody wants to talk about: **most of these agents are completely unobservable.**

No traces. No metrics on token usage. No way to tell why your agent decided to call that API five times in a loop before giving up. No alerting when latency spikes from 2 seconds to 45 seconds because your context window is stuffed.

You're flying blind. And it's going to bite you.

## The Agent Observability Gap

Traditional monitoring was built for request-response. A user hits an endpoint, you get a trace, it either works or it doesn't. Simple.

AI agents break this model completely:

- **Non-deterministic execution paths.** The same input can produce wildly different chains of tool calls, retries, and reasoning steps. You can't just monitor a fixed set of endpoints.
- **Hidden cost accumulation.** A single user query might trigger 15 LLM calls across different models. Each one costs money. Without per-request cost tracking, your bill is a black box until month-end.
- **Cascading failures that look like success.** An agent can return a confident-sounding wrong answer after silently failing to retrieve the right context. Your HTTP status code says 200. Your user says the answer is garbage.
- **Latency variance measured in orders of magnitude.** The same query might take 800ms or 30 seconds depending on the reasoning path. Traditional p99 alerting doesn't capture this.
- **Token budget blowouts.** One runaway agent loop can burn through your monthly token budget in hours. Ask any team that's shipped an agent to production — they all have a horror story.

## What You Actually Need to Monitor

If you're running AI agents in production (or planning to), here's the minimum viable observability stack:

### 1. Distributed Traces That Capture the Full Agent Loop

Every LLM call, tool invocation, retrieval step, and retry needs to be a span in a trace. Not just the outer request — the full decision tree.

OpenTelemetry makes this possible. Instrument your agent framework (LangChain, CrewAI, AutoGen, or your custom setup) to emit spans for each step. The trace should tell you:

- Which model was called and with what parameters
- What was in the prompt (or at least a hash of it)
- Token counts: input, output, total
- Latency per step
- Whether the step was a retry or first attempt

```python
from opentelemetry import trace

tracer = trace.get_tracer("ai-agent")

with tracer.start_as_current_span("agent.plan") as span:
    span.set_attribute("llm.model", "gpt-4")
    span.set_attribute("llm.tokens.input", input_tokens)
    span.set_attribute("llm.tokens.output", output_tokens)
    span.set_attribute("llm.tokens.cost_usd", calculated_cost)
    
    # Your agent planning logic here
    plan = agent.plan(user_query)
```

### 2. Cost Metrics Per Request, Per User, Per Team

Token costs are the new compute costs. You need to track them with the same rigor:

- **Per-request cost** — so you can identify expensive queries
- **Per-user cost** — so you can spot abuse or inefficiency
- **Per-model cost** — so you can make informed decisions about model routing
- **Cost rate** — so you can alert before your budget evaporates

Build a dashboard that shows real-time token spend. Set alerts for anomalous spend rates. This isn't optional — it's survival.

### 3. Quality Signals (Not Just Availability)

A 200 response code means nothing for an AI agent. You need quality metrics:

- **Retrieval relevance scores** — Is the RAG pipeline actually finding good context?
- **Tool call success rates** — Are the agent's tool calls working?
- **User feedback signals** — Thumbs up/down, corrections, conversation abandonment
- **Hallucination detection** — Automated checks against ground truth where possible
- **Loop detection** — Is the agent stuck in a retry loop?

### 4. Alerting That Understands Agent Behavior

Standard alerting rules don't work for agents. You need:

- **Cost rate alerts** — "This agent is burning $50/hour, normally it's $3/hour"
- **Loop detection alerts** — "This agent has made 20+ LLM calls for a single query"
- **Latency distribution alerts** — Not just p99, but alerts when the variance itself increases
- **Quality degradation alerts** — "Retrieval relevance scores dropped 40% in the last hour"

## The OpenTelemetry Path

The good news: OpenTelemetry has emerging support for LLM observability. The [Semantic Conventions for GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/) are being actively developed, covering:

- `gen_ai.system` — The AI system (openai, anthropic, etc.)
- `gen_ai.request.model` — The model used
- `gen_ai.usage.input_tokens` / `gen_ai.usage.output_tokens` — Token counts
- `gen_ai.response.finish_reasons` — Why the generation stopped

This means you can instrument once with OTel and send your telemetry to any backend that supports it — no vendor lock-in.

## Why This Matters for Your Architecture

Here's the real talk: if you're building AI agents without observability, you're building on sand.

Your agent will behave differently in production than in your notebook. It will find edge cases you never tested. It will chain together tool calls in ways you didn't anticipate. It will cost more than you budgeted.

The teams that win with AI agents will be the ones that can **see what's happening** — that can debug a bad response by pulling up the full trace, that can catch a cost anomaly before it becomes a finance fire drill, that can measure quality degradation before users notice.

Observability isn't the boring part of your AI stack. It's the part that determines whether you can actually run these things in production with confidence.

## Getting Started

You don't need to boil the ocean. Start here:

1. **Instrument your LLM calls with OpenTelemetry spans.** Even basic spans with model name, token counts, and latency will transform your visibility.

2. **Track cost per request.** Multiply token counts by your per-token rate. Store it as a span attribute. Aggregate it.

3. **Set up loop detection.** Alert if any single request triggers more than N LLM calls. Pick a conservative N to start.

4. **Build one dashboard.** Requests per minute, cost per minute, p50/p95/p99 latency, and error rate. That's your starting point.

5. **Send traces to a backend that can handle the volume.** AI agent traces are verbose — lots of spans, lots of attributes. Make sure your observability platform can ingest and query this efficiently without bankrupting you on *observability costs for your AI that was supposed to save you money.*

The irony of paying Datadog $50K/year to monitor your AI agents that were supposed to reduce costs is not lost on anyone. Consider open-source alternatives that let you scale observability without scaling your vendor bill linearly.

---

The AI agent wave is real. The companies that instrument properly from day one will iterate faster, spend less, and ship more reliable products. The ones that don't will be debugging production issues by reading LLM output logs and praying.

Don't be the second group.
