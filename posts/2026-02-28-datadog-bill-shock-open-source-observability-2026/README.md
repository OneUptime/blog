# Datadog Bill Shock Is Real: What Open Source Observability Looks Like in 2026

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Open Source, Monitoring, Comparison, DevOps

Description: Datadog bills are spiraling out of control for mid-market teams. Here is what a modern open source observability stack looks like in 2026, what it actually costs to run, and when it makes sense to...

If you've opened a Datadog invoice recently and felt your stomach drop, you're not alone. "Datadog bill shock" has become such a common experience that it's practically a rite of passage for engineering teams scaling past their first few services.

The pattern is always the same: you start with APM for a handful of services. Then you add logs because correlating traces with log lines is useful. Then custom metrics creep in. Then someone enables RUM. Then you get the invoice and realize you're spending more on observability than on the infrastructure you're observing.

This isn't a Datadog hit piece. Their product is genuinely good. But their pricing model - per-host for infra, per-million for logs, per-span for APM, per-session for RUM - creates a tax on growth that hits mid-market teams hardest. You're too big for the free tier, too small to negotiate enterprise discounts, and stuck in the middle watching costs compound.

So what do you do about it?

## The Actual Numbers

Let's put real numbers on this. A typical mid-market setup - 50 hosts, 20 services, reasonable log volume (100GB/day), basic APM, and a status page - runs roughly:

| Component | Datadog Cost (Monthly) |
|-----------|----------------------|
| Infrastructure (50 hosts) | $1,150 |
| APM (20 services) | $1,240 |
| Log Management (100GB/day) | $3,045 |
| Synthetics (100 tests) | $480 |
| RUM (100k sessions) | $1,590 |
| Incident Management | $680 |
| **Total** | **~$8,185/mo** |

That's nearly $100K per year. For observability. For a team that probably has 20-40 engineers.

And the worst part? These costs scale linearly with your infrastructure. Double your hosts, double your bill. Add a new service, add another line item. Growth literally costs you money in observability overhead.

## The Open Source Landscape in 2026

The open source observability ecosystem has matured dramatically. In 2022, going open source meant stitching together five different tools and hoping they talked to each other. In 2026, you have real options:

### Option 1: The DIY Stack

The classic approach: Prometheus for metrics, Grafana for dashboards, Loki for logs, Tempo for traces, Alertmanager for alerts. It works. Millions of companies run this.

**The honest trade-off:** You need someone to maintain it. Prometheus federation at scale is non-trivial. Loki's query performance with high cardinality labels requires tuning. You're trading vendor cost for engineering time.

**Real cost:** 3-5 dedicated EC2 instances for a 50-host fleet (~$800-1,200/mo in compute), plus 20-40 hours/month of engineering time for maintenance, upgrades, and firefighting.

### Option 2: Managed Open Source

Services like Grafana Cloud give you the open source stack without the operational burden. You get Prometheus-compatible metrics, Loki logs, and Tempo traces - managed for you.

**The honest trade-off:** Cheaper than Datadog, but not cheap. And you're still stitching together separate tools for status pages, incident management, and on-call.

**Real cost:** $2,000-4,000/mo for a similar workload, depending on data volume.

### Option 3: Unified Open Source Platforms

This is where 2026 is genuinely different from 2023. Platforms like OneUptime, SigNoz, and HyperDX offer unified observability - metrics, logs, traces, status pages, incident management, on-call - in a single open source package you can self-host.

**The honest trade-off:** These are newer. The ecosystems are smaller. You won't find a Datadog integration for every obscure SaaS tool. But for the core use cases - monitoring your infrastructure, debugging issues, managing incidents, communicating status - they're production-ready.

**Real cost for self-hosted:** 2-3 instances (~$400-800/mo compute), zero per-host or per-GB licensing fees. Your costs are infrastructure, not usage-based.

## When Switching Actually Makes Sense

Not every team should leave Datadog. Here's an honest framework:

**Stay on Datadog if:**
- You have fewer than 10 hosts (the free tier is fine)
- You heavily use 5+ Datadog integrations that don't exist elsewhere
- You have zero appetite for any self-hosting or operational work
- Your company negotiated a deep enterprise discount

**Consider switching if:**
- Your Datadog bill exceeds 5% of your total infrastructure spend
- You're primarily using metrics, logs, traces, and alerts (the core stuff)
- You have engineers comfortable with Docker/Kubernetes deployments
- You want to own your observability data
- You're growing fast and watching costs scale linearly

**Switch now if:**
- Your Datadog bill is growing faster than your revenue
- You've already been burned by an unexpected invoice
- You're evaluating vendors anyway due to contract renewal
- You want incident management, status pages, and monitoring in one place without paying three vendors

## The Migration Playbook

If you're going to switch, do it in phases. Don't rip and replace overnight.

**Phase 1 (Week 1-2): Parallel Run**

Deploy your open source platform alongside Datadog. Send the same telemetry to both. OpenTelemetry makes this trivially easy - just add another exporter.

```yaml
# otel-collector-config.yaml
exporters:
  otlp/oneuptime:
    endpoint: "your-oneuptime-instance:4317"
  datadog:
    api:
      key: ${DD_API_KEY}

service:
  pipelines:
    traces:
      exporters: [otlp/oneuptime, datadog]
    metrics:
      exporters: [otlp/oneuptime, datadog]
```

**Phase 2 (Week 3-4): Validate**

Compare dashboards side by side. Are the numbers matching? Are alerts firing correctly? Is the query performance acceptable for your on-call workflow?

**Phase 3 (Month 2): Migrate Teams**

Move one team at a time. Start with a team that's least dependent on Datadog-specific features. Let them run independently for 2-4 weeks.

**Phase 4 (Month 3): Cut Over**

Once you're confident, stop sending data to Datadog. Keep the account active for 30 days as a safety net. Then cancel.

## What You Gain Beyond Cost Savings

The cost story is compelling, but it's not the whole story. When you self-host your observability:

**Data sovereignty.** Your telemetry data - which contains details about your architecture, traffic patterns, error rates, and business metrics - lives on your infrastructure. Not someone else's.

**No usage anxiety.** When observability is usage-priced, engineers subconsciously self-censor. They don't add the extra log line. They don't enable tracing on that internal service. They don't create the custom metric. With self-hosted open source, there's no meter running. Instrument everything.

**Unified workflow.** Instead of Datadog for monitoring + StatusPage.io for status pages + PagerDuty for on-call + a separate incident tool, you get one platform. One place to look. One set of permissions. One billing relationship (or none, if self-hosted).

## The Honest Downsides

I'd be doing you a disservice if I didn't mention what you lose:

- **Datadog's integration library is massive.** 800+ integrations. Open source platforms have fewer. If you need the Snowflake integration or the Confluent Kafka integration specifically, check availability first.
- **Support.** With Datadog, you have a TAM you can call. With open source, you have community forums and documentation. Some offer commercial support tiers, but it's different.
- **Polish.** Datadog's UI is best-in-class. Open source UIs have improved enormously, but there are still rough edges.

## The Bottom Line

$100K/year on observability makes sense if you're a 500-person company with complex compliance requirements and 50 different integration needs. It doesn't make sense if you're a 30-person team running 20 microservices on Kubernetes.

The open source observability ecosystem in 2026 is genuinely ready for production mid-market workloads. The tools have matured, OpenTelemetry has standardized the data layer, and unified platforms mean you don't need to be a systems engineer to run your own stack.

The best time to evaluate was before your last invoice. The second best time is now.
