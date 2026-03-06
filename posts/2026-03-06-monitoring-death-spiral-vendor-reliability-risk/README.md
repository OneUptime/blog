# The Monitoring Death Spiral: When Your Vendor Is Your Risk

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, DevOps, SRE, Open Source

Description: Your monitoring vendor going down means you are flying blind during your own incidents. Here is why self-hosted observability is becoming a reliability requirement, not just a cost decision.

There is a scenario that every SRE dreads but few plan for: your monitoring vendor goes down at the same time you are dealing with your own production incident.

It sounds unlikely until you realize that major observability platforms have experienced significant outages in recent years. Datadog, PagerDuty, Atlassian StatusPage, New Relic, and others have all had incidents where their core services were degraded or unavailable. When that happens, every team relying on those platforms loses visibility into their own systems at the worst possible time.

This is the monitoring death spiral. And it is more common than you think.

## The Problem: Single Points of Observability Failure

Most engineering teams have converged on a standard stack: a SaaS monitoring platform for metrics and traces, a SaaS alerting service for on-call, and a hosted status page for customer communication. All three are typically provided by different vendors, all running on shared cloud infrastructure.

The hidden assumption is that these services will be available when you need them most. But "when you need them most" is precisely when large-scale infrastructure events are happening, and those events do not respect vendor boundaries.

Consider what happens during a major cloud provider incident. AWS, GCP, or Azure experiences degradation. Your services are affected. But your monitoring vendor, also running on that same cloud provider, is experiencing the same degradation. Your dashboards are slow or unreachable. Your alerts are delayed or missing. Your status page will not update.

You are now managing an incident with no telemetry, no alerting, and no way to communicate with customers. That is the death spiral.

## Real-World Patterns

This is not a theoretical exercise. Several patterns have played out repeatedly across the industry:

**Pattern 1: The Shared Infrastructure Collapse.** A cloud region experiences issues. Both your application and your monitoring vendor are affected. You notice the problem from customer complaints on Twitter, not from your $50K/year observability platform.

**Pattern 2: The Alert Delivery Failure.** Your monitoring detects the problem, but your alerting vendor is experiencing its own issues. Alerts queue up. Pages do not fire. The on-call engineer is asleep while the incident grows. By the time someone notices, a five-minute fix has become a two-hour outage.

**Pattern 3: The Status Page Paradox.** You need to update your status page to tell customers about the outage. But your hosted status page service is also having problems. Your customers see a green "All Systems Operational" badge while your service is on fire. Trust evaporates.

**Pattern 4: The Vendor Incident Cascade.** Your observability vendor pushes a bad update to their own platform. Suddenly, dashboards show phantom alerts, metrics have gaps, and your team spends an hour debugging a ghost incident that does not exist in your infrastructure. The vendor's incident becomes your incident because your team cannot distinguish real problems from telemetry artifacts.

## Why This Gets Worse Over Time

Three trends are making this problem more acute:

**Consolidation into fewer vendors.** The industry is consolidating. Teams that used to run Prometheus, Grafana, PagerDuty, and StatusPage separately now run everything on one platform. That reduces operational overhead but concentrates risk. When your single vendor goes down, you lose metrics, logs, traces, alerts, and status pages simultaneously.

**Increasing observability dependence.** Modern architectures, especially microservices and serverless, are nearly impossible to debug without telemetry. Ten years ago, you could SSH into a box and tail a log file. Today, a single request might touch fifteen services across three regions. Without your observability platform, you cannot even identify which service is affected.

**Vendor pricing pressure reducing redundancy.** Observability costs are growing faster than infrastructure costs. Teams under budget pressure are cutting redundant monitoring setups. The "backup Prometheus" that used to catch what Datadog missed gets shut down to save money. The self-hosted Grafana instance that provided independent visibility gets decommissioned. Each cost cut removes a safety net.

## The Math of Vendor Availability

Let us do some rough math. If your monitoring vendor has 99.95% availability (which is a strong SLA), that is roughly 4.4 hours of downtime per year.

