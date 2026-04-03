# Monitoring AI Agents in Production: What Your Observability Stack Is Missing

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, AI, Monitoring, DevOps, SRE

Description: AI agents are hitting production faster than teams can monitor them. Here's a practical framework for observing agent behavior, catching failures, and keeping costs under control.

Your AI agents are running in production. Maybe it's a customer support bot, a code review agent, or an autonomous workflow that handles billing disputes. It works great in demos. Your CEO loves it.

But here's what nobody talks about at the demo: what happens when it breaks at 2 AM?

Traditional monitoring wasn't built for this. Your APM tracks request latency and error rates. Your logs capture HTTP status codes. Your dashboards show CPU and memory. None of that tells you when your AI agent starts hallucinating, gets stuck in a retry loop burning $200/hour in API calls, or confidently gives a customer completely wrong information.

This is the observability gap that's about to bite a lot of teams.

## Why Traditional Monitoring Fails for AI Agents

An AI agent isn't a web server. It doesn't follow predictable request-response patterns. Here's what makes agents fundamentally different:

**Non-deterministic behavior.** The same input produces different outputs. Your agent might take 3 steps to complete a task on Monday and 47 steps on Tuesday. Traditional threshold-based alerting breaks immediately.

**Multi-step execution chains.** An agent that researches a topic might call a search API, read 5 web pages, synthesize information, draft a response, self-critique, revise, and then deliver. Each step can fail independently, and a failure at step 6 might not surface until step 12.

**Cost is a first-class metric.** Every LLM call costs money. A stuck agent running in a loop isn't just a performance problem - it's a billing problem. I've seen teams discover $3,000 charges from a single agent that got stuck retrying a malformed prompt for 6 hours overnight.

**Quality degrades silently.** A web server either returns a 200 or a 500. An AI agent can return a 200 with completely wrong content. Traditional health checks won't catch this.

## The Five Pillars of Agent Observability

After watching teams struggle with this (and struggling with it ourselves), here's the framework that actually works:

### 1. Trace the Full Agent Execution Chain

Every agent run needs a trace that captures the complete decision chain. Not just "agent started" and "agent finished" - every intermediate step.

```text
Agent Run: resolve-billing-dispute-#4821
├── Step 1: Parse customer complaint (GPT-4o, 340 tokens, 1.2s)
├── Step 2: Query billing database (SQL, 45ms)
├── Step 3: Analyze charge history (GPT-4o, 1,200 tokens, 3.1s)
├── Step 4: Draft resolution (GPT-4o, 890 tokens, 2.8s)
├── Step 5: Self-review for policy compliance (GPT-4o, 650 tokens, 2.1s)
└── Step 6: Send response to customer (API call, 120ms)
Total: 6 steps, 3,080 tokens, 9.35s, $0.024
```

This trace tells you everything: where time is spent, where tokens are consumed, and exactly where a failure would cascade.

Use OpenTelemetry spans for this. Each agent step becomes a span with attributes for model used, token count, cost, and the semantic purpose of the step. Don't invent a custom format - OTel is the standard and your future self will thank you.

### 2. Monitor Cost in Real Time

This is the one most teams skip and most teams regret. You need:

- **Per-agent-run cost tracking.** Know exactly what each execution costs.
- **Cost rate alerting.** If an agent's cost per minute exceeds a threshold, kill it. A simple circuit breaker saves you from runaway API bills.
- **Budget caps.** Set daily and monthly limits per agent type. When the budget is exhausted, the agent degrades gracefully (queues work, falls back to cheaper models) instead of silently running up charges.

```python
# Simple cost circuit breaker
class AgentCostGuard:
    def __init__(self, max_cost_per_run=1.00, max_cost_per_minute=0.50):
        self.max_cost_per_run = max_cost_per_run
        self.max_cost_per_minute = max_cost_per_minute
        self.current_run_cost = 0
        self.start_time = time.time()

    def check(self, step_cost):
        self.current_run_cost += step_cost
        elapsed_minutes = (time.time() - self.start_time) / 60
        cost_per_minute = self.current_run_cost / max(elapsed_minutes, 0.01)

        if self.current_run_cost > self.max_cost_per_run:
            raise AgentBudgetExceeded(f"Run cost ${self.current_run_cost:.2f} exceeds limit")
        if cost_per_minute > self.max_cost_per_minute:
            raise AgentCostRateExceeded(f"Cost rate ${cost_per_minute:.2f}/min exceeds limit")
```

### 3. Track Output Quality (Not Just Uptime)

This is the hard one. Your agent can be "up" and returning 200s while producing garbage. You need quality signals:

**Structured output validation.** If your agent is supposed to return JSON with specific fields, validate the schema on every response. Track the validation failure rate.

