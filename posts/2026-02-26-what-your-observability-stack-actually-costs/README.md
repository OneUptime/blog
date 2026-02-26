# What Your Observability Stack Actually Costs in 2026

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Open Source, Comparison

Description: A detailed cost breakdown of running Datadog + PagerDuty + StatusPage + Sentry vs a single open-source platform, for a 50-person engineering team.

Most engineering teams don't know what they spend on observability. Not really. The number on the Datadog invoice is just the beginning. Add PagerDuty for on-call, Atlassian StatusPage for customer communication, Sentry for error tracking, maybe Loggly or Papertrail for logs — and suddenly you're looking at a bill that would make your CFO cry.

We did the math. Here's what a typical 50-person engineering team actually pays in 2026.

## The Typical Stack

Let's say you're a mid-market SaaS company. 50 engineers, running maybe 200 hosts, a few hundred containers, a dozen microservices. Nothing crazy. You need:

- **Infrastructure monitoring** (metrics, dashboards, alerts)
- **APM** (traces, performance tracking)
- **Log management** (search, retention, alerting)
- **Error tracking** (stack traces, issue grouping)
- **On-call management** (scheduling, escalation, notifications)
- **Status pages** (public incident communication)
- **Incident management** (workflows, postmortems)

Most teams cobble this together from 4-6 different vendors. Let's price it out.

## The Multi-Vendor Stack

### Datadog: Infrastructure + APM + Logs

Datadog is the gorilla in the room. Their per-host pricing looks reasonable until you start adding products:

| Product | Price | Your Usage | Monthly Cost |
|---------|-------|-----------|--------------|
| Infrastructure Monitoring (Pro) | $23/host/mo | 200 hosts | $4,600 |
| APM (Pro) | $40/host/mo | 50 hosts (traced) | $2,000 |
| Log Management (ingest) | $0.10/GB/mo | 500 GB/mo | $50 |
| Log Management (retain 15d) | $2.55/million events | ~150M events | $383 |
| Indexed Spans | $1.70/million spans | ~100M spans | $170 |

**Datadog subtotal: ~$7,200/month ($86,400/year)**

And this is conservative. We haven't added Synthetic Monitoring ($12/10k tests), RUM ($1.50/1k sessions), or Database Monitoring ($84/host). Many teams easily double this number.

### PagerDuty: On-Call + Incident Management

You need someone to get woken up at 3 AM. PagerDuty's Business plan at $41/user/month is what most mid-market teams use (you need it for custom fields, advanced integrations, and ITSM).

| Plan | Price | Users | Monthly Cost |
|------|-------|-------|--------------|
| Business | $41/user/mo | 25 on-call engineers | $1,025 |
| Stakeholder licenses | ~$5/user/mo | 25 stakeholders | $125 |

**PagerDuty subtotal: ~$1,150/month ($13,800/year)**

### Atlassian StatusPage: Customer Communication

Your customers want to know when things break. StatusPage's Startup plan at $99/month covers up to 1,000 subscribers. But if you've grown past that?

| Plan | Monthly Cost |
|------|-------------|
| Business (5,000 subscribers) | $399 |

**StatusPage subtotal: $399/month ($4,788/year)**

### Sentry: Error Tracking

Sentry's Team plan at $26/month is the starting point, but real usage with a 50-person team on Business at $80/month plus pay-as-you-go events adds up:

| Item | Monthly Cost |
|------|-------------|
| Business plan | $80 |
| Additional error events (~500K) | ~$200 |

**Sentry subtotal: ~$280/month ($3,360/year)**

## The Total Damage

| Vendor | Annual Cost |
|--------|-----------|
| Datadog (Infra + APM + Logs) | $86,400 |
| PagerDuty (On-call + Incidents) | $13,800 |
| StatusPage (Status pages) | $4,788 |
| Sentry (Error tracking) | $3,360 |
| **Total** | **$108,348** |

That's over **$108,000 per year** — and we were being conservative on every line item.

## The Hidden Costs Nobody Talks About

The invoice total isn't the real cost. There's more:

**Integration tax.** Every tool has its own alerting logic, its own dashboards, its own way of doing things. Your team spends hours building and maintaining integrations between them. When Datadog fires an alert, it has to reach PagerDuty. PagerDuty has to trigger a workflow. Someone has to update StatusPage. Sentry errors need to correlate with APM traces. Each integration is a small project that someone maintains forever.

**Context switching.** When an incident happens at 3 AM, your on-call engineer opens Datadog to see metrics, switches to APM for traces, jumps to Sentry for the error, checks the logs, opens PagerDuty to manage the incident, and updates StatusPage for customers. That's six browser tabs, six different interfaces, six different mental models. Under pressure, at 3 AM.

**Vendor management.** Four contracts. Four renewal negotiations. Four security reviews. Four SSO configurations. Four sets of billing surprises. Each vendor changes pricing independently. Each vendor has outages (ironic, right?). Each vendor requires someone to be the internal expert.

**Data silos.** Your metrics live in Datadog, your errors live in Sentry, your incident history lives in PagerDuty. Correlating data across these systems requires either expensive integrations or manual detective work. "Was that spike in errors related to the CPU alert from last week?" Good luck finding out quickly.

## What If It Was All One Platform?

This is where the math gets interesting. What if infrastructure monitoring, APM, logs, error tracking, on-call, status pages, and incident management were all in one place?

That's what OneUptime does. Open source, self-hostable, or cloud-hosted. One platform that replaces all four (and more).

For a 50-person team, OneUptime's pricing is a flat per-seat model. No per-host charges. No per-GB log ingestion fees. No surprise bills because your traffic spiked.

But even beyond pricing: having everything in one place means your on-call engineer gets a single alert, opens a single dashboard, sees metrics + traces + logs + errors in one view, manages the incident with built-in workflows, and updates the status page — all without leaving the platform.

## The Real Question

$108,000 per year is real money for a growing company. But the hidden costs — integration maintenance, context switching, vendor management, data silos — probably double the true cost when you factor in engineering time.

The observability market has trained us to think buying best-of-breed for each capability is normal. But what if the integration between your monitoring and your incident management is more valuable than either tool individually?

You don't need five great tools. You need one good platform where everything works together.

---

*OneUptime is open source and free to self-host. Check it out at [oneuptime.com](https://oneuptime.com) or on [GitHub](https://github.com/OneUptime/oneuptime).*
