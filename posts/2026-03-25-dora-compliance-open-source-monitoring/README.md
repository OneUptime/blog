# DORA Compliance and Monitoring: A Guide for Engineering Teams

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Observability, Monitoring, Compliance, Incident Management, Status Page, Open Source

Description: A practical guide to meeting EU DORA monitoring and incident reporting requirements - without vendor lock-in or six-figure observability bills.

The EU's Digital Operational Resilience Act (DORA) has been in effect since January 2025, and enforcement is tightening. If you're running engineering at a bank, insurance company, payment provider, or any fintech operating in the EU, this regulation now directly shapes how you build, monitor, and report on your systems.

Most coverage of DORA reads like compliance consultant brochureware. This post is different. It's written for the people who actually have to implement the monitoring, incident management, and reporting infrastructure that DORA demands.

## What DORA Actually Requires From Your Monitoring Stack

DORA isn't just another checkbox exercise. It requires financial entities to demonstrate - with evidence, not documents - that they can detect, classify, report, and recover from ICT incidents. Here's what that translates to in engineering terms:

### 1. Continuous ICT Risk Monitoring

Article 8 of DORA requires institutions to "identify, classify and adequately document all ICT supported business functions, roles and responsibilities." In practice, this means your monitoring must cover:

- **Infrastructure health** - CPU, memory, disk, network across all environments
- **Application performance** - Response times, error rates, throughput for all critical services
- **Dependency mapping** - Understanding which business processes rely on which technical components
- **Third-party service monitoring** - Your cloud providers, SaaS tools, and payment processors need to be monitored too

You can't claim operational resilience if you don't know when something is broken.

### 2. Incident Classification and Reporting

DORA Article 18 requires a standardized incident classification framework. Major ICT-related incidents must be reported to regulators within strict timelines:

- **Initial notification**: Within 4 hours of classifying an incident as major
- **Intermediate report**: Within 72 hours
- **Final report**: Within one month

This means you need:

- **Automated alerting** with clear severity levels that map to DORA's classification criteria
- **Incident timelines** that are machine-generated, not reconstructed from memory after the fact
- **Audit trails** showing when incidents were detected, who was notified, and what actions were taken

If your incident management is a Slack channel and someone's memory, you have a compliance problem.

### 3. Status Pages and Stakeholder Communication

DORA Article 14 requires institutions to have "communication plans" for ICT-related incidents that affect clients and counterparties. Regulators want to see:

- **Public or private status pages** showing real-time service health
- **Structured incident communication** - not ad-hoc emails, but systematic updates
- **Historical incident records** that auditors can review

This isn't just nice-to-have UX. It's a regulatory requirement.

### 4. Resilience Testing

Articles 24-27 require regular testing of your operational resilience. For larger institutions, this includes threat-led penetration testing (TLPT). For everyone, it means:

- **Synthetic monitoring** - Proactive checks that verify critical user journeys work end-to-end
- **Chaos engineering or failover testing** - Can you prove your systems recover?
- **Documented test results** with remediation timelines

### 5. Third-Party ICT Risk Management

Articles 28-30 are where it gets interesting for your monitoring vendor choice. DORA requires institutions to assess concentration risk in their ICT supply chain. If your monitoring, alerting, incident management, status pages, and on-call rotation all come from different SaaS vendors - each one a potential point of failure - you're creating exactly the kind of fragmented dependency chain that DORA was designed to address.

And if all of those tools come from a single proprietary vendor? You now have concentration risk with no exit strategy.

## The Vendor Lock-In Problem

Here's the uncomfortable truth that compliance consultants won't tell you: **the monitoring tools you choose are themselves part of your ICT supply chain risk**.

Consider a typical enterprise monitoring stack:

| Function | Tool | Annual Cost |
|----------|------|-------------|
| Infrastructure monitoring | Datadog | $50,000–$150,000 |
| APM | Datadog or New Relic | $30,000–$100,000 |
| Log management | Splunk or Datadog | $50,000–$200,000 |
| Incident management | PagerDuty | $15,000–$50,000 |
| Status pages | Atlassian Statuspage | $5,000–$15,000 |
| Synthetic monitoring | Datadog or Pingdom | $10,000–$30,000 |
| Error tracking | Sentry | $10,000–$30,000 |

**Total: $170,000–$575,000/year** - and that's a mid-market estimate.

But cost isn't even the main issue under DORA. The issues are:

