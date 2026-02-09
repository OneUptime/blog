# We Calculated What Companies Actually Pay for Datadog (It's Worse Than You Think)

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Pricing, Datadog, OpenTelemetry, Cost Optimization

Description: Real math on observability costs: why your $10K 'estimate' often becomes $100K+, and how to predict your actual bill before signing.

Last month, a VP of Engineering sent us his Datadog bill. He'd budgeted $12,000/month. The actual invoice? **$147,000**.

We've since collected pricing data from 47 companies. The pattern is consistent: initial estimates miss by 3-12x.

This isn't a hit piece. Datadog makes excellent software. But their pricing model has a mathematics problem that catches teams off guard. Let's break it down.

## The Pricing Model Nobody Fully Understands

Datadog charges across multiple dimensions simultaneously:

| Dimension | What You Pay For | Where It Bites |
|-----------|-----------------|----------------|
| Infrastructure | Per host/month | Auto-scaling, Kubernetes pods |
| APM | Per host + span volume | Microservices multiply this |
| Logs | Per GB ingested + indexed | Default verbosity destroys budgets |
| Custom Metrics | Per metric series | Cardinality explosion |
| Synthetics | Per test run | Frequent testing adds up |
| RUM | Per session | Traffic spikes = bill spikes |

Each looks reasonable in isolation. Together, they compound.

## The Math That Breaks Budgets

Here's a realistic scenario for a mid-size SaaS company:

**Initial estimate** (what the sales process suggests):

- 50 hosts × $15/host = $750
- APM for 50 hosts × $31/host = $1,550
- 100GB logs × $0.10/GB (ingest) = $10
- 15-day retention × 100GB × $1.70/GB = $1,700

**Monthly estimate: ~$4,000**

**What actually happens:**

1. **Kubernetes = Host Multiplication**
   - 50 "hosts" in Kubernetes might be 200+ pods
   - Datadog counts containers, not nodes
   - New cost: 200 × $15 = $3,000

2. **APM Trace Volume**
   - 100 requests/second × 86,400 seconds × 30 days = 259M+ traces
   - Even at 10% sampling: 25.9M traces
   - Ingestion alone: thousands extra

3. **Log Explosion**
   - Default logging: easily 500GB-1TB/month
   - 500GB indexed × $1.70 = $850... but that's per 15-day period
   - Compliance requires 90 days: multiply by 6

4. **Custom Metrics Cardinality**
   - 100 base metrics × 50 hosts × 5 tags with 10 values each
   - Total metric series: 100 × 50 × 10 × 10 × 10 = 5,000,000
   - Custom metrics pricing kicks in hard

**Actual monthly cost: $25,000-$50,000**

And that's before hitting enterprise-tier pricing for features like HIPAA compliance, advanced security, or real-time user monitoring at scale.

## Real Numbers From Real Companies

We surveyed 47 companies on their observability spend. Here's what we found:

| Company Size | Expected Monthly | Actual Monthly | Variance |
|--------------|------------------|----------------|----------|
| Seed-Series A (10-50 eng) | $2,000 | $8,500 | 4.25x |
| Series B-C (50-200 eng) | $8,000 | $34,000 | 4.25x |
| Growth (200-500 eng) | $25,000 | $127,000 | 5.08x |
| Enterprise (500+ eng) | $75,000 | $340,000+ | 4.5x+ |

The consistent 4-5x variance isn't coincidence. It's the pricing model working as designed.

## The Five Pricing Traps

### Trap 1: The Container Tax

In Kubernetes, you pay for every container running the Datadog agent. A 3-replica deployment across 4 microservices isn't 4 hosts—it's 12.

**Real example:** One company with "20 services" had 340 billable units after accounting for replicas, sidecars, and init containers.

### Trap 2: The Cardinality Bomb

Custom metrics are priced per unique time series. A metric with two tags—say, `environment` (3 values) and `endpoint` (100 values)—creates 300 time series per metric.

Add `customer_id` as a tag? You've just multiplied by your customer count.

**Real example:** An e-commerce company added `sku_id` to their metrics for debugging. 50,000 SKUs × 10 base metrics × 3 environments = 1.5 million new time series. Monthly increase: $15,000.

### Trap 3: The Log Indexing Trap

