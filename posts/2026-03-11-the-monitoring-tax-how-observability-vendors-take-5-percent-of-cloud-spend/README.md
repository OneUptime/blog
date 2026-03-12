# The Monitoring Tax: How Observability Vendors Take 5% of Cloud Spend

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Open Source, Cloud

Description: Most engineering teams don't realize their monitoring bill is 3-7% of total cloud spend. Here's how it happens, why vendors love it, and what you can do about it.

There's a line item in your cloud budget that nobody talks about in planning meetings. It doesn't show up in architecture reviews. It rarely gets its own cost optimization initiative. But it's quietly eating 3-7% of your total infrastructure spend - and growing faster than the infrastructure it monitors.

It's your observability bill.

## The Numbers Nobody Talks About

Let's do the math that most vendors hope you never do.

A mid-size engineering team running 50 microservices on Kubernetes generates roughly:

- **Metrics:** 500K active time series (conservative - each service emits ~10K series across host, container, app, and custom metrics)
- **Logs:** 500GB-1TB per month (50 services × 10-20GB each, before you count load balancers, ingress controllers, and sidecars)
- **Traces:** 100M spans per month (at even modest sampling rates)
- **Synthetics:** 50 monitors across endpoints and critical flows

On Datadog's published pricing, that looks something like:

| Product | Volume | Monthly Cost |
|---------|--------|-------------|
| Infrastructure (Pro) | 100 hosts × $23/host | $2,300 |
| Custom Metrics | 500K series × $0.05 | $25,000 |
| Log Management (ingest + retain 15d) | 750GB × $0.10 ingest + index | $5,250 |
| APM + Distributed Tracing | 100 hosts × $40/host | $4,000 |
| Synthetic Monitoring | 50 API tests × $12 | $600 |
| Real User Monitoring | 50K sessions × $0.015 | $750 |

**Total: ~$38,000/month - $456,000/year.**

For a team whose AWS bill is $80-120K/month, that's monitoring costing **30-50% of the infrastructure it watches.** And that's before enterprise add-ons like Security Monitoring, CI Visibility, or Database Monitoring.

Obviously not every team has all these products. The point isn't the exact number - it's the ratio. Your monitoring spend scales with your infrastructure, but nobody budgets for it that way.

## How Did We Get Here?

The observability pricing model is a masterpiece of incremental lock-in. Here's how it works:

### Stage 1: The Reasonable Entry Point

You start with infrastructure monitoring. $15-23 per host per month. Completely reasonable. Nobody questions it. It's less than a team lunch.

### Stage 2: The Second Product Hook

You add APM because your team is debugging a latency issue and needs traces. Now you're paying per host for two products. The per-host model still feels manageable. You're maybe $50-60 per host per month. Still cheaper than the engineer-hours you'd spend without it.

### Stage 3: The Custom Metrics Ambush

Your developers start instrumenting their code properly. They add business metrics, queue depths, cache hit rates - the stuff that actually matters. Suddenly you're at 200K custom metrics and the bill has a new $10K line item that didn't exist last quarter. Nobody approved this spend. Nobody even knew it was happening until the invoice hit.

### Stage 4: The Log Explosion

Someone enables debug logging in production to diagnose an incident. Or you onboard a chatty Java service. Or Kubernetes decides to be verbose about pod scheduling. Your log volume doubles in a week. By the time you notice, you've burned through your committed spend and you're on overage pricing.

### Stage 5: The Negotiation Trap

Now you're spending enough to get an enterprise account manager. They offer you a "committed spend discount" - 30-40% off if you sign a 1-3 year contract. Sounds great. Except the contract locks in a minimum spend that assumes your infrastructure only grows. And it locks you into the platform. Migration cost + committed contract = you're not leaving.

This is the playbook. It's not evil - it's just business. But engineers should understand it the same way they understand AWS reserved instance pricing or CDN commit tiers.

## The Real Cost Isn't the Invoice

The invoice is just the obvious part. The hidden costs are worse:

**Cardinality anxiety.** Engineers stop adding useful labels to metrics because they're afraid of the custom metrics bill. Your monitoring becomes less useful over time - not because the tool got worse, but because you self-censored your instrumentation.

