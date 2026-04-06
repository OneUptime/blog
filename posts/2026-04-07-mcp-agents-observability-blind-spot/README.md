# Your MCP Agents Are Running Blind: The Observability Gap Nobody Is Talking About

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, AI, MCP, DevOps, Open Source

Description: MCP adoption is exploding but most teams have zero visibility into what their agents do in production. Here is why that is terrifying.

There are over 2,300 MCP servers in public directories right now. Claude, Cursor, Windsurf, VS Code, and 200+ tools support it natively. Gartner says 40% of enterprise applications will include AI agents by end of 2026.

And almost nobody can tell you what those agents are doing in production.

## The Protocol Everyone Adopted Before Building Observability For It

The Model Context Protocol went from Anthropic side project to Linux Foundation standard in about 14 months. That is absurdly fast by any measure. OpenAI, Google, Microsoft, AWS, Cloudflare, and Bloomberg all backed it. SDK downloads passed 97 million per month.

The adoption curve makes sense. MCP solves a real problem - standardizing how AI agents discover and invoke tools. Before MCP, every agent framework had its own way of calling external services. Now there is one protocol. Great.

But here is the thing nobody wants to say out loud: **we built the highway before building guardrails.**

Your traditional APM tool sees an MCP tool call and logs something like:

```text
POST /mcp/tools/invoke → 200 OK, 143ms
```

Cool. That tells you the request succeeded and was fast. It tells you absolutely nothing about whether the agent:

- Leaked customer data in its response
- Hallucinated a tool parameter that corrupted downstream state
- Burned $0.47 on a single query that should have cost $0.03
- Followed an injected prompt that overrode its system instructions
- Made 12 redundant tool calls when 2 would have sufficed

Traditional observability was built for a world where code executes deterministically. MCP agents do not operate in that world.

## The Math That Should Scare You

Let me walk through what a typical MCP agent execution actually looks like from a telemetry perspective.

A single user request hits your agent. The agent:

1. Parses the request and plans (1 LLM call)
2. Discovers available tools via MCP (1 protocol call)
3. Invokes Tool A - say, a database lookup (1 tool call + 1 LLM call to interpret results)
4. Decides it needs more context, invokes Tool B (1 tool call + 1 LLM call)
5. Synthesizes results (1 LLM call)
6. Returns response to user

That is **4 LLM calls and 3 MCP protocol interactions** for one user request. Each LLM call has a token cost. Each tool call has latency, failure modes, and data flowing through it.

Now scale that to 10,000 requests per day. You are looking at 40,000 LLM calls and 30,000 tool invocations. Per day. For one agent.

Most teams running MCP agents in production today can tell you their total API spend at the end of the month. They cannot tell you which tool call chains are expensive, which are failing silently, or which are leaking data.

A team reported on Hashnode recently that they were running 40 million tokens per day through their agent fleet and got a $4,000/day Datadog bill - not because the agents were broken, but because traditional APM tools were never designed for the trace volume that multi-agent systems generate. The monitoring costs more than the agents themselves.

## What MCP Observability Actually Requires

Traditional monitoring gives you three things: metrics, logs, and traces. For MCP agents, you need at least seven:

### 1. Tool Call Chain Tracing

Not just "did the HTTP call succeed" but the full decision chain. Why did the agent call this tool? What did it do with the response? Did it call unnecessary tools?

### 2. Token-Level Cost Attribution

Which tool calls are burning tokens? Not total spend - per-execution, per-tool, per-user cost tracking. If one tool call is consuming 80% of your token budget, you need to see that in real time.

### 3. Semantic Output Validation

The agent returned a 200 OK. But was the response correct? Did it hallucinate? Did it follow its instructions? This is not something traditional APM can measure because it requires understanding the content, not just the status code.

### 4. Data Flow Mapping

What data went into each tool call? What came back? Did sensitive data leak across tool boundaries? With MCP Apps now returning interactive UI components, the data surface area just expanded significantly.

### 5. Prompt Injection Detection

Every MCP tool call is an attack vector. Data returned from Tool A becomes context for the next LLM call. If that data contains injected instructions, the agent will follow them. You need observability that flags when agent behavior deviates from expected patterns after a tool call.

### 6. Multi-Agent Coordination Visibility

MCP does not just connect one agent to tools. Agent-to-agent communication is part of the 2026 roadmap. When Agent A delegates to Agent B which calls three tools and returns results, your observability needs to trace that entire chain as a single logical operation.