Now, what is the probability that vendor downtime overlaps with your own incident? If you experience, say, 20 incidents per year averaging 30 minutes each, that is 10 hours of incident time annually. The chance of overlap seems small in any given month, but across a year, it is not negligible. And the distribution is not random. Both your incidents and your vendor's incidents are more likely during high-traffic periods, cloud provider issues, and major software releases. The correlation is real.

For regulated industries, healthcare, financial services, government, this is not just an operational inconvenience. Losing visibility into your systems during an incident can create compliance violations, reporting failures, and legal exposure.

## What Teams Are Doing About It

Smart teams are adopting layered monitoring strategies. Not abandoning SaaS tools, but building independence from any single vendor.

**Self-hosted observability as the foundation layer.** Run your core monitoring on infrastructure you control. This does not mean going back to managing Nagios. Modern open-source observability platforms can be deployed with Docker Compose or Helm and provide metrics, logs, traces, alerting, and status pages in a single stack. When your SaaS vendor is down, your self-hosted layer keeps running.

**Independent health checks.** Run basic uptime monitoring from at least two independent sources. If one goes down, the other still catches problems. Simple HTTP checks from a VPS in a different cloud provider can be your early warning system when everything else fails.

**Local alerting that does not depend on SaaS.** Your alerting pipeline should have a path that works without internet access to a third-party service. Self-hosted alerting that can send SMS, call phones, or page Slack through direct integrations means you still get woken up when it matters.

**Self-hosted status pages.** Your status page should run on infrastructure that is independent from both your application and your monitoring vendor. Ideally, it should be on a completely separate provider. A static-site status page on a CDN is better than a hosted status page that goes down with your SaaS vendor.

**Regular "monitoring fire drills."** Block access to your monitoring vendor for an hour and see what happens. Can your team still detect problems? Can they still respond? Can they communicate with customers? If the answer is no, you have a single point of failure that deserves the same attention as any other critical dependency.

## The Cost Argument Flipped

The traditional argument for SaaS monitoring is cost: "it is cheaper than running your own." But this calculates cost in terms of monthly fees versus engineering time. It does not account for the cost of being blind during an incident.

One hour of undetected downtime for a mid-market SaaS company can cost anywhere from $10K to $500K in lost revenue, customer churn, and SLA credits. If self-hosted monitoring prevents even one such event per year, it pays for itself many times over.

The real cost comparison is not "SaaS subscription versus self-hosted maintenance." It is "SaaS subscription plus the expected cost of vendor-correlated downtime" versus "self-hosted maintenance plus the peace of mind of independent visibility."

## Getting Started

You do not need to rip out your existing monitoring stack to address this. Start with these steps:

1. **Audit your vendor dependencies.** Map every monitoring, alerting, and communication tool to its underlying infrastructure. Identify where a single cloud provider or vendor failure would blind you.

2. **Deploy a self-hosted baseline.** Set up an open-source observability platform on infrastructure you control. It does not need to replicate everything your SaaS vendor does. It needs to answer one question during an outage: "what is broken?"

3. **Test your independence.** Block your SaaS monitoring vendor at the firewall for one hour. Run a game day. See what your team can and cannot do.

4. **Build alerting redundancy.** Ensure at least two independent paths exist for critical alerts. If PagerDuty is down, can Slack still notify your team? If Slack is down, can a phone call still go out?

5. **Make status page independence a priority.** Your ability to communicate with customers during an incident should not depend on a third-party vendor that might be experiencing the same infrastructure event.

## The Bigger Picture

The monitoring death spiral is really about a deeper question: how much of your reliability posture depends on things outside your control?

Every SaaS dependency is a bet that the vendor will be available when you need them. For most tools, that bet is fine. If your project management tool goes down, you can wait an hour. But monitoring is different. Monitoring is the tool you need most precisely when things are going wrong.

The teams that take reliability seriously are the ones that treat their observability stack with the same rigor they apply to their production infrastructure. That means redundancy, independence, and the ability to operate when any single vendor fails.

Self-hosted monitoring is not a step backward. It is a step toward operational sovereignty. You still use SaaS tools for their convenience, their advanced features, their managed infrastructure. But you never depend on them completely. Your foundation layer runs on your terms, on your infrastructure, under your control.

Because the only thing worse than an outage is an outage you cannot see.
