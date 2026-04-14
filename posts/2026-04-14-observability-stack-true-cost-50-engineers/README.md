# The $420K Monitoring Bill: What 50 Engineers Actually Pay to Observe

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Comparison, DevOps

Description: A detailed cost breakdown of what a typical 50-engineer team spends across Datadog, PagerDuty, StatusPage, Sentry, and Pingdom - with the math shown.

Nobody talks about the total number.

Your Datadog bill? You know that one. Your PagerDuty invoice? Sure. StatusPage? Sentry? Pingdom? Each one feels manageable on its own. But add them up across your entire observability stack and something uncomfortable emerges: **you might be spending more on monitoring your infrastructure than running it.**

This post does the math. We take a realistic 50-engineer team running a cloud-native SaaS product and calculate exactly what they pay across the standard observability toolkit. No hand-waving. No "it depends." Just numbers.

## The Setup: A Realistic 50-Engineer Team

Before we start adding up invoices, let's define what "typical" looks like:

- **Team:** 50 engineers (30 backend, 10 frontend, 5 SRE/platform, 5 mobile/QA)
- **Infrastructure:** 150 hosts across staging and production (mix of VMs and containers)
- **Traffic:** 2M user sessions/month, 50M API requests/day
- **Logs:** 200GB/day ingestion (modest for this team size)
- **Services:** 40 microservices, 3 databases, 2 message queues
- **On-call:** 15 engineers in rotation across 3 teams
- **Status page:** Public-facing, 2,000 subscribers

This isn't a FAANG-scale operation. This is a Series B or C SaaS company with real customers and real uptime requirements. The kind of team that needs observability but isn't printing money.

## Tool 1: Datadog - Infrastructure, APM, and Logs

Datadog is the centerpiece of most modern observability stacks, and it's where the bulk of the spend lives.

### Infrastructure Monitoring

150 hosts at the Enterprise tier ($23/host/month):

> 150 × $23 × 12 = **$41,400/year**

The Pro tier ($15/host) would save money, but most teams at this scale need the 15-month metric retention, anomaly detection, and outlier detection that Enterprise provides.

### APM (Application Performance Monitoring)

APM pricing is per host. At Enterprise tier ($40/host/month), and assuming APM agents run on 100 of those 150 hosts:

> 100 × $40 × 12 = **$48,000/year**

### Log Management

This is where bills get scary. Datadog charges separately for ingestion, indexing, and retention.

- **Ingestion:** 200GB/day × $0.10/GB × 365 = $7,300/year
- **Indexing:** Assume 20% of logs are indexed (the rest are archived). 40GB/day × 30 days × $1.70/million events. At roughly 1 million events per GB, that's 40M events/day indexed. Monthly: ~1.2B events × $1.70/million = $2,040/month = $24,480/year
- **Retention:** 15-day retention on indexed logs is included. 30-day retention adds cost.

Conservative log management total:

> **$31,780/year** (and this assumes aggressive filtering - many teams pay 2-3x this)

### Synthetic Monitoring

50 API tests running every 5 minutes, 10 browser tests running every 15 minutes:

- API: 50 tests × 288 runs/day × 30 = 432,000 runs/month. At $12 per 10,000 runs = $518/month
- Browser: 10 tests × 96 runs/day × 30 = 28,800 runs/month. At $22 per 1,000 runs = $634/month

> 12 × ($518 + $634) = **$13,824/year**

### Real User Monitoring (RUM)

2M sessions/month at $1.50 per 1,000 sessions:

> 2,000 × $1.50 × 12 = **$36,000/year**

### Datadog Total

| Product | Annual Cost |
|---------|------------|
| Infrastructure Monitoring | $41,400 |
| APM | $48,000 |
| Log Management | $31,780 |
| Synthetic Monitoring | $13,824 |
| RUM | $36,000 |
| **Datadog Total** | **$171,004** |

And we haven't even turned on Database Monitoring, Network Monitoring, CI Visibility, Cloud Security, or any of the 20+ other products Datadog now offers. A team using the full platform easily pushes past $250,000.

## Tool 2: PagerDuty - On-Call and Incident Response

15 engineers on-call at the Business tier ($41/user/month):

> 15 × $41 × 12 = **$7,380/year**

But wait - most PagerDuty accounts include additional users who need visibility (managers, support, etc.). If 30 of your 50 engineers have PagerDuty seats:

> 30 × $41 × 12 = **$14,760/year**

PagerDuty also charges separately for AIOps, Automation, and Status Pages if you use those add-ons.

**PagerDuty total: $14,760/year** (conservative)

## Tool 3: Atlassian Statuspage - Status Pages

A public status page with 2,000 subscribers requires the Business plan:

> $399/month × 12 = **$4,788/year**

For a status page. That shows green circles. Let that sink in.

If you also need an internal status page for engineering (which most teams do), Atlassian charges separately for that - the "Internal Pages" Starter plan adds $79/month ($948/year), with the Growth plan at $249/month ($2,988/year) for larger teams.

**Statuspage total: $4,788 - $7,776/year**

## Tool 4: Sentry - Error Tracking

Sentry's Business plan at $80/month base, plus usage:

- 50K errors/month included
- A 50-engineer team with 40 microservices realistically generates 500K-1M errors/month (including warnings, handled exceptions, and breadcrumbs)
- At 750K errors/month: base $80 + overage of ~$150/month

> ($80 + $150) × 12 = **$2,760/year**

Sentry is actually one of the more reasonable tools in this stack. But it's still another vendor, another login, another bill.

