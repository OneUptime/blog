# Your Datadog Bill Is About to Get Worse: The Real Cost of Observability in 2026

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Open Source, Comparison

Description: Datadog bills are growing 30-50% year over year for most teams. Here's a breakdown of the hidden costs, why it happens, and what your options actually are.

Every quarter, the same scene plays out in engineering Slack channels across the world: someone shares the latest Datadog invoice, and the thread devolves into a mix of disbelief, gallows humor, and that one person who says "I told you so."

If your Datadog bill has doubled since you first signed up, you're not alone. And if you haven't looked at it lately - you probably should.

## The pricing model that prints money

Datadog's pricing looks straightforward until you actually use it. Infrastructure monitoring starts at $15/host/month. APM starts at $31/host/month, with APM Pro and Enterprise priced higher. Log management is $0.10/GB ingested *plus* $1.70/million log events for 15-day indexing. Custom metrics? $5 per 100 indexed custom metrics after the included per-host allotment.

None of those numbers sound scary in isolation. The problem is that modern infrastructure generates *a lot* of data, and Datadog charges for every dimension of it.

Here's what a typical mid-market company (50 engineers, ~200 hosts, microservices architecture) actually pays:

| Product | Unit Price | Realistic Usage | Monthly Cost |
|---------|-----------|----------------|-------------|
| Infrastructure (Pro) | $23/host | 200 hosts | $4,600 |
| APM (Enterprise) | $40/host | 200 hosts | $8,000 |
| Log Management | $0.10/GB + indexing | 500GB/day | $4,500+ |
| Custom Metrics | $5/100 metrics | 10,000 over allotment | $500 |
| Synthetics | $5/10k API tests or $12/1k browser tests | 50k API tests | $25 |
| RUM | $0.15/1k sessions (Measure) or $3/1k sessions (Investigate) | 500k sessions | $75-$1,500 |
| **Total** | | | **~$18,400/mo** |

That's **$220,000 per year** for a 50-person engineering team. And this is conservative - many teams report bills 2-3x higher once you factor in overages, committed-use penalties, and the products you added "just to try."

## Why bills spiral out of control

Three things drive Datadog bill shock:

### 1. Per-host pricing × container sprawl

Kubernetes doesn't care about your Datadog contract. The Agent typically runs once per node, every node counts as a host, and containers above the included per-host allotment can be billed separately. Auto-scaling means your bill auto-scales too. Teams running Kubernetes regularly report that their monitored footprint is 3-5x what they expected when they signed the contract.

### 2. Log volume is unpredictable

Logs are the worst offender. A single noisy service can dump terabytes in a day. Datadog charges on ingestion *and* indexing, and most teams don't set up exclusion filters until after the first surprise invoice. By then, you've already paid.

The kicker: Datadog's log archiving and rehydration means you pay to store logs, pay to archive them, and then pay *again* to look at them later.

### 3. Custom metrics multiply silently

Every new metric tag value combination, every new dimension, and some metric types can create more custom metrics. Datadog's pricing doc warns about "custom metric volumes" but most engineers don't think about billing when they're adding a Prometheus counter at 3am during an incident.

## The lock-in problem

Even when teams realize the bill is unsustainable, switching is painful. Datadog does this well - and credit where it's due, the product is good. But the switching costs are by design:

- **Dashboards and monitors** built over years don't export cleanly
- **Team knowledge** is embedded in Datadog's query language
- **Integrations** wired into CI/CD pipelines and runbooks
- **Alert fatigue tuning** that took months to get right

This is why most teams don't switch. They just complain and pay.

## What the market actually looks like in 2026

The observability landscape has shifted. You have real options now:

**Open-source, self-hosted stacks:**
- Grafana + Prometheus + Loki + Tempo - the LGTM stack is mature and battle-tested
- OpenTelemetry has become the standard for instrumentation, making vendor lock-in less sticky
- OneUptime - full observability platform (monitoring, APM, logs, status pages, incident management, on-call) that's open source and free to self-host

**Managed alternatives:**
- Grafana Cloud - generous free tier, usage-based pricing that's more predictable
- OneUptime Cloud - usage-based pricing by GB ingested, no per-host fees, no per-seat fees
- Signoz, Highlight, HyperDX - newer entrants with aggressive pricing

**The hybrid approach:**
Many teams are moving to a split model: keep Datadog for the one or two products it does best (APM traces, for example), and move everything else to cheaper alternatives. Logs are usually the first thing to migrate because they're the biggest line item and the easiest to redirect via OpenTelemetry.

## A practical migration path

If you're staring at a Datadog renewal and feeling sick, here's what actually works:

**Month 1: Audit and instrument**
- Export your Datadog usage data (Settings → Usage → Download)
- Identify your top 3 cost drivers
- Add OpenTelemetry instrumentation alongside Datadog agents (dual-write)

**Month 2: Migrate logs first**
- Redirect log pipelines to an alternative (self-hosted or managed)
- Keep Datadog log ingestion running in parallel for 2 weeks
- Validate that alerts and dashboards work on the new system

**Month 3: Evaluate and expand**
- Compare costs, query performance, and team satisfaction
- Migrate the next highest-cost product
- Negotiate your Datadog renewal from a position of strength

The goal isn't necessarily to eliminate Datadog entirely. It's to stop being hostage to a pricing model that punishes you for scaling.

## The real question

The observability market in 2026 isn't about which tool has the most features. It's about which approach gives you visibility into your systems without requiring a dedicated FinOps team to manage the bill.

If you're spending more on monitoring your infrastructure than on the infrastructure itself - something has gone wrong.

Open source alternatives have caught up. OpenTelemetry makes switching possible. The only thing keeping most teams on overpriced observability platforms is inertia.

Maybe it's time to do something about that.
