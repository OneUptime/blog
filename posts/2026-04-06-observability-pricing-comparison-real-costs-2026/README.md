# What Observability Actually Costs in 2026: A Real-World Pricing Breakdown

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Comparison, Open Source, DevOps

Description: A transparent, scenario-based pricing breakdown of Datadog, New Relic, Grafana Cloud, and open source observability for real engineering teams in 2026.

Every quarter, someone on your team opens a spreadsheet and tries to answer the same question: are we paying too much for observability?

The answer is almost certainly yes. But the harder question is: how much too much?

Vendor pricing pages are designed to look simple. Per-host pricing. Per-GB ingestion. Free tiers with generous limits. But the moment you plug in real numbers from a real engineering team, those simple prices turn into something else entirely.

This post does the math. No hand-waving, no "it depends." Three realistic scenarios, four platforms, real numbers.

## The scenario

To make this useful, we need a concrete setup. Here is what a mid-market engineering team typically looks like:

- **Team size:** 25 engineers, 5 SREs
- **Infrastructure:** 80 hosts (mix of VMs and Kubernetes nodes)
- **Containers:** 400 running containers across those nodes
- **Services:** 40 microservices instrumented with distributed tracing
- **Logs:** 500 GB/month ingested
- **Custom metrics:** 2,000 unique metric time series
- **Retention:** 30 days for logs, 15 months for metrics
- **Extras:** Synthetic monitoring (20 API tests), on-call scheduling for 8 people, 2 public status pages

This is not a hypothetical. This is what a Series A to Series C company running a SaaS product looks like. If you are reading this, you probably recognize it.

## Datadog

Datadog is the market leader for a reason. The product is excellent. The pricing is where it gets complicated.

### Infrastructure monitoring

80 hosts at $23/host/month (Enterprise, annual billing): **$1,840/month**

But remember: Datadog uses high-water mark billing. If you auto-scale to 120 hosts during peak traffic even once, you could be billed for 120 hosts that entire month. For teams that scale elastically, actual costs are typically 20-40% higher than the baseline host count suggests.

Adjusted estimate: **$2,200/month**

### APM and distributed tracing

40 traced services across 80 hosts at $31/host/month (APM Pro): **$2,480/month**

### Custom metrics

2,000 custom metrics sounds modest, but Datadog counts each unique combination of metric name and tags as a separate time series. Add an endpoint tag with 50 values, a status code tag with 5 values, and a region tag with 3 values to one metric, and you have created 750 time series from a single metric name.

Real-world custom metric count for our scenario: likely 5,000-10,000 time series.

At $5 per 100 metrics beyond the included 100/host allotment (8,000 included across 80 hosts), the overage for 10,000 metrics is 2,000 extra time series: **$100/month**

This one stays reasonable if you are careful. Most teams are not careful. We will be generous and assume you are.

### Log management

500 GB/month ingestion at $0.10/GB: **$50/month** for ingestion.

But you also pay for retention. 30-day retention (the "online" tier) costs $2.55/GB/month for indexed logs. If you index 20% of your logs (100 GB): **$255/month**

Total logs: **$305/month**

### Synthetic monitoring

20 API tests running every 5 minutes from 3 locations: ~10,000 API test runs/month.

At $7.20 per 1,000 test runs: **$72/month**

### Incident management

Datadog's incident management is included in higher tiers, but on-call scheduling requires PagerDuty or Opsgenie integration. Most Datadog customers end up paying separately for this.

PagerDuty for 8 on-call engineers at $21/user/month: **$168/month**

### Status pages

Datadog does not offer status pages. You will need Atlassian Statuspage or similar.

Atlassian Statuspage (Team plan, 2 pages): **$79/month**

### Total Datadog stack

| Component | Monthly cost |
|---|---|
| Infrastructure monitoring | $2,200 |
| APM | $2,480 |
| Custom metrics overage | $100 |
| Log management | $305 |
| Synthetic monitoring | $72 |
| PagerDuty (on-call) | $168 |
| Statuspage | $79 |
| **Total** | **$5,404/month** |

**Annual cost: ~$64,848**

And this is the conservative estimate. Teams that are not actively managing custom metric cardinality, log indexing volumes, and auto-scaling host counts regularly see bills 30-50% higher.

## New Relic