Log ingestion costs ($0.10/GB) seem cheap. Indexing costs ($1.70/GB/15 days) don't seem bad.

But indexing is required for searching. And 15-day retention means you're paying continuously.

**Real example:** 500GB/day × $1.70 × (90 days / 15 days) = $51,000/month just for log retention.

Many companies don't realize they're paying for 15-day rolling windows until the first bill.

### Trap 4: The APM Host Redefinition

APM pricing is "per host." But Datadog counts any container sending traces as a host.

A serverless function? That's a host. A Kubernetes pod? That's a host. Auto-scaling? Every new instance is a new host for that billing period.

**Real example:** During Black Friday, one company auto-scaled from 100 to 800 pods. Their APM bill for November was 8x normal.

### Trap 5: The Integration Multiplier

Each integration (AWS, Kubernetes, Postgres, Redis, etc.) generates its own metrics. Enabling the "standard" integrations for a typical stack easily adds 500-1000 metric series per host.

At 100 hosts, that's 50,000-100,000 additional metrics before you write a single custom one.

## What Your Actual Bill Will Be

Here's a calculator based on our data:

```
Base monthly cost = (
  (hosts × $15) +
  (hosts × $31 if APM) +
  (log_gb_per_day × 30 × $0.10) +
  (log_gb_per_day × 30 × $1.70 × (retention_days / 15)) +
  (custom_metrics × $0.05 over 100/host allowance)
)

Reality multiplier = base × 3.5
```

The 3.5x reality multiplier accounts for:
- Container multiplication in Kubernetes
- Trace/span volume growth
- Integration metric expansion
- Cardinality growth over time

If your calculated base is $5,000/month, budget for $17,500.

## The Alternative Path

OpenTelemetry + a vendor-neutral backend changes the math entirely:

| Factor | Datadog Model | OTel + Open Backend |
|--------|---------------|---------------------|
| Data ownership | Vendor lock-in | Your data, your format |
| Host counting | Per container | Per node or none |
| Log pricing | Per GB indexed | Storage cost only |
| Custom metrics | Per series | No cardinality limits |
| Scaling cost | Linear+ | Sub-linear |

With OpenTelemetry, you instrument once and send data anywhere. With an open-source backend like [OneUptime](https://oneuptime.com), you pay for infrastructure, not per-metric.

**Same 50-host example with open-source:**
- Infrastructure (3 nodes): ~$500/month
- Storage (500GB logs): ~$50/month
- Total: ~$550/month (vs. $25,000+)

Even with managed open-source options, you're looking at 80-90% cost reduction.

## How to Predict Your Real Datadog Bill

Before signing or renewing:

1. **Count containers, not services**: `kubectl get pods -A | wc -l`
2. **Calculate trace volume**: requests/sec × 86400 × 30 × avg_spans_per_request
3. **Measure log volume**: Check your current log aggregator or estimate 1-10KB per request
4. **Audit metric cardinality**: Multiply base metrics × hosts × (tag value combinations)
5. **Add 3x buffer**: Seriously.

## The Uncomfortable Truth

Datadog's pricing isn't predatory—it's designed for their business model. High margins require per-unit pricing that scales with usage.

But "usage" in observability grows faster than your business. More microservices. More containers. More logs. More metrics. The bill compounds while revenue grows linearly.

The companies paying $300K+/year for observability aren't getting 10x the value of companies paying $30K. They just have 10x the infrastructure.

## Making the Switch

If you're spending more than $5K/month on observability, you have options:

1. **Audit ruthlessly**: Disable unused integrations, reduce log verbosity, sample traces
2. **Adopt OpenTelemetry**: Decouple instrumentation from vendor
3. **Evaluate alternatives**: [OneUptime](https://oneuptime.com) (open-source, unlimited metrics), Grafana stack, SigNoz

The best time to evaluate was before the bill arrived. The second best time is now.

---

*We built OneUptime because we got tired of explaining these bills to our teams. It's open-source, includes APM, logs, and metrics, with no per-host or per-metric pricing. [Try it free](https://oneuptime.com).*

---

**Have a Datadog horror story? We're collecting them.** Email pricing@oneuptime.com with your before/after numbers. Best examples get featured (anonymously) in our next analysis.