1. **Concentration risk**: If Datadog has an outage, you lose monitoring AND APM AND logs AND synthetics simultaneously. [This has happened](https://www.datadoghq.com/blog/).
2. **Data sovereignty**: Where does your monitoring data live? DORA and GDPR both care about this. With SaaS vendors, you often can't choose.
3. **Vendor dependency**: Can you migrate if your vendor changes pricing, gets acquired, or has a security breach? If not, you have a DORA problem.
4. **Audit access**: Regulators may want to inspect your monitoring data. How easy is that when it lives in someone else's cloud?

## The Open-Source Path to DORA Compliance

Self-hosted, open-source monitoring solves several DORA challenges simultaneously:

### Data Sovereignty - Solved

When you self-host, your monitoring data lives in your infrastructure, in your jurisdiction. No questions about data residency. No third-party data processing agreements to negotiate. Full control over retention policies and encryption.

### Concentration Risk - Reduced

A single open-source platform that handles monitoring, APM, logs, incident management, status pages, and on-call means fewer moving parts. Self-hosted means your monitoring doesn't go down when someone else's cloud has a bad day.

### Vendor Lock-In - Eliminated

Open-source means the code is yours. If you need to fork it, extend it, or migrate away, you can. Your monitoring infrastructure isn't held hostage by a vendor's pricing decisions.

### Audit Readiness - Built In

With self-hosted tools, giving auditors access is straightforward. They can inspect your data, your incident timelines, your alert configurations - all without navigating a vendor's access controls.

## Building a DORA-Compliant Monitoring Stack

Here's what a practical, DORA-aligned monitoring architecture looks like:

### Core Requirements

1. **Unified platform**: Monitoring, APM, logs, incidents, status pages, and on-call in one place - reducing integration points and concentration risk
2. **Self-hostable**: Deploy in your own infrastructure for data sovereignty
3. **Open source**: No vendor lock-in, full audit transparency
4. **Incident management with timelines**: Automated, auditable incident records that satisfy DORA's reporting requirements
5. **Status pages**: Both public and private, showing real-time and historical service health
6. **Alerting with escalation**: On-call schedules and escalation policies that can be documented for regulators
7. **Synthetic monitoring**: Proactive testing of critical services

### Implementation Approach

**Phase 1: Foundation (Weeks 1-2)**
- Deploy your monitoring platform in your infrastructure (Kubernetes, Docker, or bare metal)
- Configure infrastructure monitoring for all critical systems
- Set up uptime monitors for customer-facing services

**Phase 2: Incident Management (Weeks 3-4)**
- Define incident severity levels that map to DORA's classification criteria
- Configure alerting rules and on-call schedules
- Create status page(s) for stakeholder communication
- Set up incident templates with required fields for regulatory reporting

**Phase 3: Observability (Weeks 5-8)**
- Instrument applications with OpenTelemetry for APM and distributed tracing
- Configure log ingestion and retention policies
- Set up synthetic monitors for critical user journeys

**Phase 4: Compliance (Ongoing)**
- Document your monitoring architecture for regulators
- Run regular resilience tests and document results
- Review and update incident classification criteria quarterly
- Conduct periodic third-party risk assessments of any remaining SaaS dependencies

## What Regulators Actually Want to See

Having spoken with engineering leaders who've been through DORA audits, here's what regulators focus on:

1. **Can you show me when this incident was detected?** → Automated alerting with timestamps
2. **How was the business impact assessed?** → Incident classification framework with clear criteria
3. **Who was notified and when?** → On-call schedules and escalation logs
4. **How did you communicate with affected parties?** → Status page history and incident communication records
5. **What's your recovery time for critical services?** → SLA dashboards and historical availability data
6. **How do you monitor your third-party ICT providers?** → External service monitoring and dependency maps

If your monitoring stack can answer all six questions with actual data - not PowerPoint slides - you're in good shape.

## The Bottom Line

DORA compliance isn't optional, and it isn't going away. The regulation fundamentally changes how financial institutions must think about their technology infrastructure - including the tools they use to monitor it.

The combination of open-source software, self-hosting, and a unified platform approach gives you:

- **Compliance**: Data sovereignty, audit readiness, vendor independence
- **Cost efficiency**: One platform instead of six or seven SaaS subscriptions
- **Operational resilience**: Fewer dependencies, fewer failure modes
- **Control**: Your monitoring runs on your terms

For engineering teams at regulated financial institutions, this isn't just a technical choice. It's a strategic one. The monitoring stack you choose today determines how easy or hard your DORA compliance journey will be for years to come.

---

*OneUptime is an open-source observability platform that combines monitoring, APM, logs, incident management, status pages, and on-call - all self-hostable. [Learn more](https://oneuptime.com) or [deploy it yourself](https://github.com/OneUptime/oneuptime).*