**Log sampling guilt.** You know you should keep all your logs, but at $0.10/GB for ingest plus retention costs, you start dropping log levels. Then an incident happens and the debug logs you need were the ones you decided not to ship.

**Organizational friction.** Adding a new service to monitoring requires a budget conversation. In 2026. Think about how insane that is. "Can we monitor this new production service?" should never be a question that involves a spreadsheet.

**Vendor lock-in masquerading as ecosystem.** Custom dashboards, monitors, SLOs, notebooks - all built on proprietary query languages and data formats. The more value you build in the platform, the harder it is to leave. This is a feature, not a bug.

## What the Market Is Telling Us

Three trends are converging that make this the right time to question the status quo:

### 1. OpenTelemetry Won

OTel is now the default instrumentation standard. It ships with most major frameworks. Your data is already in a vendor-neutral format at the point of collection. The "switching cost" argument that justified vendor lock-in is weaker than ever. If your data is OTel-native, your backend is a choice - not a prison sentence.

### 2. Storage Got Cheap. Compute Got Cheaper.

The original SaaS monitoring pitch was "you shouldn't run this yourself - storage and compute are expensive and operations are complex." That was true in 2015. In 2026, a managed Kubernetes cluster with cheap object storage can run a full observability stack for a fraction of what you'd pay a vendor. The ops burden is real but dramatically reduced from a decade ago.

### 3. Engineering Teams Want Control

Platform engineering isn't a trend - it's how modern teams operate. Teams that build their own deployment pipelines, manage their own infrastructure-as-code, and run their own databases are increasingly asking: why are we paying someone else to store our metrics?

## What You Can Actually Do

If you've read this far and you're looking at your own monitoring spend with new eyes, here's a practical framework:

### Audit First

Run this analysis for your own stack:
1. Total monthly monitoring/observability spend (all vendors, all products)
2. Total monthly infrastructure spend (cloud + bare metal + CDN)
3. Divide #1 by #2

If you're above 5%, you're overpaying relative to market. If you're above 10%, you should treat this as a P1 cost optimization project.

### Evaluate the Unbundled Alternative

The observability market has fragmented into best-of-breed options:

- **Metrics:** Prometheus + Thanos/Cortex/Mimir (free, battle-tested at scale)
- **Logs:** Loki, ClickHouse, or OpenSearch (dramatically cheaper per GB)
- **Traces:** Jaeger or Tempo with OTel collectors
- **Status Pages:** Dozens of options, many self-hosted
- **Incident Management:** PagerDuty alternatives abound
- **Synthetics:** Checkly, Uptime Kuma, or self-hosted alternatives

The tradeoff: you get cost savings but you're running 4-6 different tools. That's its own operational burden.

### Or Evaluate Consolidated Open Source

This is where tools like [OneUptime](https://oneuptime.com) fit - a single open-source platform that handles monitoring, status pages, incident management, on-call, logs, traces, and APM in one stack. Self-host it and your monitoring cost becomes infrastructure cost (a few servers) instead of a per-host, per-metric, per-GB vendor fee.

The tradeoff here: you own the operations. But you own the data too. And the cost curve is flat instead of exponential.

### Negotiate Harder

If you're staying with your current vendor, at least negotiate with data:
- Know your exact per-unit costs across every product
- Benchmark against published pricing of alternatives
- Push back on committed spend increases at renewal
- Demand cardinality caps that don't penalize good instrumentation practices

## The Uncomfortable Truth

The monitoring industry's business model is fundamentally misaligned with its users' interests. Vendors make more money when you emit more data. You get more value when you emit more data. But the cost scales linearly (or worse) with volume, while the value has diminishing returns. At some point, you're paying to store metrics nobody looks at - but you can't turn them off because you might need them during the next incident.

This isn't sustainable. The market is correcting. OpenTelemetry made the data portable. Open source made the backends accessible. Platform engineering made self-hosting practical.

The monitoring tax is real. But it's also optional.

---

*OneUptime is an open-source observability platform - monitoring, status pages, incident management, on-call, logs, APM, and traces in one tool. Free to self-host, with SaaS available for teams that don't want to run infrastructure. [Check it out on GitHub.](https://github.com/OneUptime/oneuptime)*
