# Why Your Observability Bill Is Higher Than Your Cloud Bill

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Open Source, DevOps, Cost Optimization

Description: For many engineering teams, observability tools now cost more than the infrastructure they monitor. Here is why it happened and how to fix it.

Something strange happened while nobody was looking: the tools you use to watch your servers started costing more than the servers themselves.

If you run a mid-size engineering team (50-200 engineers), there is a decent chance your combined Datadog, PagerDuty, and StatusPage bill exceeds your AWS or GCP compute spend. Not by a little. Sometimes by 2-3x.

This is not normal. And it is not sustainable.

## The Math That Should Make You Uncomfortable

Let us walk through a real scenario. A team of 100 engineers running a microservices architecture:

**Datadog:**
- 100 APM hosts at ~$31/host/month = $3,100/month
- Custom metrics (500K+) at ~$5/100 metrics = $2,500/month  
- Log management at 100GB/day at ~$1.70/GB = $5,100/month
- Synthetics, RUM, CI Visibility, etc. = $2,000/month
- **Subtotal: ~$12,700/month**

**PagerDuty:**
- 30 on-call engineers at $29/user/month = $870/month
- Business plan for analytics = add $500/month
- **Subtotal: ~$1,370/month**

**StatusPage (Atlassian):**
- Business plan = $399/month
- **Subtotal: ~$399/month**

**Total observability spend: ~$14,470/month ($173,640/year)**

Now compare that to a typical cloud bill for the same team. A hundred or so EC2 instances, some managed databases, S3, networking. You are probably looking at $8,000-15,000/month for compute alone.

Your monitoring costs as much as (or more than) the thing being monitored.

## How Did We Get Here?

Three forces created this problem.

### 1. Vendor Lock-In by Design

Observability vendors designed their pricing around data volume. The more you instrument (which they encourage), the more you pay. It is a flywheel that only spins in one direction.

You start with basic monitoring. Then you add APM. Then logs. Then traces. Then synthetics. Then RUM. Each one reasonable on its own. Together, they are a mortgage payment.

### 2. Tool Sprawl

The average engineering team uses 4-7 different observability tools. Each one was "the best" at something:

- Datadog for metrics and APM
- PagerDuty for on-call
- StatusPage for public status
- Sentry for error tracking
- Pingdom for uptime
- ELK or Splunk for logs
- Grafana for dashboards

Every tool has its own contract, its own user seats, its own data pipeline. The integration tax alone is brutal.

### 3. The Enterprise Pricing Trap

Once you are past your proof-of-concept, these vendors know you are not leaving. Migration costs are enormous. So prices go up. Every. Single. Year.

Datadog's net revenue retention rate is consistently above 120%. That means existing customers pay 20%+ more each year. That is not growth from love. That is growth from lock-in.

## What Actually Works

Here is the uncomfortable truth: you do not need seven tools. You need one platform that does it all.

### Consolidate Ruthlessly

The single biggest cost reduction comes from consolidation. When one platform handles monitoring, APM, logs, status pages, incident management, and on-call, you eliminate:

- Per-tool seat costs (huge for teams over 20)
- Integration maintenance
- Context switching between dashboards
- Duplicate data pipelines

Teams that consolidate typically see 60-80% cost reduction. Not because the replacement is cheap, but because they stop paying for overlap.

### Self-Host If You Can

If your team has even basic Kubernetes or Docker experience, self-hosting your observability stack changes the economics completely. You pay for compute (which you already have) instead of per-host, per-GB, per-user pricing.

The operational overhead of running a modern self-hosted observability platform is far lower than it was five years ago. Helm charts, Docker Compose, and managed Kubernetes have made deployment a solved problem.

### Actually Calculate Your Cost Per Engineer

Most teams have never divided their total observability spend by engineer count. Do it. If the number is above $100/engineer/month, you are overpaying. If it is above $200, you are getting robbed.

For context: a fully-featured open-source observability platform running on your own infrastructure costs roughly $15-30/engineer/month in compute. That is not a typo.

## The Open Source Alternative

Full disclosure: OneUptime is an open-source observability platform that replaces Datadog, PagerDuty, StatusPage, and Sentry in a single tool. So yes, we have skin in this game.

But the math does not lie. Here is what the same 100-engineer team looks like on OneUptime:

**Self-hosted:** 
- 3-5 servers for the platform = ~$500-1,000/month in compute
- Zero per-seat costs
- Zero per-GB log costs  
- Zero per-host APM costs
- **Total: ~$500-1,000/month**

**Cloud (oneuptime.com):**
- Growth plan with unlimited users
- **Total: significantly less than $14,470/month**

That is not a marginal improvement. That is a category shift.

## The Real Question

The question is not "should we switch observability tools?" The question is: "Can we justify spending more on watching our infrastructure than running it?"

For a growing startup burning cash, that $173K/year in observability spend is 1-2 engineering salaries. For a bootstrapped company, it might be the difference between runway and shutdown.

Your observability should not cost more than your cloud. If it does, something is broken. And it is not your infrastructure.

---

*OneUptime is fully open source at [github.com/OneUptime/oneuptime](https://github.com/OneUptime/oneuptime). Monitor, debug, and fix your applications - all in one platform. Free to self-host, always.*
