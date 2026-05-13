# How Datadog's Pricing Actually Works (And Why Your Bill Keeps Growing)

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Comparison, DevOps

Description: A plain-English breakdown of how Datadog bills you - custom metrics, indexed logs, APM hosts, and the hidden costs nobody warns you about.

If you've ever opened a Datadog invoice and felt your stomach drop, you're not alone. Datadog is a genuinely good product. That's not the debate. The debate is whether anyone actually understands what they're paying for.

This post breaks down every pricing dimension in Datadog, explains where the surprises come from, and gives you the math to figure out what you'll actually spend. No pitch, no spin - just the numbers.

## The Core Pricing Model

Datadog doesn't have one price. It has dozens of prices, layered across multiple products that interact in non-obvious ways. Here's how the main ones work.

### Infrastructure Monitoring

The base product. You pay per host per month.

| Plan | On-Demand | Annual Commit |
|------|-----------|---------------|
| Pro | $18/host/mo | $15/host/mo |
| Enterprise | $27/host/mo | $23/host/mo |

Sounds reasonable for 10 hosts. But here's where it gets interesting:

- **Containers are billed differently.** Pro includes 5 containers per host, and Enterprise includes 10 containers per host, averaged across your infrastructure. Running 200 containers across 10 Pro hosts means 50 are included and 150 are billed as extra containers. At $1/container/month on an annual plan, your $150/month infrastructure bill becomes about $300/month.
- **Custom metrics cost extra.** You get 100 custom metrics per host included. After that, it's $0.05/metric/month. A typical Kubernetes cluster with Prometheus exporters can easily generate 50,000+ custom metrics. That's an extra $2,450/month on top of your host costs.
- **Serverless functions add up.** Serverless Workload Monitoring is billed per active function, and Serverless Functions APM is billed per million traced invocations. If you're tracing 100M Lambda invocations/month, that's $1,000/month for Serverless Functions APM before active-function charges.

### Log Management

This is where most bill shock happens. Datadog charges for logs in three dimensions:

1. **Ingestion:** $0.10 per GB ingested
2. **Indexing:** $1.70 per million log events (15-day retention) or $2.50 (30-day retention) on an annual plan
3. **Archival and Rehydration:** Additional costs to store and re-access old logs

The trap: Ingestion and indexing are separate charges. You pay to get logs in, then pay again to make them searchable. Many teams don't realize this until month two.

**Real example:** A 50-person engineering team generating 500GB of logs per day:
- Ingestion: 500GB × $0.10 × 30 = $1,500/month
- Indexing (assuming that 20% corresponds to ~300M indexed events/month): 300M events × $1.70/M = $510/month (15-day) or $750/month (30-day)
- Total: **$2,010 to $2,250/month** just for logs

And that's conservative. Teams that index everything (a common early mistake) can see 5x these numbers.

### APM (Application Performance Monitoring)

APM is priced per host:

| Plan | On-Demand | Annual Commit |
|------|-----------|---------------|
| APM | $36/host/mo | $31/host/mo |
| APM Pro | $42/host/mo | $35/host/mo |
| APM Enterprise | $48/host/mo | $40/host/mo |

But the real cost is in **Indexed Spans**. You get 1M indexed spans per APM host included. After that, it's $1.70 per million additional spans.

A single microservice handling 1,000 requests/second generates ~2.6 billion spans per month (assuming 1 span per request). Even with aggressive sampling at 1%, that's 26M spans - 25M over one host's included allotment. That's $42.50/month extra for that trace volume.

Multiply across 30 microservices and you're looking at $1,275/month in overage charges alone, on top of the per-host APM fees.

### RUM (Real User Monitoring)

RUM Measure is $0.15 per 1,000 sessions on an annual plan, while RUM Investigate is $3.00 per 1,000 filtered sessions. A site with 2 million monthly sessions pays $300/month for RUM Measure before any add-ons such as Session Replay. Mobile RUM uses the same session-based model.

### Synthetic Monitoring

- API tests: $7.20 per 10,000 test runs
- Browser tests: $18.00 per 1,000 test runs

Running 100 API checks every minute from 5 locations = 21.6M test runs/month = **$15,552/month**. Most teams don't need that frequency, but the pricing scales faster than people expect.

### Database Monitoring

$70/host/month (annual) for database monitoring. If you're running 10 database instances, that's $700/month for query-level visibility.

## The Compound Effect

Here's what nobody talks about: these costs multiply together. A real mid-market company (100 engineers, 50 services, moderate traffic) typically sees:

| Component | Monthly Cost |
|-----------|-------------|
| Infrastructure Enterprise (50 hosts) | $1,150 |
| Containers (200 containers, within Enterprise allotment) | $0 |
| Custom Metrics (30,000) | $1,000 |
| Log Ingestion (200GB/day) | $600 |
| Log Indexing (750M indexed events/month) | $1,275 |
| APM (50 hosts) | $2,000 |
| APM Span Overages | $1,275 |
| RUM Measure (500K sessions) | $75 |
| Synthetics (50 API checks every 2 minutes from 1 location) | $540 |
| Database Monitoring (5 DBs) | $350 |
| **Total** | **$8,265/month** |

That's **$99,180/year** for a 100-person engineering team. And this estimate is conservative - it doesn't include Continuous Profiler ($19/host annually), Cloud Security Management Pro ($10/host annually or $12 month-to-month), Network Monitoring ($5/host annually), Incident Management, or any of the other add-ons.

Enterprise companies with 500+ services regularly report annual bills exceeding $500K. Some cross $1M.

## Where the Surprises Come From

After talking to hundreds of engineering teams, these are the most common sources of unexpected costs:

### 1. The Custom Metrics Explosion

Prometheus exporters, StatsD, and application-level metrics all count toward your custom metrics total. A single Kubernetes cluster with standard exporters (node-exporter, kube-state-metrics, cAdvisor) can generate 10,000+ metrics before you write a single line of instrumentation code.

The fix most teams discover too late: Datadog's Metrics without Limits lets you control which custom metric tags remain queryable, but it requires ongoing maintenance and separates indexed custom metric volume from ingested custom metric volume for configured metrics.

### 2. Log Volume Drift

Logs grow. It's the second law of software thermodynamics. A new service gets deployed, someone adds debug logging, traffic increases 30% - and suddenly your log bill doubles. Without index daily quotas and exclusion filters (which Datadog offers but doesn't enable for your workload by default), costs grow silently.

### 3. Container Density Math

The host-based container allotment means container density directly affects your bill. Efficient bin-packing that reduces your node count can actually increase your Datadog bill if it pushes your total containers above the included 5-per-host Pro or 10-per-host Enterprise ratio. You're literally penalized for efficient infrastructure.

### 4. Span Sampling Complexity

APM's span indexing costs mean you need a sophisticated sampling strategy from day one. Most teams don't implement one until after their first surprise bill. By then, they've already committed to annual pricing based on their first month's usage.

### 5. Cross-Product Data Duplication

Infrastructure metrics, APM traces, and logs often contain overlapping data. You're paying three times to monitor the same request - once as a metric, once as a trace, once as a log line. Datadog benefits from this overlap because each product bills independently.

## What Are the Alternatives?

The observability market has shifted significantly. Here are the realistic options:

### Self-Hosted Open Source

Tools like [OneUptime](https://oneuptime.com), Grafana + Loki + Tempo, and SigNoz offer self-hosted alternatives where you control the infrastructure and pay zero licensing fees. The trade-off is operational overhead - you're running the monitoring system yourself.

OneUptime specifically replaces the full Datadog stack (metrics, logs, traces, status pages, incident management, on-call) in a single platform, which eliminates the tool sprawl problem. It's fully open source - not open-core - so there's no "enterprise edition" upsell.

### Managed Alternatives

Grafana Cloud, New Relic (with its consumption-based model), and Elastic Cloud offer managed alternatives with different pricing structures. New Relic's per-user model can be cheaper for high-volume, small-team setups. Grafana Cloud's pricing tends to be more predictable.

### Hybrid Approaches

Many teams run a self-hosted stack for high-volume data (logs, metrics) and use a SaaS tool for APM or specific capabilities. This is more complex but can cut costs by 60-70%.

## How to Audit Your Current Datadog Spend

If you're already on Datadog, here's a quick audit:

1. **Usage page:** Go to Plan & Usage → Usage to see per-product consumption
2. **Custom metrics:** Check Infrastructure → Metrics Summary for your total active metrics count
3. **Log analytics:** Use the Estimated Usage dashboard to see ingestion vs. indexing ratios
4. **Container ratio:** Compare your container count to host count - if it's above 5:1, you're paying extra
5. **Span indexing:** Check APM → Settings → Ingestion Control to see your sampling rates

Most teams find 20-30% immediate savings just by adding exclusion filters, adjusting sampling rates, and removing unused integrations.

## The Bottom Line

Datadog's pricing isn't evil - it's complex. The product is genuinely powerful, and for some teams, the cost is justified. But the pricing model creates structural incentives where costs grow faster than infrastructure, and that gap widens over time.

If your annual monitoring bill is approaching or exceeding 5% of your total cloud spend, it's worth exploring alternatives. Not because Datadog is bad, but because that ratio should trend down, not up, as you scale.

The observability market in 2026 has real competition. Self-hosted open-source platforms have matured to the point where "we can't run it ourselves" is no longer a valid excuse for most mid-market engineering teams. The math has shifted. Make sure your stack reflects that.