**Confidence scoring.** Many LLM APIs return log probabilities. Low confidence on critical decisions should trigger a review queue, not silent deployment.

**Feedback loops.** Track what happens after the agent acts. Did the customer reply positively? Did the code review suggestion get accepted? Did the generated report get downloaded or ignored? These downstream signals are your best quality indicators, even if they're delayed.

**Drift detection.** Compare current output distributions against a baseline. If your customer support agent suddenly starts using a completely different tone or recommending refunds 3x more often, something changed - even if no code was deployed.

### 4. Alert on Behavioral Anomalies, Not Just Errors

Traditional alerting: "Error rate > 5% for 5 minutes → page someone."

Agent alerting needs to be smarter:

- **Step count anomalies.** Agent usually takes 3-5 steps but suddenly taking 20+? It's probably stuck in a loop.
- **Token consumption spikes.** A 10x increase in tokens per run usually means the agent is processing unexpected input or its prompt was corrupted.
- **Latency distribution shifts.** Don't alert on P99 latency - alert on latency *distribution changes*. An agent that's consistently slow is fine. An agent whose latency just became bimodal has a problem.
- **Tool call patterns.** If your agent usually calls the database once but starts calling it 50 times, that's a signal worth investigating - even if every call succeeds.

### 5. Build an Agent Dashboard That Actually Helps

Your agent dashboard should answer these questions at a glance:

1. **Are agents running?** Active runs, queue depth, throughput.
2. **Are they working correctly?** Success rate, quality scores, output validation pass rate.
3. **What are they costing?** Real-time cost, cost per successful outcome, cost trend.
4. **Where are they slow?** Step-level latency breakdown, model response times.
5. **What's changed?** Deployment markers, model version changes, prompt updates.

The mistake most teams make is building a dashboard that shows you *that* something is wrong without helping you understand *why*. Every metric on your dashboard should be drillable to a specific agent run trace.

## A Practical Monitoring Setup

Here's a concrete setup you can implement this week:

**Layer 1: Infrastructure** (stuff you probably already have)
- Container/pod health, CPU, memory
- Network connectivity to LLM APIs
- Queue depths for async agent workloads

**Layer 2: Agent Execution** (the new stuff)
- OpenTelemetry traces for every agent run
- Per-step timing, token count, cost, model version
- Error categorization: infra error vs. LLM error vs. output validation error

**Layer 3: Business Quality** (the stuff that actually matters)
- Task completion rate
- Customer satisfaction signals (if applicable)
- Cost per successful outcome
- Output quality scores

**Layer 4: Cost Control** (the stuff that saves your budget)
- Real-time spend tracking per agent type
- Budget alerts and circuit breakers
- Model cost comparison (are you using GPT-4o where GPT-4o-mini would suffice?)

## The Consolidation Argument

Here's where this gets interesting from a tooling perspective. Most teams are currently duct-taping this together with:

- Datadog or New Relic for infrastructure
- LangSmith or Langfuse for LLM tracing
- Custom Grafana dashboards for cost
- PagerDuty for alerting
- A spreadsheet (yes, really) for budget tracking

That's five tools for one problem. You're paying for all of them, context-switching between all of them, and none of them have a unified view of "is my agent healthy?"

The observability platforms that will win this next era are the ones that can show you infra health, agent traces, quality metrics, and cost - all in one place, with alerts that correlate across all four dimensions. If your current stack can't do that, you're going to feel the pain as you scale from 1 agent to 10 to 100.

Open-source platforms have a real advantage here. When you can self-host your observability stack, you control your data, your costs, and your ability to extend the platform with custom agent metrics. You're not paying per-host or per-GB to monitor the thing that's already costing you per-token.

## What to Do Monday Morning

Don't try to boil the ocean. Start here:

1. **Instrument one agent with OTel traces.** Pick your most critical agent. Add spans for each step. Include token counts and costs as span attributes.

2. **Set up a cost circuit breaker.** Even a crude one. Max cost per run, max cost per minute. You'll sleep better.

3. **Add one quality metric.** Just one. Output validation pass rate is the easiest starting point.

4. **Create a single dashboard** that shows runs, errors, cost, and latency for that one agent. Get the team used to looking at it.

5. **Set up two alerts:** stuck agent detection (step count > threshold) and cost rate anomaly.

You can do all five in a day. You should have done them before your agent hit production, but better late than broke.

## The Bottom Line

AI agents are the most exciting thing happening in software right now. They're also the most under-monitored. The teams that figure out agent observability early will scale confidently. The teams that don't will learn about their monitoring gaps from an AWS bill or an angry customer.

The frameworks and tools exist. The mental models just haven't caught up yet. Hopefully this helps close that gap.
