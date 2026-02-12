# AI Coding Agents Will 10x Your Datadog Bill

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: AI, Observability, Datadog, Cost Optimization, DevOps, Open Source

Description: AI coding agents are generating services faster than ever. Your observability bill is about to explode. Here's the math and what to do about it.

Every engineering team is adopting AI coding agents. Claude Code, Cursor, Copilot, Devin, Windsurf. The promise is simple: ship faster. And it works. Engineers are building services at 3-5x the pace they were a year ago.

Nobody is talking about what happens next.

## The math nobody wants to do

Your observability costs scale with three things: hosts, services, and telemetry volume. AI coding agents directly increase all three.

Let's take a real scenario. A 40-person engineering team running Datadog. Pre-AI, they manage 80 services across 150 hosts. Their Datadog bill looks like this:

| Line item | Monthly cost |
|-----------|-------------|
| Infrastructure (150 hosts × $23) | $3,450 |
| APM (150 hosts × $40) | $6,000 |
| Log Management (50GB/day × $0.10 ingestion) | $150 |
| Log Retention (50GB/day × 15 days × $1.70/GB) | $1,275 |
| Custom Metrics (5,000 metrics × $0.05) | $250 |
| Synthetics (200 tests × $12) | $2,400 |
| **Total** | **$13,525/mo ($162,300/yr)** |

Now those same 40 engineers start using AI coding agents. Within 6 months, their service count doubles. They're not hiring more people. They're just shipping faster. Each new service needs monitoring, logging, tracing. The AI doesn't care about your Datadog budget.

Here's what happens:

| Line item | New monthly cost | Change |
|-----------|-----------------|--------|
| Infrastructure (280 hosts × $23) | $6,440 | +87% |
| APM (280 hosts × $40) | $11,200 | +87% |
| Log Management (120GB/day × $0.10) | $360 | +140% |
| Log Retention (120GB/day × 15 days × $1.70/GB) | $3,060 | +140% |
| Custom Metrics (12,000 metrics × $0.05) | $600 | +140% |
| Synthetics (400 tests × $12) | $4,800 | +100% |
| **Total** | **$26,460/mo ($317,520/yr)** | **+96%** |

Your Datadog bill nearly doubled. And your headcount didn't change.

## This is not hypothetical

Look at what's happening right now:

**Service proliferation is real.** GitHub's 2025 Octoverse report showed a 40% increase in new repository creation year-over-year, driven almost entirely by AI-assisted development. More repos means more services. More services means more telemetry.

**AI-generated code is verbose.** AI agents don't optimize for minimalism. They generate standard patterns with full logging, tracing, and error handling baked in. That's actually a good thing for reliability. But it means every AI-generated service produces significantly more telemetry data than a hand-rolled equivalent.

**The feedback loop accelerates.** AI agents make it trivially easy to spin up new microservices instead of adding to existing ones. "Just create a new service for that" becomes the default answer when the cost of creation drops to near zero.

## The per-GB trap

Here's where it gets really painful. Most commercial observability vendors charge per GB of telemetry data, per host, or both. Their pricing was designed for a world where humans wrote code at human speed.

That world is over.

At Datadog's pricing ($0.10/GB ingestion for logs, plus retention costs that can run $1.70/GB), a team generating 200GB/day of logs is paying over $100,000/year just for log management. When AI doubles your service count and each service is more verbose, you can easily hit 500GB/day. That's $250,000/year. For logs alone.

New Relic's "free tier" gives you 100GB/month. A single AI-generated microservice with standard OpenTelemetry instrumentation can generate 10GB/month by itself. You'll burn through the free tier with 10 services. After that, it's $0.35/GB.

## What actually scales

There are really only two approaches that survive the AI coding agent era:

**1. Open source with self-hosted infrastructure**

If you run your own observability stack, your costs scale with compute, not with telemetry volume. There's no per-GB pricing. No per-host licensing. You pay for the servers, and you control the retention policies.

The trade-off used to be operational complexity. You needed a dedicated team to run Prometheus, Grafana, Elasticsearch, PagerDuty, and six other tools.

That trade-off has changed. Platforms like [OneUptime](https://oneuptime.com) consolidate monitoring, status pages, incidents, on-call, logs, traces, metrics, and error tracking into a single open-source platform. Apache 2.0 licensed. Self-host it, or use the cloud version at $0.10/GB with no per-host fees.

**2. Aggressive sampling and filtering**

If you stay on a commercial vendor, you need to get surgical about what telemetry you actually collect. OpenTelemetry's tail-based sampling can reduce trace volume by 90% while keeping every error trace. The OpenTelemetry Collector's filter and transform processors can drop noise before it ever hits your vendor.

But this is a band-aid. You're fighting against the fundamental trajectory of AI-assisted development.

## The real problem is the pricing model

Here's the uncomfortable truth: per-GB and per-host pricing for observability is a relic of the pre-AI era. It worked when teams added one or two services per quarter. It breaks when teams add one or two services per week.

The observability industry is worth $30 billion. Most of that value comes from charging teams based on how much they ship. AI coding agents are about to blow the roof off how much teams ship.

If your observability bill already makes your CFO nervous, you have maybe 12 months before AI-assisted development makes it genuinely untenable.

## What to do right now

**1. Audit your current spend.** Add up every monitoring, logging, alerting, and incident management tool. The total will surprise you. We wrote about this in detail in [Your Monitoring Stack is a $500K/Year Mistake](/blog/your-monitoring-stack-is-a-500k-mistake).

**2. Adopt OpenTelemetry today.** Vendor-neutral instrumentation means you can switch backends without re-instrumenting your code. This is table stakes. If you're still using proprietary agents, you're locked in.

**3. Evaluate open-source alternatives.** OneUptime replaces Datadog, PagerDuty, StatusPage, Pingdom, and Sentry in one platform. Open source. $0.10/GB if you use the cloud version. No per-host fees. [Try it](https://oneuptime.com).

**4. Set telemetry budgets per team.** Just like you set cloud spend budgets, set observability budgets. Make teams accountable for the telemetry they generate. This forces good hygiene regardless of which vendor you use.

**5. Plan for 3x growth.** Whatever your current telemetry volume is, assume AI agents will triple it within 18 months. If your current vendor can't handle that without breaking the bank, start the migration now.

## The bottom line

AI coding agents are the best thing to happen to engineering productivity in a decade. They're also about to create the biggest observability cost crisis the industry has ever seen.

The teams that figure out their observability strategy now, before the bill explodes, will have a massive advantage. Everyone else will be scrambling to explain a 300% cost increase to their board while trying to migrate off Datadog under pressure.

Don't be the second group.
