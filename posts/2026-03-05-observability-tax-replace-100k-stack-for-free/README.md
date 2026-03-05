# The Observability Tax: Replace Your $100K Monitoring Stack for $0

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Open Source, Monitoring, DevOps, Comparison

Description: Most engineering teams spend $50K-$200K/year on observability tools they could replace with open-source alternatives. Here's exactly how.

Let's talk about the elephant in every engineering budget meeting: your observability bill.

If you're running a mid-size SaaS product - say 50-200 engineers, a few hundred services - you're probably paying somewhere between $50K and $200K per year on monitoring and observability tools. Some of you are paying a lot more.

That number keeps going up. And it's going up faster than your revenue.

## The Typical $100K Stack

Here's what a "standard" observability stack looks like in 2026 for a company with ~100 engineers:

| Tool | What It Does | Annual Cost |
|------|-------------|-------------|
| Datadog | APM, infrastructure monitoring, logs | $40,000 - $80,000 |
| PagerDuty | On-call scheduling, incident alerts | $10,000 - $25,000 |
| StatusPage (Atlassian) | Public status pages | $5,000 - $15,000 |
| Sentry | Error tracking | $3,000 - $10,000 |
| Pingdom / Better Stack | Uptime monitoring | $2,000 - $5,000 |
| Incident.io or Rootly | Incident management | $5,000 - $15,000 |
| **Total** | | **$65,000 - $150,000** |

Those numbers aren't made up. They come from conversations with hundreds of engineering teams over the past two years.

And that's before Datadog's latest pricing "adjustment." If you've renewed a Datadog contract recently, you know exactly what I'm talking about.

## Why Your Observability Bill Keeps Growing

Three forces are pushing your bill higher every quarter:

### 1. Per-Host and Per-GB Pricing

Most observability vendors charge per host, per container, per GB ingested, or per span. As your infrastructure grows, your bill grows linearly - or worse.

Scaled your Kubernetes cluster from 50 to 200 pods? Your monitoring bill just 4x'd, even though you might be serving the same traffic.

### 2. Tool Sprawl

You didn't plan for six observability tools. But it happened organically:

- Engineering picked Datadog for APM
- SRE team added PagerDuty for on-call
- Product wanted a status page, so someone set up StatusPage
- Frontend team needed error tracking, hello Sentry
- An incident happened, someone bought Incident.io

Each one made sense individually. Together, they're a mess. Different logins, different data models, different alert formats, no correlation between them.

### 3. Vendor Lock-In By Design

Every observability vendor wants to be your "platform." They integrate just enough to make migration painful, but never enough to actually replace their competitors. So you keep all of them, and the bills keep stacking.

## The Open-Source Alternative

Here's the uncomfortable truth the observability vendors don't want you to know: every single capability in that $100K stack is available as open-source software. Not "sort of" available. Fully available. Production-ready.

Let me map it out:

| Paid Tool | Open-Source Replacement | Maturity |
|-----------|----------------------|----------|
| Datadog APM | OpenTelemetry + Jaeger/Tempo | Battle-tested at massive scale |
| Datadog Metrics | Prometheus + Grafana | Industry standard |
| Datadog Logs | OpenSearch / Loki | Production-proven |
| PagerDuty | OneUptime On-Call | Full-featured, routing + escalation |
| StatusPage.io | OneUptime Status Pages | Custom domains, subscribers, groups |
| Sentry | OneUptime Error Tracking | Sourcemaps, stack traces, grouping |
| Pingdom | OneUptime Monitoring | HTTP, TCP, UDP, port, SSL checks |
| Incident.io | OneUptime Incidents | Timelines, severity, state machine |

The question isn't whether open-source alternatives exist. The question is whether you can run them.

## A Realistic Migration Plan

Let's be honest about this. You can't rip out six tools on a Friday afternoon. Here's how to do it over 8-12 weeks without breaking anything.

### Week 1-2: Consolidate the Easy Wins

Start with the tools that are easiest to replace and most overpriced relative to their complexity:

**Status Pages + Uptime Monitoring + Incident Management**

These three are pure SaaS plays with no complex data migration. You can run them in parallel with zero risk.

Deploy OneUptime (self-hosted or cloud) and set up:
- Your status page (takes 20 minutes, including custom domain)
- Uptime monitors for your critical endpoints
- Incident management workflow

Run both old and new tools simultaneously for two weeks. Compare. When you trust the new setup, flip the DNS for your status page and cancel StatusPage.io, Pingdom, and Incident.io.

**Savings so far: $12,000 - $35,000/year**

### Week 3-4: On-Call and Alerting

PagerDuty's core value proposition is "it wakes the right person up at 3am." That's genuinely important. But it's not complex enough to justify $10K-$25K/year.

