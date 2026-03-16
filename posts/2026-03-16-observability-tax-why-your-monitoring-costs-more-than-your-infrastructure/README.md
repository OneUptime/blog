# The Observability Tax: Why Your Monitoring Costs More Than Your Infrastructure

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, Open Source

Description: Engineering teams are spending more on watching their systems than running them. Here's how the observability industry got here, and what you can do about it.

Something wild is happening in infrastructure budgets across the industry: the cost of *watching* your systems now exceeds the cost of *running* them.

Read that again.

For a growing number of mid-market engineering teams - the ones running 50 to 500 microservices, handling real traffic, employing 20 to 200 engineers - the combined spend on Datadog, PagerDuty, StatusPage, Sentry, and whatever log aggregator they're using has quietly surpassed their actual compute and storage costs on AWS, GCP, or Azure.

This isn't a fringe complaint anymore. It's a structural problem.

## The Math Nobody Wants to Do

Let's walk through a realistic scenario. You're a Series B company. 80 engineers. Running about 150 microservices across Kubernetes clusters.

Here's what your observability stack probably looks like:

| Tool | Purpose | Annual Cost |
|------|---------|-------------|
| Datadog (APM + Infrastructure + Logs) | Core monitoring | $180,000 - $350,000 |
| PagerDuty | On-call & incident management | $25,000 - $60,000 |
| Atlassian StatusPage | Public status page | $5,000 - $15,000 |
| Sentry | Error tracking | $15,000 - $40,000 |
| Additional (Pingdom, Uptime Robot, etc.) | Synthetic monitoring | $5,000 - $15,000 |

**Total observability spend: $230,000 - $480,000/year**

Now compare that to your infrastructure. Many companies at this stage run $15,000 to $30,000/month on cloud - that's $180,000 to $360,000/year.

You're paying more to observe your infrastructure than to run it.

## How Did We Get Here?

Three forces converged:

### 1. The Microservices Explosion

Monoliths were cheap to monitor. You had one application, one set of logs, one APM trace. Microservices multiplied every data point by the number of services. Your observability data grew exponentially while your actual compute scaled linearly.

Datadog's pricing model was built for this: per-host, per-container, per-million-spans, per-GB-of-logs. Every time you deploy a new service, your monitoring bill grows. Every time you scale horizontally for a traffic spike, your monitoring bill grows. The meter never stops running.

### 2. The Tool Sprawl Problem

Nobody set out to use seven monitoring tools. It happened gradually:

- "We need APM" → Datadog
- "We need error tracking" → Sentry
- "We need a status page" → StatusPage.io
- "We need on-call scheduling" → PagerDuty
- "We need uptime monitoring" → Pingdom
- "We need log management" → Maybe Datadog Logs, maybe something else

Each tool solved one problem well. But now you have six vendors, six contracts, six billing models, six dashboards, and six teams of account executives trying to upsell you.

And here's the kicker: most of these tools could be one platform. Status pages, incident management, on-call, monitoring, logs, APM, and error tracking are deeply related workflows. Splitting them across vendors doesn't just cost more money - it costs your team cognitive overhead every single day.

### 3. Usage-Based Pricing Without Usage Controls

The observability industry borrowed the cloud's usage-based pricing model but forgot the most important part: giving customers meaningful controls over what they consume.

When you provision an EC2 instance, you choose the size. When you store data in S3, you set lifecycle policies. You have granular control over your spend.

With most observability vendors? You instrument your code, and whatever data flows out gets metered. Want to reduce your Datadog bill? You have to go back into your codebase and remove instrumentation - which means flying blind on the services you stop monitoring.

It's a trap. Instrument everything and go broke, or instrument selectively and miss the incident that takes you down at 3 AM.

## The Real Cost Isn't Just the Invoice

The invoice is painful, sure. But the real cost is subtler:

**Engineering time spent managing tools.** Someone on your team is spending 10-20% of their time configuring dashboards, managing alert rules across multiple platforms, debugging why PagerDuty didn't fire when Datadog detected an anomaly, and figuring out why the status page didn't auto-update during the last incident.

