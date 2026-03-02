# The Observability Tax: How Monitoring Vendors Quietly Double Your Bill

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Open Source, DevOps, Comparison

Description: Most teams don't realize their monitoring costs compound faster than their infrastructure. Here's how vendor pricing scales against you.

Your monitoring bill from two years ago? It's probably doubled. Not because you're running twice the infrastructure, but because modern observability pricing is designed to grow faster than your actual usage.

This isn't a conspiracy theory. It's a business model.

## The Compounding Problem

Most observability vendors price on some combination of hosts, custom metrics, log volume, spans, and user seats. Sounds reasonable on paper. In practice, these dimensions compound against you in ways that are nearly invisible until your CFO starts asking questions.

Here's how it works:

**Metric explosion.** Every new service, every new Kubernetes pod, every new deployment generates metrics. A single microservice easily emits 200+ metrics. Add containers, sidecars, and auto-instrumentation, and a 20-service architecture can generate 50,000+ custom metrics without anyone writing a single custom metric intentionally.

At $0.05 per custom metric per month (a common price point), that's $2,500/month just for metrics you didn't ask for.

**Log volume creep.** Logs are the silent killer. Engineers add logging during debugging, rarely remove it, and log levels drift toward verbose over time. A typical engineering team's log volume grows 30-50% year-over-year without any conscious decision to log more. At $1.70/GB ingested (Datadog's list price for Log Management), a team ingesting 500GB/month is paying $10,200/month - and that number is going up, not down.

**Span multiplication.** Distributed tracing is priced per span. Every HTTP call, database query, and cache lookup is a span. As architectures get more distributed, span counts don't grow linearly - they grow geometrically. A single user request that touches 8 services might generate 40+ spans. Scale that to millions of requests, and you're looking at billions of spans per month.

**The seat tax.** Per-user pricing means your observability costs grow every time you hire an engineer. You're literally paying more for monitoring because your company is growing. That's backwards.

## The Real Math

Let's model a real scenario. A mid-market SaaS company with 50 engineers, 30 services running on Kubernetes:

| Cost Component | Year 1 | Year 2 | Year 3 |
|---|---|---|---|
| Infrastructure hosts (growing 20%/yr) | $3,600/mo | $4,320/mo | $5,184/mo |
| Custom metrics (growing 40%/yr) | $2,500/mo | $3,500/mo | $4,900/mo |
| Log ingestion (growing 35%/yr) | $5,100/mo | $6,885/mo | $9,295/mo |
| APM spans (growing 50%/yr) | $4,000/mo | $6,000/mo | $9,000/mo |
| User seats (growing 15%/yr) | $1,700/mo | $1,955/mo | $2,248/mo |
| **Total** | **$16,900/mo** | **$22,660/mo** | **$30,627/mo** |

That's an 81% increase over two years. Your infrastructure grew 44%. Your monitoring bill grew almost twice as fast.

And this is a conservative estimate. We've talked to companies where the gap is worse.

## Why This Keeps Happening

Three structural reasons:

**1. Pricing dimensions multiply, not add.** You're not paying for one thing. You're paying for hosts AND metrics AND logs AND spans AND seats. Each one grows independently. The total is multiplicative.

**2. Auto-instrumentation works against you.** The same agents that make setup easy also make cost growth automatic. More telemetry gets collected by default. Vendors pitch this as a feature. For your budget, it's a bug.

**3. Discounting hides the trajectory.** Enterprise deals often include heavy first-year discounts. Year one feels reasonable. Year two, the discount shrinks. Year three, you're at list price - on a much larger base. The sticker shock hits when it's too late to easily switch.

## What Actually Works

**Set metric and log budgets.** Treat observability cost like any other infrastructure budget. Set limits. Review monthly. Most teams have no idea how much telemetry they're generating until they look.

**Use sampling aggressively.** You don't need 100% of your traces. For most debugging and performance analysis, 10-20% sampling is plenty. That's an 80-90% reduction in span costs with minimal impact on usefulness.

**Kill dead metrics.** Run an audit quarterly. If a metric hasn't been viewed in a dashboard or used in an alert in 90 days, drop it. Most teams find 30-40% of their metrics are unused.

**Question per-host and per-seat pricing.** These models made sense when infrastructure was static and teams were small. In a world of auto-scaling containers and growing teams, per-host and per-seat pricing is a tax on success. Look for vendors that price on actual value delivered, not on how many things you're running.

**Consider open source.** This is not a pitch - it's math. Open source observability platforms let you run on your own infrastructure, control your own data, and eliminate per-unit pricing entirely. The trade-off is operational overhead. For teams above a certain size, that trade-off starts making a lot of sense.

The total cost of a self-hosted observability stack (infrastructure + engineering time) often comes in at 30-50% of the equivalent commercial SaaS bill, and it doesn't compound the same way because you control the variables.

## The Bigger Picture

The observability market is projected to hit $65 billion by 2028. That money is coming from engineering budgets. Every dollar spent on monitoring vendor markup is a dollar not spent on building product.

The best engineering organizations we've seen treat observability cost as a first-class engineering metric - right alongside uptime, latency, and deployment frequency. They review it monthly, they optimize it quarterly, and they're not afraid to switch vendors or self-host when the math stops working.

Your monitoring should scale with your infrastructure, not ahead of it. If it's growing faster than your actual systems, something is wrong - and it's probably not your architecture.

It's your vendor's pricing model.
