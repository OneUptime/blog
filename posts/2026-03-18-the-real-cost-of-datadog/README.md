# The Real Cost of Datadog: What Your Team Is Actually Paying in 2026

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Comparison, DevOps

Description: A transparent breakdown of what Datadog actually costs when you factor in per-host fees, custom metrics, log ingestion, and the hidden charges that show up after the POC.

Every few weeks, a post hits the front page of Hacker News or r/devops with the same energy: "Our Datadog bill just hit $X and we had no idea." The numbers keep getting bigger. $50K/month for a 200-person engineering org. $180K/year for what started as "just APM and logs." Six-figure invoices that make CFOs ask uncomfortable questions.

This isn't a hit piece. Datadog is a genuinely good product - the UI is polished, the integrations are deep, and there's a reason they've grown to a $40B+ company. But their pricing model has a structural problem that every engineering team should understand before signing (or renewing) a contract.

Let's break it down honestly.

## The Pricing Model Nobody Reads

Datadog charges per unit of everything. That sounds fair until you realize how many units exist:

- **Infrastructure monitoring:** Per host, per month. Starting at $15/host for basic, $23 for Pro, $33 for Enterprise.
- **APM:** Per host, per month. $31 for APM, $35 for APM Pro, $40 for APM Enterprise. Yes, on top of infrastructure.
- **Log Management:** Per GB ingested, per month. $0.10/GB for ingestion. But then $0.06/GB for 15-day retention. Want 30 days? That's more. Want to actually search those logs? That's Log Analytics at $0.05 per million events scanned.
- **Custom Metrics:** The silent killer. First 100 are free. After that, $0.05 per custom metric per host. If your app emits 500 custom metrics across 50 hosts, do the math.
- **Synthetics:** $5/10K API test runs. $12/1K browser test runs.
- **RUM:** $1.50 per 1K sessions.
- **Database Monitoring:** $70/host/month. On top of everything else.
- **DORA Metrics:** $20/month per committer.
- **Cloud Cost Management:** 0.5% of your monitored cloud spend. If you spend $1M/month on AWS, that's $5K/month just to see where it goes.

None of these prices are hidden - they're on the website. The problem is that they compound in ways that are genuinely hard to predict.

## Why the Bill Surprises You

There are three dynamics that make Datadog bills grow faster than expected:

### 1. Usage Scales Non-Linearly With Headcount

When you add engineers, you add services. When you add services, you add hosts, containers, and custom metrics. A team of 10 might run 15 services on 30 hosts. A team of 50 runs 80 services on 200+ hosts with 3x the log volume. Your Datadog bill doesn't grow linearly with team size - it accelerates.

### 2. The POC-to-Production Gap

During a POC, you instrument one service. Maybe two. The bill is reasonable. You sign a contract based on that. Then you roll out to production and suddenly every service is sending traces, every container is a host, and your custom metric count has exploded. The "we tested this and it was fine" argument doesn't hold when real workloads hit.

### 3. The Retention Trap

You start with 15-day log retention because it's cheap. Then an incident happens and you need logs from three weeks ago. So you bump to 30 days. Then compliance asks for 90 days. Each bump is a multiplier on your entire log volume, retroactively.

## A Realistic Mid-Market Scenario

Let's model what a 100-engineer company actually pays. This isn't worst-case - it's median:

| Component | Units | Unit Cost | Monthly |
|-----------|-------|-----------|---------|
| Infrastructure (Pro) | 150 hosts | $23/host | $3,450 |
| APM (Pro) | 100 hosts | $35/host | $3,500 |
| Logs (ingestion) | 500 GB/day | $0.10/GB | $1,500 |
| Logs (retention, 30d) | 500 GB/day | $0.06/GB × 30 | $900 |
| Custom Metrics | 2,000 metrics × 150 hosts | $0.05/metric/host | $15,000 |
| Synthetics (API) | 500K runs | $5/10K | $250 |
| RUM | 200K sessions | $1.50/1K | $300 |
| Database Monitoring | 20 hosts | $70/host | $1,400 |

**Monthly total: ~$26,300**
**Annual total: ~$315,600**

And that's before overages, before the next team onboards, before someone turns on profiling or network monitoring. Real-world bills at this scale routinely hit $400K-$500K/year.

## What Are the Alternatives?

There are roughly three paths companies take when the bill gets painful:

### 1. Build Your Own Stack

Prometheus + Grafana + Loki + Tempo + Alertmanager. It works. It's free. But "free" comes with 1-2 full-time engineers maintaining it. At $200K/engineer fully loaded, your "free" stack costs $200-400K/year in human time. You also lose unified correlation - jumping between tools when debugging an incident at 3am is not fun.

### 2. Use Another Commercial Vendor

New Relic moved to usage-based pricing (per GB ingested). Elastic has a similar model. Grafana Cloud is consumption-based. Each has tradeoffs. The common thread is that they're all cheaper than Datadog for most workloads, but they each have gaps.

### 3. Self-Host an Open Source Platform

This is where the market is moving. Platforms like OneUptime, SigNoz, and HyperDX offer the unified experience of Datadog (metrics + logs + traces + status pages + incident management) but you run it on your own infrastructure. The cost is your compute - typically 80-90% less than SaaS pricing for the same workload. OneUptime, for example, is fully open source (not open-core) and includes monitoring, status pages, incident management, on-call scheduling, logs, APM, and error tracking in a single platform. You can also use it as a SaaS with usage-based pricing if you don't want to self-host.

The tradeoff is operational overhead. But if you're already running Kubernetes (and at 100 engineers, you probably are), adding another deployment isn't the burden it once was.

## The Real Question

The real question isn't "is Datadog too expensive?" - it's "what are you getting for the money that you can't get elsewhere?"

Five years ago, the answer was: a lot. The unified platform, the integrations, the polish. Nobody else was close.

In 2026, that gap has closed dramatically. Open source observability has matured. The "you need Datadog for enterprise-grade monitoring" argument doesn't hold the way it used to.

If your current bill is under $50K/year and you're happy with the product, Datadog is probably fine. The per-unit model works at small scale.

If you're north of $100K/year and growing, it's worth spending a week evaluating alternatives. Not because Datadog is bad - but because you might be paying a premium for a gap that no longer exists.

## Do the Math

Pull your last three Datadog invoices. Break down the cost by component. Ask yourself:

1. Which of these components could be replaced by an open source tool without losing capability?
2. What's the actual cost of switching (migration time, learning curve, integration work)?
3. What would your bill look like in 12 months at current growth rates?

If the answer to #3 makes you uncomfortable, start looking now. Don't wait for the invoice that forces the conversation.

---

*OneUptime is an open source observability platform that replaces multiple monitoring tools with a single, unified solution. Free to self-host, or available as SaaS with usage-based pricing. [Check it out on GitHub](https://github.com/OneUptime/oneuptime).*