**Sentry total: $2,760/year**

## Tool 5: The Hidden Costs

These never show up in the "observability budget" but they're real:

### Custom Metrics Overages (Datadog)

Datadog includes 100 custom metrics per host in Infrastructure Monitoring. 150 hosts = 15,000 included metrics. A 50-engineer team with 40 microservices easily generates 30,000-50,000 custom metrics. The overage at $0.05/metric/month:

> 35,000 excess × $0.05 × 12 = **$21,000/year**

This is the line item that catches most teams off guard.

### Engineering Time: The Invisible Tax

This one doesn't show up on any invoice, but it's often the largest cost of all:

- **Context switching between tools:** An on-call engineer troubleshooting an incident has Datadog open in one tab, PagerDuty in another, Sentry in a third, and their status page admin in a fourth. Each tool has its own query language, its own alert logic, its own data model.
- **Maintaining integrations:** Keeping PagerDuty in sync with Datadog alerts, pushing Sentry errors to Slack, updating the status page during incidents - someone has to maintain all of this.
- **Onboarding new engineers:** "Here's your Datadog login. And PagerDuty. And Sentry. And Statuspage. Each works differently."
- **Procurement and vendor management:** Four separate contracts, four renewal cycles, four security reviews, four SOC 2 questionnaires.

Conservative estimate: 1 SRE spending 20% of their time on observability tooling overhead = **$30,000-$40,000/year** in loaded engineering cost.

## The Grand Total

| Vendor/Category | Annual Cost |
|-----------------|------------|
| Datadog (Infra + APM + Logs + Synthetics + RUM) | $171,004 |
| Datadog Custom Metrics Overage | $21,000 |
| PagerDuty | $14,760 |
| Atlassian Statuspage | $4,788 |
| Sentry | $2,760 |
| Engineering Overhead (conservative) | $35,000 |
| **Total** | **$249,312** |

A quarter of a million dollars. For a 50-person engineering team. And this is the *conservative* estimate - we used modest log volumes, assumed aggressive filtering, and didn't include Database Monitoring, Network Monitoring, CI Visibility, or any of Datadog's security products.

Teams that use Datadog more broadly (which Datadog's sales team actively encourages) regularly hit **$350,000 - $500,000+** at this scale.

## The Uncomfortable Comparison

Now compare that to what this team actually spends on infrastructure:

- **150 hosts on AWS:** Mix of m5.xlarge and m5.2xlarge instances = roughly $120,000-$180,000/year
- **RDS databases, ElastiCache, SQS:** Another $40,000-$60,000/year
- **Total infrastructure:** ~$180,000-$240,000/year

**Your observability stack costs more than the infrastructure it monitors.**

Read that again. You're paying more to *watch* your servers than to *run* them.

## Why This Happened

This isn't anyone's fault, exactly. It happened gradually:

1. **Best-of-breed thinking:** Each tool was the best at its specific job when you adopted it
2. **Organic growth:** You started with Datadog for infra, added APM when you needed traces, added logs because they were "already there"
3. **Separate buyers:** SRE picked PagerDuty, the VP of Eng signed off on Datadog, someone in DevRel set up the status page, frontend added Sentry
4. **Usage-based pricing hides true cost:** Each tool feels cheap when you start. The bill grows with your success
5. **Switching costs feel high:** Even when you see the total, moving feels harder than staying

## What the Alternative Looks Like

The observability market is shifting. The same consolidation that happened in other software categories (remember when you needed separate tools for chat, video, and file sharing?) is happening here.

Consolidated platforms like [OneUptime](https://oneuptime.com) combine monitoring, APM, logs, status pages, on-call, and incident management into a single platform. The pricing model is fundamentally different: instead of per-host plus per-GB plus per-session plus per-user across multiple vendors, you get usage-based pricing at $0.10/GB ingested with everything included.

For context: OneUptime's Growth plan starts at $22/month with telemetry ingestion at $0.10/GB. The same 200GB/day log volume that costs $31,780/year on Datadog alone costs $7,300/year on OneUptime - and that includes infrastructure monitoring, APM, status pages, on-call, and incident management. No separate PagerDuty bill. No separate Statuspage bill. No separate Sentry bill.

The total for the same 50-engineer team? Roughly **$15,000 - $25,000/year** depending on data volume, versus $249,000+.

And because it's [fully open source](https://github.com/OneUptime/oneuptime), you can self-host it for the cost of the compute alone.

## The Decision Framework

Not every team should switch tomorrow. Here's when consolidation makes sense:

**Consolidate now if:**
- Your combined observability spend exceeds your infrastructure spend
- You have 3+ separate observability vendors
- Engineers complain about context-switching during incidents
- Your SRE team spends significant time maintaining integrations between tools
- You're approaching a Datadog contract renewal

**Stay fragmented if:**
- You genuinely need deep capabilities that only a specialized tool provides (e.g., Datadog's APM trace analysis at massive scale)
- Your team has deep institutional knowledge in your current tools and switching costs are genuinely high
- Cost isn't a constraint

For most teams between 20-200 engineers, consolidation isn't just a cost play - it's an operational improvement. One tool, one data model, one query language, one place to look when things break at 3 AM.

## Do the Math for Your Team

Pull up your invoices. Add them up. Then compare that number to what you spend on the infrastructure being monitored.

If the monitoring costs more than the monitored, something needs to change.

The era of $400K+ observability stacks for mid-size teams is ending. The only question is whether you lead the change or get dragged into it at your next renewal.
