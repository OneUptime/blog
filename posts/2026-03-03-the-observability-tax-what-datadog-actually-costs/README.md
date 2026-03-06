# The Observability Tax: What Datadog Actually Costs Your Engineering Team

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Open Source, Comparison

Description: A detailed breakdown of what observability tools actually cost when you factor in per-host fees, custom metrics, log ingestion, and the hidden taxes nobody warns you about.

Every engineering leader has had the moment. You open the Datadog invoice and the number has doubled - again. You didn't add twice the infrastructure. You didn't hire twice the engineers. But somehow, the bill found a way.

This isn't a hit piece. Datadog is a good product. But "good product" and "good value" are different conversations, and the observability industry has gotten very good at making them feel like the same one.

Let's talk about what monitoring actually costs in 2026 - with real numbers.

## The Pricing Model Nobody Reads Until It's Too Late

Most observability vendors use a combination of:

- **Per-host fees** ($15-$23/host/month for infrastructure monitoring)
- **Per-GB log ingestion** ($0.10-$0.30/GB ingested)
- **Custom metrics** ($5-$8 per 100 custom metrics)
- **APM per-host** ($31-$40/host/month)
- **Synthetics** ($5-$12 per 10K test runs)
- **RUM sessions** ($1.50 per 1K sessions)
- **Indexed spans** ($1.70 per million)

Each of these looks reasonable in isolation. That's the trick.

## A Real-World Example: 50-Host SaaS Company

Let's model a typical mid-market SaaS company. 50 hosts, 3 environments, a few hundred microservices, and a team that actually wants to understand what's happening in production.

| Line Item | Quantity | Unit Cost | Monthly |
|-----------|----------|-----------|---------|
| Infrastructure monitoring | 50 hosts | $23/host | $1,150 |
| APM | 50 hosts | $40/host | $2,000 |
| Log Management (ingestion) | 500 GB/mo | $0.10/GB | $50 |
| Log Management (retention 15d) | 500 GB/mo | $2.50/GB | $1,250 |
| Custom metrics | 2,000 | $0.05 each | $100 |
| Synthetics (API) | 50K runs | $5/10K | $25 |
| RUM | 100K sessions | $1.50/1K | $150 |
| Indexed spans (APM) | 50M spans | $1.70/M | $85 |
| **Total** | | | **$4,810/mo** |

That's **$57,720/year** for a 50-host setup. And this is the conservative estimate - most teams I talk to are paying significantly more because they didn't realize how fast custom metrics and log volumes compound.

## The Hidden Multipliers

The sticker price is just the beginning.

### 1. The Cardinality Trap

Custom metrics seem cheap until you understand cardinality. A single metric with 10 tag values across 50 hosts isn't 1 metric - it's 500. Teams routinely discover they're emitting 10x more custom metrics than they thought. That $100/month line item quietly becomes $1,000.

### 2. Log Volume Grows Faster Than Infrastructure

Your infrastructure might grow 20% year-over-year. Your log volume grows 50-100%. More microservices, more structured logging, more debug output. The bill follows the logs, not the hosts.

### 3. The "We Need That Too" Effect

You start with infrastructure monitoring. Then someone needs APM. Then the on-call team needs synthetics. Then product wants RUM. Then security needs log analytics. Each module is a new line item, and the vendor has zero incentive to bundle generously.

### 4. Retention Costs

You're paying to ingest logs, and then paying again to keep them. Want to retain logs for 30 days instead of 15? That's a meaningful bump. 90 days for compliance? Now we're talking real money.

## What This Looks Like at Scale

Scale the same model to 200 hosts - not unusual for a Series B/C company:

| Scenario | Monthly | Annual |
|----------|---------|--------|
| 50 hosts (startup) | $4,810 | $57,720 |
| 200 hosts (growth) | $18,500 | $222,000 |
| 500 hosts (scale-up) | $45,000+ | $540,000+ |

At 500 hosts, you're spending over half a million dollars a year on observability. That's 3-4 senior engineers you could have hired instead.

## The Self-Hosted Alternative

Here's what the same 50-host company would pay with a self-hosted observability stack:

| Item | Cost |
|------|------|
| Observability platform (self-hosted, open source) | $0 |
| Infrastructure to run it (3-node cluster) | $300-600/mo |
| Engineering time for initial setup (one-time) | 2-3 days |
| Ongoing maintenance | ~2 hours/month |
| **Total** | **$300-600/mo** |

That's a **87-94% cost reduction** compared to $4,810/month.

"But self-hosted means more work!" - this was true in 2020. In 2026, with Helm charts, Docker Compose one-liners, and platforms designed for self-hosting, the setup story has fundamentally changed. Most teams get a full observability stack running in under an hour.

## What To Actually Evaluate

If you're re-evaluating your observability spend, here's what matters:

**1. Total cost at your actual scale.** Not the starter tier. Not the "contact sales" tier. Your actual hosts, logs, metrics, and retention needs.

**2. Pricing predictability.** Can you budget for next year, or does every new service deployed create a new billing surprise?

**3. Data ownership.** When your observability data lives on someone else's infrastructure, you're paying for access to your own operational data. That's a strange arrangement when you think about it.

**4. Vendor lock-in.** How hard is it to leave? If the answer is "very," that should factor into the real cost.

**5. Feature bundling.** Do you need to pay separately for monitoring, APM, logs, status pages, incident management, and on-call? Or can you get it in one platform?

## The Math Is Clear

The observability market has grown to $25+ billion by 2026. That money is coming from engineering budgets. Every dollar spent on monitoring is a dollar not spent on building product.

For some companies, paying a premium for a managed service makes sense. If you're a 5-person startup and your time is more valuable than money, pay for the convenience.

But if you're a 50-person engineering team paying $200K+/year for observability, it's worth asking: is this the best use of that budget?

The answer, increasingly, is no.

---

*OneUptime is an open-source observability platform that replaces Datadog, PagerDuty, and StatusPage in a single self-hosted deployment. [Check it out on GitHub](https://github.com/OneUptime/oneuptime).*