New Relic restructured its pricing around a user-based model. You pay per "full platform user" per month, plus data ingestion.

### Users

25 engineers + 5 SREs = 30 full platform users (anyone who needs to query data, build dashboards, or respond to alerts).

At $549/user/month (Standard, annual): **$16,470/month**

This is the number that makes people do a double-take. New Relic's per-user pricing means that the more people who need observability access, the more expensive it gets. For large teams, this single line item dominates the entire bill.

You can reduce this by limiting some users to "core" tier ($99/user/month) or basic (free), but practically speaking, engineers who need to debug production issues need full platform access.

Let us say you optimize aggressively: 15 full platform users and 15 core users.

Adjusted: (15 × $549) + (15 × $99) = **$9,720/month**

### Data ingestion

New Relic includes 100 GB/month free per full platform user. With 15 full platform users, that is 1,500 GB/month included.

Our 500 GB of logs plus metrics and traces (call it 700 GB total) falls within the included allotment.

Extra data: **$0/month**

### Synthetic monitoring

Included with full platform access. 20 API tests with reasonable frequency: included.

### On-call and status pages

New Relic does not offer native on-call scheduling or status pages. Same add-ons as Datadog.

PagerDuty: **$168/month**
Statuspage: **$79/month**

### Total New Relic stack

| Component | Monthly cost |
|---|---|
| Users (optimized mix) | $9,720 |
| Data ingestion | $0 |
| Synthetic monitoring | $0 |
| PagerDuty (on-call) | $168 |
| Statuspage | $79 |
| **Total** | **$9,967/month** |

**Annual cost: ~$119,604**

New Relic's "data is free" marketing is clever, but the user pricing makes it the most expensive option for teams with more than a handful of engineers. The math only works if you have a massive amount of data and very few people who need access.

## Grafana Cloud

Grafana Cloud is the managed version of the popular open-source Grafana, Loki, Tempo, and Mimir stack. Pricing is usage-based.

### Metrics (Grafana Cloud Mimir)

2,000 active series are included free. Beyond that, pricing is $8 per 1,000 active series/month.

For our scenario with 10,000 active series: 8,000 billable at $8/1,000: **$64/month**

### Logs (Grafana Cloud Loki)

50 GB/month included free. 500 GB total means 450 GB billable at $0.50/GB: **$225/month**

### Traces (Grafana Cloud Tempo)

50 GB/month included free. Assuming 100 GB of trace data, 50 GB billable at $0.50/GB: **$25/month**

### Synthetic monitoring

Included up to 50 checks.

### Alerting and on-call (Grafana OnCall + IRM)

Grafana offers OnCall as part of their IRM product. The free tier covers basic needs, and the Pro tier ($20/user/month for IRM) covers most scenarios.

8 on-call engineers at $20/user/month: **$160/month**

### Status pages

Grafana does not offer status pages. Add Statuspage: **$79/month**

### Total Grafana Cloud stack

| Component | Monthly cost |
|---|---|
| Metrics | $64 |
| Logs | $225 |
| Traces | $25 |
| Synthetic monitoring | $0 |
| On-call (IRM Pro) | $160 |
| Statuspage | $79 |
| **Total** | **$553/month** |

**Annual cost: ~$6,636**

Grafana Cloud is significantly cheaper. The trade-off is real though: you are managing a collection of tools rather than one integrated platform. Correlation between metrics, logs, and traces requires more manual configuration. And the learning curve for Loki's query language versus Datadog's log search is steeper.

## OneUptime

Full disclosure: this is our product. We are including it because the comparison is not useful without a self-hosted open-source option that includes everything in one platform.

OneUptime is open source and includes monitoring, APM, logs, status pages, incident management, and on-call scheduling in a single platform. You can self-host it for free or use the managed SaaS.

### SaaS pricing

The Growth plan is $22/month as a base, plus usage-based ingestion at $0.10/GB for telemetry data (logs, metrics, traces).

500 GB of logs + 200 GB of metrics and traces = 700 GB at $0.10/GB: **$70/month** for ingestion.

Base plan: **$22/month**

### What is included (no add-ons needed)

- Monitoring: website, API, synthetic (Playwright), server, network - included
- APM and distributed tracing - included
- Log management - included
- On-call scheduling and escalation - included
- Status pages (public and private) - included
- Incident management - included
- Error tracking - included
- OpenTelemetry native - no vendor lock-in

