# The Observability Tax: How Your Monitoring Costs Compound Every Quarter

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Open Source

Description: Your observability bill is growing faster than your infrastructure. Here's why monitoring costs compound, what drives the explosion, and how engineering teams are fighting back.

There's a conversation happening in every engineering org right now, and it usually starts the same way: "Why is our Datadog bill higher than our AWS bill?"

It's not a joke. For a growing number of companies, observability costs have become the second or third largest line item in their cloud budget. And unlike compute or storage, these costs don't scale linearly with your infrastructure - they compound.

## The Compounding Problem

Here's how monitoring costs sneak up on you:

**Quarter 1:** You instrument your core services. 50 hosts, basic APM, some dashboards. The bill is reasonable. You sign an annual contract because the per-unit pricing looks good at committed volume.

**Quarter 2:** Your team ships three new microservices. Each one generates metrics, traces, and logs. Your data volume jumps 40%, but your service count only grew 15%. Nobody notices because you're within your committed tier - barely.

**Quarter 3:** You add custom metrics for a critical launch. The SRE team builds detailed dashboards. An incident post-mortem recommends "more observability." Data volume doubles. You blow past your committed tier. Overage charges hit.

**Quarter 4:** Finance asks why the monitoring bill grew 3x. Engineering says they need every byte of that data. The vendor offers a "better" contract - at 2x your original commitment. You sign it because migrating seems impossible.

This cycle repeats. Every year. And it accelerates.

## Why Observability Costs Don't Behave Like Other Infrastructure

Compute scales roughly with traffic. Storage scales with data retention. But observability scales with **complexity** - and complexity grows faster than any single metric.

Here's what actually drives the bill:

### 1. Cardinality Explosion

Every new label, tag, or dimension on a metric multiplies the number of unique time series your system tracks. Add a `customer_id` label to a metric across 100 endpoints, and you just went from 100 time series to 100 × N (where N is your customer count). Vendors charge per unique time series. This is where bills explode.

### 2. The Trace Tax

Distributed tracing is expensive by nature. A single user request hitting 8 microservices generates 8+ spans, each with attributes. At 1,000 requests per second, that's 8,000+ spans per second, 691 million spans per day. Most vendors charge per ingested or indexed span.

### 3. Log Verbosity Drift

Logs are the silent budget killer. Developers add debug logging during incidents and forget to remove it. A single noisy service can generate more log data than your entire production fleet combined. And log ingestion pricing is per GB.

### 4. Tool Sprawl Overhead

This is the hidden cost nobody talks about. Most mid-size teams run 4-6 separate monitoring tools:

- **Infrastructure monitoring** (Datadog, New Relic)
- **APM** (Datadog, Dynatrace)
- **Log management** (Splunk, Elastic)
- **Status pages** (Atlassian Statuspage)
- **Incident management** (PagerDuty, Incident.io)
- **Error tracking** (Sentry, Bugsnag)
- **Uptime monitoring** (Pingdom, Better Stack)

Each tool has its own pricing model, its own data pipeline, its own overhead. The *integration tax* - time spent connecting, deduplicating, and correlating across tools - adds engineering hours that never show up on the bill but cost real money.

## The Numbers Nobody Wants to Publish

Let's be specific. Here's what a 50-engineer company typically pays across their monitoring stack:

| Tool | Monthly Cost |
|------|-------------|
| APM + Infrastructure | $8,000–15,000 |
| Log Management | $3,000–8,000 |
| Status Page | $400–800 |
| Incident Management | $500–2,000 |
| Error Tracking | $300–1,000 |
| Uptime Monitoring | $200–500 |
| **Total** | **$12,400–27,300/mo** |

That's $150K–330K per year on monitoring. For a 50-person team. And these numbers assume you're staying within committed tiers. Overages can easily double the bill.

Compare that to what the same company spends on compute: typically $15K–40K/month for a mid-size SaaS. Your monitoring bill is approaching or exceeding your actual infrastructure cost.

## What Actually Works: Reducing the Tax

After talking to dozens of engineering teams about this, the approaches that actually reduce costs fall into a few buckets:

### Control Cardinality at the Source

The single highest-impact thing you can do: audit your metric labels. Remove high-cardinality labels that aren't used in alerts or dashboards. A common pattern is instrumenting with `user_id` or `request_id` as metric labels - that's a trace attribute, not a metric dimension. Fixing this alone can cut metric costs 60-80%.

### Set Log Budgets Per Service

Give each service team a log ingestion budget. Make log volume visible per-service in your internal dashboards. When teams can see that their service generates 40% of total log volume, they fix it. Sampling and log levels aren't just technical decisions - they're cost decisions.

### Sample Traces Intelligently

You don't need 100% of traces. Head-based sampling at 10% captures enough for performance analysis. Tail-based sampling captures 100% of error traces and slow requests - the ones you actually investigate. The combination reduces trace volume by 80-90% while keeping diagnostic value.

### Consolidate Tools

This is the big one. Every tool you eliminate removes:
- A vendor bill
- An integration to maintain
- A context switch during incidents
- A separate authentication/authorization system
- A separate data pipeline

Going from 6 tools to 1-2 isn't just cheaper - it's operationally faster. When your logs, traces, metrics, status page, incident management, and alerting live in one place, correlation is instant. You don't alt-tab between four dashboards during an outage.

## The Open Source Path

There's a reason open source observability is growing fast. Self-hosting your monitoring stack means:

- **No per-host, per-GB, or per-span pricing.** Your cost is infrastructure (compute + storage), which scales predictably and is under your control.
- **No vendor lock-in.** Your data stays in your infrastructure. You're not held hostage by annual contracts.
- **Full control over retention.** Keep 90 days of logs instead of 15 because *you* decide, not your vendor's pricing tier.

The tradeoff is operational overhead - you need to run and maintain the stack. But for teams already running Kubernetes, the incremental operational cost of self-hosting monitoring is significantly less than the vendor bill it replaces.

Platforms like OneUptime combine monitoring, APM, logs, status pages, incident management, on-call, and error tracking into a single open-source platform. Self-host it on your own infrastructure and your observability cost becomes a fixed infrastructure cost - not a compounding vendor bill that grows every quarter.

## The Decision Framework

Here's a simple way to think about it:

**Stay with your current vendor if:**
- Your monitoring bill is less than 5% of your total cloud spend
- Your team is under 20 engineers
- You're not hitting cardinality or ingestion limits

**Actively evaluate alternatives if:**
- Monitoring costs are growing faster than your infrastructure
- You're running 4+ separate monitoring tools
- You've been surprised by an overage charge
- Your vendor contract renewal came with a significant price increase
- You're spending engineering time correlating data across tools

**Consider self-hosting if:**
- You already run Kubernetes
- Your team has SRE/platform engineering capacity
- Data sovereignty or compliance requires it
- Your monitoring bill exceeds $10K/month

## The Trend Line

Observability costs will keep compounding as long as the industry's pricing model ties cost to data volume in an era where data volume grows exponentially. 

The companies that get ahead of this aren't the ones negotiating better contracts with their existing vendors. They're the ones rethinking the architecture: consolidating tools, controlling cardinality, sampling intelligently, and increasingly, owning their observability stack.

Your monitoring should help you move faster, not drain your budget. If your observability bill makes you wince every quarter, it's time to ask whether you're paying for insight - or paying an observability tax.
