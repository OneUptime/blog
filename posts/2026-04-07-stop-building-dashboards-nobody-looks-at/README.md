# Stop Building Dashboards Nobody Looks At: A Guide to Actionable Observability

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, SRE, Open Source

Description: Most observability dashboards are digital wallpaper. Here's how to build monitoring that actually drives action - fewer dashboards, better alerts, and observability that earns its cost.

Your team has 47 Grafana dashboards. Nobody's looked at 39 of them since the sprint they were created. The other 8 get opened during incidents, squinted at for 30 seconds, then abandoned while someone runs `kubectl logs` instead.

Sound familiar?

The observability industry has a dirty secret: most monitoring setups generate enormous amounts of data, produce beautiful dashboards, and change absolutely nothing about how teams operate. You're paying per GB ingested for data that exists purely to make quarterly reviews look thorough.

This isn't a tooling problem. It's a design problem. And fixing it doesn't require buying another platform - it requires thinking differently about what observability is for.

## The Dashboard Graveyard Problem

Here's how most teams end up with dashboard sprawl:

1. **Incident happens.** Team scrambles to understand what broke.
2. **Post-mortem action item:** "Create a dashboard to monitor X."
3. **Dashboard gets built.** Everyone feels productive.
4. **Two weeks later.** Nobody opens it. The next incident uses different signals anyway.

The dashboard wasn't the right action item. The right action item was probably an alert, a runbook, or an architectural change. But dashboards feel tangible. They're visible. They satisfy the post-mortem checklist without requiring the harder work of actually improving reliability.

Over time, you accumulate dozens of dashboards that represent good intentions but deliver no value. Worse, they create a false sense of security - "We're monitoring that" becomes the answer to every reliability question, even though monitoring something and acting on it are completely different things.

## What Actionable Observability Actually Looks Like

Actionable observability has one test: **does this signal change someone's behavior?**

If a metric goes up, does someone do something? If a log line appears, does it trigger a response? If a trace shows latency, does anyone investigate?

If the answer is no, you're collecting data for the sake of collecting data.

Here's the framework:

### 1. Start With Actions, Not Metrics

Most teams start with "what can we measure?" and work backward to dashboards. Flip it. Start with "what decisions do we need to make?" and work forward to the signals that inform those decisions.

For example:

- **Decision:** Should we scale this service? → **Signal:** Request queue depth + P99 latency trend
- **Decision:** Is this deploy safe to promote? → **Signal:** Error rate delta between canary and stable
- **Decision:** Are we meeting our SLA? → **Signal:** Error budget burn rate

Each of these needs exactly one or two signals, not a 12-panel dashboard showing CPU, memory, disk, network, GC pauses, thread counts, and connection pool utilization.

### 2. Every Dashboard Panel Needs an Owner and a Response

Try this exercise: walk through every panel on your most-used dashboard and answer two questions:

- **Who looks at this?** (Not "who could" - who actually does, regularly?)
- **What do they do when it's abnormal?**

If you can't answer both, the panel is decoration. Remove it. Yes, really. Fewer panels means less noise, which means the panels that remain actually get attention.

### 3. Alerts Should Be Decisions, Not Notifications

The biggest waste in observability isn't unused dashboards - it's alerts that don't require action. Every alert should answer: **"What should the on-call engineer do right now?"**

If the answer is "look at it and see if it resolves itself," that's not an alert. That's anxiety delivered via PagerDuty.

Good alerts have three properties:

- **Actionable:** There's a specific thing to do when it fires
- **Relevant:** It fires for conditions that actually affect users
- **Rare enough to matter:** If it fires daily, it gets ignored daily

A team with 5 well-tuned alerts will outperform a team with 500 noisy ones every single time.

### 4. Use SLOs as Your Single Source of Truth

Service Level Objectives cut through the noise because they answer the only question that matters: **are users happy?**

Instead of monitoring 50 infrastructure metrics and trying to correlate them during an incident, define what "working" means from the user's perspective:

- 99.9% of API requests complete in under 500ms
- 99.95% of status page checks return healthy
- Error rate stays below 0.1% over any 30-minute window

Now your error budget becomes the single number that determines whether you ship features or fix reliability. One number. One dashboard panel. One decision framework.

### 5. Let AI Handle the Correlation

Here's where modern observability gets interesting. The reason teams build 47 dashboards is because they're trying to pre-compute every possible investigation path. "If X breaks, I'll need to look at Y and Z, so let me put them all on a dashboard just in case."

AI-powered root cause analysis flips this model. Instead of pre-building investigation paths, you let the system correlate signals at incident time:

- Latency spike on the API → AI traces it to a slow database query → identifies the specific migration that caused the table scan
- Error rate increase → AI correlates with a deploy that happened 4 minutes ago → shows which specific endpoint is affected

This isn't science fiction. OpenTelemetry gives you the correlation data (traces linking services, logs tied to trace IDs, metrics with resource attributes). AI models can traverse these connections faster than any human clicking through dashboards.

The result: you need fewer dashboards because the investigation happens dynamically, not through pre-built static views.

## A Practical Approach: The 5-Dashboard Rule

Here's a concrete framework. Limit your team to five dashboards maximum:

1. **SLO Dashboard:** Error budgets for your key services. This is the only dashboard that should be on a TV screen.
2. **Deploy Dashboard:** Shows the last 10 deploys with their error rate impact. Used during and after deploys only.
3. **Incident Dashboard:** Auto-populated during incidents with relevant signals from the affected service. Not pre-built - assembled dynamically from your telemetry.
4. **Cost Dashboard:** How much you're spending on observability, broken down by service. Reviewed monthly.
5. **One Team-Specific Dashboard:** Each team gets one. They choose what goes on it. When they want to add a panel, they have to remove one first.

That's it. Five dashboards. Everything else is an alert, a runbook, or an automated response.

## The Open Source Advantage

One reason dashboard sprawl persists is vendor lock-in. When your observability platform charges per dashboard or per user, creating a new dashboard feels "free" - the cost is already sunk. When you're self-hosting with open source tools, you feel the infrastructure cost directly. That 47th dashboard means more storage, more compute, more data retention.

Open source observability platforms that use OpenTelemetry as their data layer give you a natural pressure valve: you control what data you collect, how long you keep it, and what you do with it. There's no vendor incentive to encourage you to ingest more data than you need.

This isn't about being cheap. It's about being intentional. The best observability setups aren't the ones with the most data - they're the ones where every byte of data has a purpose.

## Getting Started: The Audit

If you're sitting on a pile of dashboards right now, here's your action plan:

1. **Export your dashboard list.** Every single one.
2. **Check access logs.** Which dashboards were opened in the last 30 days? 90 days?
3. **Archive everything untouched for 90 days.** Don't delete - archive. If nobody complains in a month, delete.
4. **For remaining dashboards, apply the owner + response test.** Every panel needs both.
5. **Review your alerts.** How many fired last month? How many resulted in actual action? Kill the rest.
6. **Define three SLOs.** Start with your most critical user journey. Build one dashboard for error budgets. Make it the default.

This process typically eliminates 70-80% of dashboard surface area. What remains is observability that actually drives decisions.

## The Bottom Line

Observability isn't about seeing everything. It's about seeing the right things at the right time and knowing what to do about them.

Stop building dashboards. Start building decision systems. Your on-call engineers - and your observability budget - will thank you.