### 7. Cost Anomaly Detection

Your agent suddenly starts making 10x more tool calls than usual. Is it stuck in a loop? Did a prompt change cause it to over-plan? You need alerting that understands agent behavior patterns, not just infrastructure thresholds.

## Why Your Current Stack Cannot Do This

Here is the honest assessment of what existing tools give you:

**Datadog, New Relic, Dynatrace** - Built for infrastructure and application monitoring. They can trace HTTP calls. They cannot trace decision chains. They have no concept of "was this LLM response correct?" And as we established, their per-event pricing makes agent-scale telemetry prohibitively expensive.

**LLM-specific tools (Langfuse, Arize, Helicone)** - Better at LLM-specific metrics like token usage and latency per model. But they are focused on the LLM layer, not the tool execution layer. They see the LLM calls but not what MCP tools are doing.

**Custom logging** - Sure, you can instrument everything yourself. But you are now maintaining a custom observability system on top of your actual product. That is a full-time engineering job.

The gap is between "is the infrastructure healthy?" and "is the agent doing the right thing?" Nobody bridges that gap well today.

## What The Industry Needs (And What You Can Do Right Now)

There is no silver bullet shipping next week. But there are practical steps:

### Self-Host Your Observability

The single biggest lever you have is removing per-event pricing from the equation. When your agents generate 10-50x more telemetry than traditional services, usage-based pricing at Datadog-scale rates will bankrupt you.

Open-source, self-hosted observability platforms let you ingest agent-scale telemetry at the cost of compute rather than per-GB vendor pricing. Your 40,000 daily LLM calls generate logs that you own, store, and query on your terms.

### Instrument MCP Tool Calls As First-Class Traces

Do not let your MCP tool calls disappear into generic HTTP traces. Wrap every tool invocation with structured metadata:

```json
{
  "trace_id": "abc-123",
  "agent_id": "support-agent-v2",
  "tool_name": "customer_lookup",
  "tool_input_hash": "sha256:...",
  "token_cost": 0.003,
  "decision_reason": "user asked about account status",
  "response_validated": true,
  "chain_position": 3,
  "chain_total": 5
}
```

This gives you the building blocks for real agent observability even with current tools.

### Build Cost Budgets Per Agent

Set a token budget per agent per request. If an agent exceeds its budget, it should stop and report rather than continue burning tokens. This is not just cost control - it is a safety mechanism. An agent in a tool call loop will blow through tokens until something stops it.

### Monitor Tool Call Patterns, Not Just Outcomes

Track which tools your agents call and in what order. Build baselines. When an agent suddenly starts calling tools it has never called before, or calling them in unusual sequences, that is either a prompt injection or a regression. Either way, you want to know immediately.

### Separate Your Agent Observability From Infrastructure Observability

Run your agent-specific telemetry through a different pipeline than your infrastructure metrics. The data shapes are different, the volumes are different, and the questions you are asking are different. Trying to force agent observability into your existing Prometheus/Grafana stack will not work well.

## The Opportunity

Here is the thing that makes this interesting rather than just scary: **MCP observability is greenfield.** 

The protocol is standardized. The adoption is there. But the observability tooling is not. Whoever solves this well - whether it is an existing platform adding MCP-native capabilities or a new tool built from scratch - is going to own a massive market.

The observability market is projected to hit $6.93 billion by 2031. MLOps spending is headed to $16.61 billion by 2030. The intersection of these two - observing what AI agents are doing - is where the growth is.

And if you are a team running MCP agents today, do not wait for the market to catch up. Start instrumenting now. The agents you cannot observe are the agents that will hurt you.

## What We Are Building

At OneUptime, we are watching this space closely. As an open-source observability platform, we are uniquely positioned for the agent era - not because we have all the answers today, but because of two structural advantages:

**No per-event pricing.** When your agents generate 50x more telemetry, your observability cost should not go up 50x. Self-hosted means your cost scales with compute, not data volume.

**Open source means extensible.** Need to add custom MCP trace attributes? Need a new dashboard for agent cost tracking? You can build it. You are not waiting on a vendor's roadmap.

We are actively working on first-class support for agent-aware tracing - including MCP tool call chains, token cost attribution, and semantic validation hooks. If you are running MCP agents in production and want to help shape what agent observability looks like, check out [our GitHub](https://github.com/OneUptime/oneuptime) or [deploy it on your infrastructure](https://oneuptime.com).

The agents are here. It is time we could actually see what they are doing.
