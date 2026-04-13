# The Real Cost of Your Observability Stack

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Open Source

Description: Most teams have no idea what they actually spend on observability. Here's a breakdown of what the typical monitoring stack costs - and what you can do about it.

A post on Hacker News recently hit nearly 900 points: "I run multiple $10K MRR companies on a $20/month tech stack." The comments were full of engineers sharing war stories about bloated infrastructure costs. But one category kept coming up that nobody had a clean answer for: **observability**.

Monitoring, logging, tracing, alerting, status pages, incident management, on-call - it adds up. And most teams have no idea how much they're actually paying because the bill is spread across 4-6 different vendors.

Let's fix that.

## The Typical Mid-Market Observability Stack

Here's what a 50-person engineering team (serving ~100 microservices) commonly runs:

| Tool | What It Does | Typical Monthly Cost |
|------|-------------|---------------------|
| Datadog | Infrastructure + APM | $5,000 - $15,000 |
| PagerDuty | On-call + alerting | $1,000 - $3,000 |
| StatusPage.io | Public status page | $400 - $1,500 |
| Sentry | Error tracking | $300 - $1,000 |
| Pingdom | Uptime monitoring | $200 - $500 |
| Loggly/Papertrail | Log management | $500 - $2,000 |

**Total: $7,400 - $23,000/month**

That's $88,800 - $276,000 per year. On monitoring.

And this doesn't include the engineering time spent integrating six different tools, maintaining six sets of credentials, and context-switching between six different UIs during an incident.

## Where the Money Actually Goes

### The Per-Host Tax

Most APM/infrastructure tools charge per host. Datadog's Infrastructure Monitoring starts at $15/host/month (Pro) or $23/host/month (Enterprise). Sounds reasonable until you have 200 containers spinning up and down on Kubernetes. Suddenly you're paying for ephemeral workloads that exist for 30 seconds.

The real cost isn't the base price - it's the **metering model**. Per-host pricing was designed for a world where you had 10 servers in a rack. In a containerized world, it's a tax on scaling.

### The Data Ingestion Trap

Log management pricing is where bills explode. Most vendors charge by volume:

- **Datadog Logs:** $0.10/GB ingested + $2.55/million log events for indexing
- **Splunk:** Historically $150+/GB/day (though they've introduced workload pricing)
- **Elastic Cloud:** Starts at $95/month, scales fast with storage

The problem: you don't control how much data your applications generate. A noisy deployment, a retry storm, a debug flag left on in production - any of these can triple your log volume overnight. Engineers have told me they've been woken up not by an outage, but by a Slack alert from finance about a sudden spike in their Datadog bill.

### The Vendor Lock-in Premium

Here's the cost nobody talks about: switching cost. Once you've instrumented 100 services with a vendor's proprietary agent, written dashboards in their query language, and built runbooks referencing their UI - you're locked in.

This is by design. Every custom integration, every proprietary query syntax, every vendor-specific dashboard widget is a brick in the wall between you and switching.

## The Hidden Cost: Incident Response Fragmentation

When something breaks at 3 AM, here's what happens in most orgs:

1. PagerDuty wakes you up
2. You open Datadog to check metrics
3. You switch to Loggly to search logs
4. You check Sentry for errors
5. You update StatusPage manually
6. You go back to PagerDuty to escalate

Six tools. Six browser tabs. Six different mental models. During the most stressful moment of your week.

The cognitive overhead of jumping between tools during an incident isn't just annoying - it directly increases Mean Time to Resolution (MTTR). Studies from Atlassian and Google's SRE book both document that context-switching during incidents is one of the primary causes of extended outages.

## What's Actually Changing

Three trends are converging:

### 1. OpenTelemetry Won

The observability data format war is over. OpenTelemetry (OTel) is the standard. It's backed by every major cloud provider, supported by every major vendor, and generates vendor-neutral telemetry data.

This matters because it breaks the vendor lock-in cycle. Instrument once with OTel, send data anywhere. Your choice of backend becomes a deployment decision, not a multi-month migration project.

### 2. Consolidation Is Happening

Teams are tired of managing six tools. The market is responding - Datadog keeps adding features (now covering everything from CI/CD to security), Grafana is building a full stack, and newer platforms are launching as unified solutions from day one.

The appeal is obvious: one UI, one bill, one place to look during an incident.

### 3. Open Source Got Serious

Five years ago, running your own observability stack meant cobbling together Prometheus, Grafana, Elasticsearch, Jaeger, and a prayer. It worked, but it was a full-time job to maintain.

That's changed. Open-source observability platforms now ship as single deployable units - one Docker Compose file, one Helm chart - covering monitoring, logs, traces, status pages, incident management, and on-call out of the box. The operational overhead of self-hosting has dropped dramatically.

## Doing the Math: Build vs. Buy vs. Open Source

Let's model three scenarios for our 50-engineer, 100-microservice team:

### Scenario A: Full SaaS Stack
- Datadog Pro + Logs: ~$8,000/month
- PagerDuty Business: ~$1,500/month
- Atlassian StatusPage: ~$800/month
- Sentry Team: ~$500/month
- Pingdom: ~$300/month
- **Total: ~$11,100/month ($133,200/year)**

### Scenario B: Consolidated SaaS
- One platform covering all of the above: $3,000 - $8,000/month
- **Total: ~$5,500/month ($66,000/year)**

### Scenario C: Self-Hosted Open Source
- Infrastructure (3-node cluster): ~$300 - $600/month
- Engineering time (setup + maintenance): ~4-8 hours/month ongoing
- **Total: ~$450/month ($5,400/year) + eng time**

The math is hard to argue with. Even if you value engineering time at $200/hour, Scenario C costs roughly $24,600/year including maintenance time - saving $108,600 compared to the full SaaS stack.

## What to Actually Do About It

If your observability bill makes you wince:

**Step 1: Audit what you're actually paying.** Pull invoices from every monitoring vendor. Add them up. Most teams are genuinely shocked by the total.

**Step 2: Check your data volumes.** Are you ingesting logs you never query? Storing traces for services nobody monitors? Most teams can cut 30-50% of their observability data volume with basic filtering - without losing visibility.

**Step 3: Evaluate consolidation.** Whether you go SaaS or self-hosted, reducing from six tools to one or two will save money, reduce context-switching, and simplify incident response.

**Step 4: Instrument with OpenTelemetry.** Regardless of your current backend, adopting OTel gives you portability. It's insurance against future price increases and vendor decisions you don't control.

**Step 5: Consider self-hosting.** If your team has Kubernetes experience (and at 50 engineers, it almost certainly does), self-hosting an open-source observability platform is a realistic option. The ecosystem has matured significantly.

## The Uncomfortable Truth

Observability vendors have built incredible products. Datadog's UI is best-in-class. PagerDuty's escalation engine is rock solid. Sentry's error grouping is genuinely impressive.

But paying $100K-$250K per year for the privilege of knowing whether your application is working? For most mid-market teams, that's become difficult to justify - especially when open-source alternatives cover 90% of the functionality at 5% of the cost.

The question isn't whether you need observability. You absolutely do. The question is whether you need to pay a quarter million dollars a year for it.

For a growing number of teams, the answer is no.

---

*Curious what a consolidated, open-source observability stack looks like in practice? [OneUptime](https://oneuptime.com) combines monitoring, status pages, incident management, on-call, logs, traces, and error tracking in a single platform. Open source, free to self-host, with SaaS available for teams who'd rather not manage infrastructure.*
