# We Calculated What Companies Actually Pay for Datadog

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
| Infrastructure | Per host/month | Auto-scaling, Kubernetes nodes |
| APM | Per host + span volume | Microservices multiply this |
| Logs | Per GB ingested + per indexed event | Default verbosity destroys budgets |
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
- 1B indexed log events × $1.70/1M events (15-day retention) = $1,700

**Monthly estimate: ~$4,000**

**What actually happens:**

1. **Kubernetes = Host Multiplication**
   - 50 Kubernetes nodes might run 500+ monitored containers
   - Datadog counts Kubernetes nodes as infrastructure hosts, then separately bills monitored containers above the included allowance
   - New cost: 50 × $15 plus container overages

2. **APM Trace Volume**
   - 100 requests/second × 86,400 seconds × 30 days = 259M+ requests
   - At 10 spans/request, that's 2.59B spans before sampling
   - Extra indexed spans and ingested span volume can add hundreds or thousands depending on retention filters and span size

3. **Log Explosion**
   - Default logging: easily 500GB-1TB/month
   - If 500GB/day corresponds to 500M indexed events/day, that's 15B indexed events/month
   - At 15-day retention, 15B × $1.70/1M = $25,500/month for indexing, before ingestion
   - Longer retention raises the indexed-event price or moves you into custom/Flex retention terms

4. **Custom Metrics Cardinality**
   - 100 base metrics × 50 hosts × 3 high-cardinality tags with 10 values each
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

In Kubernetes, Datadog infrastructure hosts are nodes, but container monitoring includes only a plan-specific container allowance per host. A 3-replica deployment across 4 microservices isn't 4 monitored containers-it's 12, before sidecars.

**Real example:** One company with "20 services" had 340 monitored containers after accounting for replicas and sidecars.

### Trap 2: The Cardinality Bomb

Custom metrics are priced per unique time series. A metric with two tags-say, `environment` (3 values) and `endpoint` (100 values)-creates 300 time series per metric.

Add `customer_id` as a tag? You've just multiplied by your customer count.

**Real example:** An e-commerce company added `sku_id` to their metrics for debugging. 50,000 SKUs × 10 base metrics × 3 environments = 1.5 million new time series. Monthly increase: $15,000.

### Trap 3: The Log Indexing Trap

Log ingestion costs ($0.10/GB) seem cheap. Indexing costs ($1.70 per 1M indexed events at 15-day retention) don't seem bad.

But indexing is required for searching. And 15-day retention means you're paying continuously.

**Real example:** 500M indexed events/day × 30 days × $1.70/1M events = $25,500/month just for 15-day log indexing, plus ingestion.

Many companies don't realize they're paying for 15-day rolling windows until the first bill.

### Trap 4: The APM Host Redefinition

APM pricing is "per host." In non-Fargate container environments, that means the underlying host running the Datadog Agent, not every pod. But Fargate tasks, serverless traced invocations, indexed spans, and ingested span volume are separate billing dimensions.

A serverless function? That's active-function and traced-invocation billing. A Kubernetes pod on EC2? That's usually part of the underlying APM host plus span-volume billing. Auto-scaling? Every new node, Fargate task, or serverless invocation can change the bill.

**Real example:** During Black Friday, one company auto-scaled from 100 to 800 Fargate tasks. Their task-based APM usage for November increased sharply.

### Trap 5: The Integration Multiplier

Each integration (AWS, Kubernetes, Postgres, Redis, etc.) generates its own metrics. Enabling the "standard" integrations for a typical stack easily adds 500-1000 metric series per host.

At 100 hosts, that's 50,000-100,000 additional metrics before you write a single custom one.

## What Your Actual Bill Will Be

Here's a calculator based on our data:

```text
Base monthly cost = (
  (hosts × $15) +
  (hosts × $31 if APM) +
  (billable_container_overages × $1) +
  (log_gb_per_day × 30 × $0.10) +
  (indexed_log_events_per_month / 1,000,000 × indexed_log_retention_price) +
  (max(custom_metrics - hosts × 100, 0) × $0.05) +
  (extra_indexed_spans / 1,000,000 × indexed_span_retention_price) +
  (extra_ingested_span_gb × $0.10)
)

Reality multiplier = base × 3.5
```

The 3.5x reality multiplier accounts for:
- Container overages in Kubernetes
- Trace/span volume growth
- Integration metric expansion
- Cardinality growth over time

If your calculated base is $5,000/month, budget for $17,500.

## The Alternative Path

OpenTelemetry + a vendor-neutral backend changes the math entirely:

| Factor | Datadog Model | OTel + Open Backend |
|--------|---------------|---------------------|
| Data ownership | Vendor lock-in | Your data, your format |
| Host counting | Per host plus container overages | Per node or none |
| Log pricing | Per GB ingested + per indexed event | Storage and compute cost |
| Custom metrics | Per series | No vendor per-series fees |
| Scaling cost | Linear+ | Sub-linear |

With OpenTelemetry, you instrument once and send data anywhere. With an open-source backend like [OneUptime](https://oneuptime.com), you pay for infrastructure, not per-metric.

**Same 50-host example with open-source:**
- Infrastructure (3 nodes): ~$500/month
- Storage (500GB logs): ~$50/month
- Total: ~$550/month (vs. $25,000+)

Even with managed open-source options, you're looking at 80-90% cost reduction.

## How to Predict Your Real Datadog Bill

Before signing or renewing:

1. **Count containers, not services**: `kubectl get pods -A -o jsonpath='{range .items[*]}{range .spec.containers[*]}x{"\n"}{end}{end}' | wc -l`
2. **Calculate trace volume**: requests/sec × 86400 × 30 × avg_spans_per_request
3. **Measure log volume**: Check your current log aggregator or estimate 1-10KB per request
4. **Audit metric cardinality**: Multiply base metrics × hosts × (tag value combinations)
5. **Add 3x buffer**: Seriously.

## The Uncomfortable Truth

Datadog's pricing isn't predatory-it's designed for their business model. High margins require per-unit pricing that scales with usage.

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