**Context switching between platforms.** During an incident, your team is bouncing between Datadog for metrics, Sentry for errors, PagerDuty for coordination, and StatusPage for communication. Each context switch costs time. During an outage, time is money - sometimes a lot of money.

**Vendor lock-in decisions made under pressure.** When you're deep into one vendor's ecosystem, switching feels impossible. So you accept the 30% price increase at renewal because the migration cost feels worse. The vendors know this. That's why they make it so easy to get in and so hard to get out.

## What the Industry Doesn't Want You to Know

Here's something the major observability vendors won't tell you: **the core technology behind monitoring, APM, log aggregation, and incident management is not that complex anymore.**

OpenTelemetry has standardized instrumentation. ClickHouse and similar columnar databases have made time-series data storage fast and cheap. The algorithms for anomaly detection, log parsing, and trace analysis are well-understood.

What you're paying for with a $300K Datadog contract is mostly:
- A polished UI (which matters, but not $300K worth)
- Integration between features (which should be table stakes)
- The brand name in your SOC 2 audit (which is increasingly irrelevant as open-source alternatives mature)
- Sales and marketing (you're literally paying for the sales rep who sold you the contract)

The margin structure of these companies tells the story. Datadog's gross margins hover around 80%. For every dollar you pay, roughly 20 cents goes to actually delivering the service. The rest is sales, marketing, R&D on features you may never use, and profit.

## Breaking Free

You have three realistic options:

### Option 1: Consolidate Vendors

If you're using four or five tools, see if you can get down to one or two. A single platform that handles monitoring, incident management, status pages, on-call, logs, APM, and error tracking will almost always cost less than the sum of individual best-of-breed tools - and your team will be more effective with everything in one place.

### Option 2: Go Open Source

The open-source observability ecosystem is mature enough for production use. Tools like OneUptime, Prometheus, Grafana, and Jaeger can replace commercial alternatives. Self-hosting means your monitoring costs scale with your infrastructure costs (compute and storage), not with arbitrary per-host or per-span pricing.

The trade-off is operational overhead. You need someone to maintain the infrastructure. But for many teams, this cost is a fraction of the commercial alternative - and you get full control over your data and your costs.

### Option 3: Hybrid Approach

Use open-source tools for the bulk of your observability (where data volume drives cost), and keep commercial tools only where the proprietary value is genuinely worth it. Many teams find that open-source handles 80% of their needs at 20% of the cost.

## The Consolidation Wave Is Coming

Every major industry goes through a consolidation phase where bloated pricing meets capable alternatives and the incumbents lose pricing power.

It happened in CRM (Salesforce alternatives emerged), in project management (Jira alternatives proliferated), and in communication (Slack alternatives appeared). It's happening right now in observability.

The companies that figure this out early - that consolidate their observability stack, regain control of their costs, and stop paying the observability tax - will have a meaningful competitive advantage. Not just in dollars saved, but in engineering velocity gained.

Your monitoring should help you build better software. It shouldn't cost more than the software itself.

## What to Do Monday Morning

1. **Run the math.** Add up every observability-related invoice from the last 12 months. Compare it to your infrastructure spend. If you're over 50%, you have a problem.

2. **Audit tool overlap.** List every monitoring, alerting, incident management, and status page tool you use. Identify overlapping capabilities. You'll find them.

3. **Evaluate consolidation options.** Look at platforms that combine multiple observability functions. Open-source options like [OneUptime](https://oneuptime.com) bundle monitoring, status pages, incident management, on-call, logs, APM, and error tracking into one platform - and you can self-host it for free.

4. **Set a target.** Your observability spend should be 15-25% of your infrastructure spend, not 100%+ of it. Set that as a goal for the next 12 months.

5. **Talk to your CFO.** Seriously. Show them the numbers. This is one of the rare cases where the CFO and the engineering team are aligned - reducing observability costs makes everyone happy.

The observability tax is real. But it's not inevitable. The tools exist to cut it dramatically. The question is whether you'll do it now, or wait until the next budget review forces the conversation.
