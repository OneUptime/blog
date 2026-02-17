# The Real Cost of Datadog: A Breakdown for Engineering Teams

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Comparison

Description: A detailed breakdown of what Datadog actually costs when you add up infrastructure monitoring, APM, logs, synthetics, incident management, and the hidden extras.

Datadog is a good product. Let's get that out of the way. The agents work, the dashboards are polished, and the integrations are extensive. But "good product" and "good deal" are different conversations.

If you're evaluating monitoring tools — or trying to understand why your Datadog bill keeps climbing — this post breaks down the real numbers.

## The Pricing Structure

Datadog prices each capability separately. Here's what the core products cost as of early 2026:

| Product | Price | Unit |
|---------|-------|------|
| Infrastructure Monitoring | $15–$23/mo | per host |
| APM | $31–$40/mo | per host |
| Log Management (ingest) | $0.10/GB | per GB ingested |
| Log Management (index) | $1.70/mo | per million events |
| Synthetic Monitoring | $5–$12/mo | per test |
| Real User Monitoring | $1.50/mo | per 1,000 sessions |
| Incident Management | $20/mo | per user |
| Error Tracking | $0.75 | per 1,000 events |
| Database Monitoring | $70/mo | per normalized host |

These are list prices. Enterprise contracts vary, but the structure stays the same: every capability is a separate line item.

## A Realistic Scenario

Let's model a mid-size engineering team. Nothing exotic — just a company running microservices in production with the monitoring you'd expect:

**Team:** 20 engineers, 50 hosts, 5 services, moderate traffic

| Line Item | Calculation | Monthly Cost |
|-----------|-------------|-------------|
| Infrastructure (Pro) | 50 hosts × $15 | $750 |
| APM (Pro) | 50 hosts × $31 | $1,550 |
| Log Management | 100 GB/day × $0.10 × 30 days | $300 |
| Log Indexing | ~50M events × $1.70/M | $85 |
| Synthetics | 20 tests × $7.20 | $144 |
| RUM | 100K sessions × $1.50/1K | $150 |
| Incident Management | 10 users × $20 | $200 |
| Error Tracking | 500K events × $0.75/1K | $375 |

**Monthly total: ~$3,554**
**Annual total: ~$42,648**

And this is the *conservative* estimate. No custom metrics surcharges, no log retention beyond 15 days, no on-demand pricing spikes.

## Where the Bill Grows

The numbers above assume steady-state. Reality is messier.

### Custom Metrics

Datadog charges $0.05 per custom metric per month after the first 100 per host. That sounds cheap until your team instruments a few services. A single well-instrumented microservice can emit 500+ custom metrics. With 5 services across 50 hosts, you're looking at thousands of custom metrics — and an extra $500-2,000/month that nobody budgeted for.

### Log Volume Spikes

A bad deploy that starts throwing errors can 10x your log volume in an hour. At $0.10/GB, a spike from 100 GB/day to 1 TB/day for even a few hours adds hundreds to your bill. The irony: you're paying more precisely when things go wrong.

### Container and Serverless Pricing

Running Kubernetes? The per-host pricing gets complicated fast. Datadog charges per underlying host, but also has separate container-level pricing for some features. Serverless functions are billed per million invocations per month. If you're running a mix of VMs, containers, and Lambda, your bill becomes genuinely hard to predict.

### Retention Costs

The default log retention is 15 days. Need 30 days? That's extra. 90 days for compliance? Significantly extra. Many teams don't realize this until they need historical data for an incident postmortem and discover they either don't have it or need to pay to rehydrate archived logs.

## The Multi-Product Tax

Here's the less obvious cost: **each Datadog product is priced assuming you'll buy several.** The individual prices look reasonable. But the total for a full observability stack — infrastructure + APM + logs + synthetics + RUM + incidents + error tracking — adds up fast.

A team that just needs "monitoring" ends up paying for 5-8 separate products to get there. Each with its own pricing model, its own billing unit, and its own overages.

This is by design. Datadog's business model depends on expanding the number of products per customer. Their own earnings calls cite "multi-product adoption" as a key growth metric. Good for Datadog's revenue. Less great for your budget.

## What This Means for Mid-Market Teams

If you're a 500-person company with a dedicated platform team, Datadog is probably fine. You can negotiate enterprise pricing, you have people to manage the bill, and the cost is a rounding error on your cloud spend.

But if you're a 20-100 person engineering team? The math gets painful. $40-80K/year for monitoring is a significant line item — especially when you're also paying for AWS/GCP, CI/CD, and every other SaaS tool.

This is the gap that open-source observability platforms fill. Not because they're "free" (self-hosting has costs), but because they consolidate the stack. One platform for monitoring, logs, traces, status pages, incidents, and on-call means one bill, one pricing model, and no multi-product tax.

## The Bottom Line

Datadog is good software with expensive pricing. That's not a criticism — it's a business model. But if your monitoring bill is growing faster than your revenue, it's worth understanding exactly what you're paying for and whether the per-product pricing structure still makes sense for your team.

The observability market has changed. Self-hosted options have gotten dramatically better. Cloud alternatives with simpler pricing exist. The question isn't whether Datadog works — it's whether it's the right trade-off for your stage and budget.

Do the math. Then decide.
