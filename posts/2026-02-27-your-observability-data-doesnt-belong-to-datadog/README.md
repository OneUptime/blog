# Your Observability Data Doesn't Belong to Datadog

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Open Source, Monitoring, DevOps

Description: The digital sovereignty movement is coming for observability. Here's why your monitoring data should live on infrastructure you control.

Denmark just announced it's ditching Microsoft in favor of open-source alternatives. The EU's Digital Sovereignty push is accelerating. Governments and enterprises are waking up to a simple truth: when your critical infrastructure depends on a vendor's SaaS platform, you don't really control it.

This conversation hasn't reached observability yet. It should.

## Your Monitoring Data Is More Sensitive Than You Think

Think about what your observability platform knows about you:

- **Every service in your architecture** - what they are, how they connect, what they depend on
- **Every deployment** - when you ship, how often, what breaks
- **Every incident** - your vulnerabilities, your response times, your weak points
- **Every log line** - potentially containing PII, secrets, internal business logic
- **Every trace** - the exact flow of every request through your system

This isn't just telemetry. It's a complete X-ray of your engineering organization. And right now, most companies ship all of it to a third party.

## The Hidden Cost of SaaS Observability

The pricing problem is well-documented. Datadog bills have become legendary - teams routinely report 6- and 7-figure annual contracts that grow faster than their infrastructure. Custom metrics, log ingestion, APM traces - every dimension is a billing vector.

But pricing is the obvious cost. The hidden costs are worse:

### Vendor Lock-In Is Structural

Once your dashboards, alerts, SLOs, and runbooks live in a vendor's platform, migration isn't a weekend project. It's a quarter-long initiative. Every custom dashboard, every alert rule, every integration - all of it is built on proprietary APIs and query languages.

This lock-in is by design. The more you invest in a platform, the harder it is to leave. And the vendor knows exactly how locked in you are, because they can see your usage data.

### Data Residency Is a Real Problem

If you're in the EU, you're subject to GDPR. If you're in healthcare, HIPAA. Finance, SOC 2 and more. Government, FedRAMP.

When your logs contain customer data (and they always do, no matter how careful you are), shipping them to a US-based SaaS platform creates compliance complexity. Where exactly is that data stored? Who has access? What happens when a subpoena arrives?

Self-hosted observability eliminates this entire category of risk. Your data stays on your infrastructure, in your region, under your control.

### You Can't Observe the Observer

Here's an irony that doesn't get enough attention: when your monitoring platform goes down, you're blind. You can't monitor the thing that monitors everything else.

Datadog has had multiple significant outages. When it happens, thousands of engineering teams simultaneously lose visibility into their own systems. You're paying premium prices for a single point of failure you can't control.

## The Sovereignty Argument

Digital sovereignty isn't just a government concern. It's an engineering principle.

When Denmark moves off Microsoft, they're not just saving money (though they will). They're asserting control over critical infrastructure. They're ensuring that policy changes in Redmond don't affect operations in Copenhagen.

The same logic applies to observability:

- **You should be able to inspect your monitoring platform's code.** Are there backdoors? Data collection you didn't agree to? You can't know if the source is closed.
- **You should be able to run it wherever you want.** On-prem, your own cloud, air-gapped - your choice.
- **You should own your data completely.** Not "you can export it" - you should never have to export it because it never left.
- **You should be able to modify it.** Need a custom integration? A specific retention policy? Fork it. Build it. Ship it.

## What Open-Source Observability Looks Like in 2026

The open-source observability ecosystem has matured dramatically. You no longer need to duct-tape Prometheus, Grafana, Jaeger, and ELK together and hope it holds.

Modern open-source platforms provide the full stack:

- **Uptime monitoring** - HTTP, TCP, UDP, ping, with global probe locations
- **Status pages** - branded, public or private, with subscriber notifications
- **Incident management** - on-call schedules, escalation policies, post-mortems
- **Logs** - structured, searchable, with retention policies you control
- **APM and traces** - OpenTelemetry-native, distributed tracing across services
- **Error tracking** - automatic grouping, stack trace analysis, release tracking

All of this exists today as open source. You can run it on a single VM or scale it across a cluster. Your data never leaves your infrastructure.

## The Math Actually Works

"But self-hosting is expensive" - let's actually do the math.

A mid-size team (50 engineers, 200 services) on Datadog typically pays $150K-$400K/year. That's infrastructure monitoring, APM, logs, and synthetics.

Self-hosting an open-source observability platform on equivalent cloud infrastructure costs $2K-$5K/month in compute and storage. Call it $60K/year on the high end.

You save $100K-$340K/year. And you get:
- Complete data ownership
- No per-host, per-metric, or per-GB pricing surprises
- Full customization capability
- Compliance simplification
- No vendor lock-in

The "hidden cost of self-hosting" argument made sense in 2020. In 2026, with Kubernetes, Helm charts, and mature open-source platforms, deployment is a `helm install` away.

## Making the Switch

If you're currently on a SaaS observability platform and this resonates, here's a practical path:

1. **Start with status pages.** They're the easiest to migrate and have the least lock-in risk. Get your public status page on infrastructure you control.

2. **Add uptime monitoring.** Replace your Pingdom or synthetic monitoring. This is straightforward and gives you immediate value.

3. **Migrate incident management.** Move on-call schedules and escalation policies. This is where vendor lock-in hurts most - having your incident response depend on a third party is a risk.

4. **Bring logs in-house.** This is where the cost savings are biggest. Log ingestion pricing at SaaS vendors is where bills explode.

5. **Complete with APM.** Instrument with OpenTelemetry (which you should be using regardless), and point it at your self-hosted platform.

You don't have to do it all at once. Each step reduces your vendor dependency and saves money.

## The Trend Is Clear

Governments are moving to open source. Enterprises are demanding data sovereignty. Engineering teams are tired of monitoring bills that grow faster than revenue.

The observability industry is going through the same transition that databases, CI/CD, and container orchestration already went through: the open-source option isn't just "good enough" anymore. It's better.

Your observability data is a complete map of your engineering organization. It deserves the same sovereignty you'd demand for your source code or your customer data.

Own your stack. Own your data. Own your observability.