Set up on-call schedules in OneUptime:
- Define your rotation (weekly, daily, follow-the-sun)
- Set up escalation policies
- Configure notification rules (phone, SMS, email, Slack)
- Test it. Call yourself at 3am. Make sure it works.

Run parallel to PagerDuty for one full on-call rotation. Then switch.

**Savings so far: $22,000 - $60,000/year**

### Week 5-6: Error Tracking

Sentry is good software. But error tracking is a well-understood problem, and paying per-event gets expensive fast.

Switch your error reporting to OneUptime:
- Update your SDK integration (OpenTelemetry-compatible)
- Verify sourcemaps work for frontend errors
- Check grouping and deduplication
- Set up alert rules for new error types

**Savings so far: $25,000 - $70,000/year**

### Week 7-12: The Big One - APM and Logs

This is where most of your Datadog bill lives, and it's the hardest to migrate. Don't rush it.

**Step 1: Instrument with OpenTelemetry**

If you're already using OpenTelemetry, you're halfway there - just add another exporter. If you're using Datadog's proprietary agents, start by adding OpenTelemetry alongside them.

```yaml
# otel-collector-config.yaml
exporters:
  otlp/oneuptime:
    endpoint: "your-oneuptime-instance:4317"
    tls:
      insecure: false
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

Run both simultaneously. Compare trace data. Make sure you're capturing everything.

**Step 2: Migrate Dashboards**

Your Datadog dashboards represent institutional knowledge. Don't lose them. Recreate the important ones (you'll find that half of them are unused - this is a good time to clean house).

**Step 3: Shift Log Ingestion**

Route logs to your new stack. OpenSearch or Loki, depending on your query patterns. Again - run parallel first.

**Step 4: Cut Over**

Once you've validated data parity for two weeks, disable the Datadog exporters and cancel.

**Total savings: $65,000 - $150,000/year**

## The Objections (And Why They're Wrong)

### "We don't have time to manage open-source tools"

Fair concern. But consider:
- You already manage Kubernetes, PostgreSQL, Redis, and a dozen other open-source systems
- OneUptime runs as a single Docker Compose or Helm chart - it's not six separate tools
- The time you spend managing vendor contracts, negotiating renewals, and arguing about overages is time too

### "What about support?"

OneUptime offers commercial support if you want it. But honestly, the community is large enough now that most questions are answered within hours on GitHub Discussions.

### "Open-source tools aren't as polished"

This was true in 2020. It's not true in 2026. OneUptime's UI is cleaner than most paid alternatives. OpenTelemetry is the industry standard that Datadog themselves now support.

### "We tried this before and it was a nightmare"

The ecosystem has matured dramatically. OpenTelemetry didn't have stable SDKs three years ago. Now it does. OneUptime didn't have error tracking or on-call two years ago. Now it does. The timing matters.

## The Real Math

Let's say your observability stack costs $100K/year. Here's what that looks like over three years:

**Status quo:** $300,000

**Open-source migration:**
- Migration effort (engineering time): ~$15,000 (two engineers, six weeks part-time)
- Hosting costs for self-hosted tools: ~$6,000/year ($18,000 over 3 years)
- OneUptime commercial support (optional): ~$5,000/year ($15,000 over 3 years)
- **Total: $48,000**

**Three-year savings: $252,000**

That's a quarter million dollars. For a startup burning $200K/month, that's more than a month of runway. For a profitable company, that's straight to the bottom line.

## Who Should NOT Do This

Let me be honest about when this approach doesn't make sense:

- **You have fewer than 10 engineers and no ops capacity.** Use managed services. Your time is worth more than the savings.
- **You're in a heavily regulated industry that requires specific vendor certifications.** Check compliance requirements first.
- **Your Datadog bill is under $10K/year.** The migration effort probably isn't worth it at that scale.

For everyone else - and that's most of you - you're paying an observability tax that you don't need to pay.

## Getting Started

If you want to test this without committing to anything:

1. [Deploy OneUptime](https://oneuptime.com/docs) - Docker Compose, Helm, or use the cloud version
2. Set up a status page and a few uptime monitors (15 minutes)
3. Configure one on-call schedule (10 minutes)
4. Point one service's OpenTelemetry data at it
5. See for yourself

You'll know within an hour whether this is worth pursuing for your team.

The observability vendors have had a good run charging premium prices for commodity infrastructure. That era is ending. The open-source ecosystem is ready. The only question is how long you want to keep paying the tax.

---

*OneUptime is open-source observability - monitoring, status pages, incident management, on-call, logs, APM, and error tracking in a single platform. [GitHub](https://github.com/OneUptime/oneuptime) | [Website](https://oneuptime.com)*