### Total OneUptime (SaaS)

| Component | Monthly cost |
|---|---|
| Base plan | $22 |
| Data ingestion (700 GB) | $70 |
| Monitoring | $0 |
| APM | $0 |
| On-call | $0 |
| Status pages | $0 |
| **Total** | **$92/month** |

**Annual cost: ~$1,104**

### Self-hosted (free)

If you self-host OneUptime, the software is free. Your only cost is the infrastructure to run it. A reasonable setup for this scenario would be 2-3 servers with 16 GB RAM each, running Docker or Kubernetes.

Estimated infrastructure cost on any cloud provider: **$150-300/month**

No per-host fees. No per-user fees. No ingestion fees. No retention fees.

## The comparison table

| | Datadog | New Relic | Grafana Cloud | OneUptime SaaS | OneUptime Self-Hosted |
|---|---|---|---|---|---|
| Annual cost | $64,848 | $119,604 | $6,636 | $1,104 | ~$2,400 (infra only) |
| Monitoring | ✓ | ✓ | ✓ | ✓ | ✓ |
| APM / Traces | ✓ | ✓ | ✓ | ✓ | ✓ |
| Logs | ✓ | ✓ | ✓ | ✓ | ✓ |
| On-call | ✗ (add-on) | ✗ (add-on) | ✓ | ✓ | ✓ |
| Status pages | ✗ (add-on) | ✗ (add-on) | ✗ (add-on) | ✓ | ✓ |
| Incident management | ✓ | ✓ | Partial | ✓ | ✓ |
| Open source | ✗ | ✗ | Partial | ✓ | ✓ |
| Vendor lock-in risk | High | High | Medium | Low | None |

## What this actually means

The pricing gap is not 2x or 3x. It is 10-60x depending on the comparison.

This is not because Datadog or New Relic are bad products. They are excellent. But their pricing models were designed for a different era. Per-host pricing made sense when companies had predictable server counts. Per-user pricing made sense when only a few SREs needed deep access.

In 2026, every engineer needs observability access. Infrastructure is elastic. Containers spin up and down by the hundreds. AI workloads are generating exponentially more telemetry. The old pricing models are breaking.

Three things are driving the shift:

**1. Tool consolidation is real.** The Elastic/Dimensional Research survey found that 51% of organizations are actively consolidating observability tools. Paying for Datadog plus PagerDuty plus Statuspage plus a separate log aggregator is losing out to platforms that do everything in one place.

**2. Open source is production-ready.** The stigma that open-source observability is not enterprise-grade is gone. OpenTelemetry is the standard. Teams want vendor neutrality, and they are willing to self-host to get it.

**3. Cost is now a C-level conversation.** The same Elastic report found that 97% of organizations have experienced unexpected observability cost overruns. 54% of IT leaders report increasing pressure to justify observability spending. This is not an infrastructure decision anymore - it is a business decision.

## The honest trade-offs

Cheaper does not mean better for every team. Here is when each option makes sense:

**Choose Datadog if:** You have deep pockets, need the most polished UI in the industry, want 850+ integrations out of the box, and your team already knows it. The product is genuinely great. The price is the price.

**Choose New Relic if:** You have a small team generating massive amounts of data. The user-based model actually works in your favor if you have 3 SREs monitoring 50 TB/month.

**Choose Grafana Cloud if:** Your team is comfortable with the Grafana ecosystem, you want usage-based pricing, and you do not mind managing multiple tools for different observability pillars.

**Choose OneUptime if:** You want one platform for everything (monitoring, APM, logs, on-call, status pages, incident management), you care about cost predictability, or you want the option to self-host with zero vendor lock-in.

## Run the numbers yourself

Every team is different. Your log volumes, host counts, and user needs will shift these numbers. But the pricing structures do not change:

- Datadog charges per host, per metric, per GB, per test run - across multiple products
- New Relic charges per user - which scales linearly with your team size
- Grafana Cloud charges per usage - reasonable, but you need add-ons for the full stack
- OneUptime charges per GB ingested - with everything else included

The best way to decide is to take your actual numbers and do the math. If you do, the conversation usually gets interesting fast.
