# How to Set Up a Status Page for Your SaaS

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Status Pages, SaaS, Incident Management, DevOps

Description: A practical guide to setting up your first status page, covering what to include, how to structure it, and mistakes to avoid.

If you're running a SaaS product and don't have a status page yet, you're probably getting the same support tickets over and over: "Is the service down?" "Why is it slow?" "When will this be fixed?"

A status page answers these questions before they become tickets. It's a simple concept—a public page showing whether your systems are working—but getting it right takes some thought.

This guide walks through setting up a status page from scratch: what to include, how to organize it, and the common pitfalls that trip people up.

## Why You Actually Need One

The practical benefits are straightforward:

**Fewer support tickets.** When something breaks, customers check your status page instead of emailing support. This sounds minor until you're dealing with an outage affecting thousands of users.

**Faster communication during incidents.** Having a dedicated place for updates means you're not scrambling to figure out how to notify people while simultaneously trying to fix the problem.

**Building trust through transparency.** Customers appreciate knowing what's happening. A well-maintained status page signals that you take reliability seriously and aren't trying to hide problems.

**Internal alignment.** When your whole team can see what's up or down, you spend less time in "is it just me?" conversations.

## What to Include on Your Status Page

Start simple. You can always add more later.

### Core Components

**Service list.** Break down your product into logical components that customers care about. For a typical SaaS, this might be:
- API
- Web application
- Authentication
- Database
- Background jobs
- Third-party integrations

Don't go overboard with granularity. Customers don't need to know about every microservice—they need to know if the features they use are working.

**Status indicators.** Keep it simple: Operational, Degraded, Partial Outage, Major Outage. Some teams add a "Maintenance" status. Color-coding helps (green, yellow, orange, red).

**Current incidents.** Show active issues with clear descriptions of what's affected and when you last updated. People check status pages during problems, so this is prime real estate.

**Incident history.** A timeline of past issues helps customers understand your reliability over time. It also saves you from answering "has this happened before?" questions.

**Uptime metrics.** Display uptime percentages for each component. This is especially important if you have SLA commitments to enterprise customers.

### Optional But Useful

**Scheduled maintenance.** Announce planned downtime in advance so customers aren't surprised. Include the expected duration and what will be affected.

**Subscriber notifications.** Let people sign up for updates via email, SMS, or Slack. When something goes wrong, they'll be notified automatically instead of refreshing your page.

**Historical uptime graphs.** Visual charts showing uptime over the past 30 or 90 days give a quick sense of your reliability track record.

## How to Structure Your Status Page

### Group Related Services

If you have multiple products or distinct user-facing features, group them logically:

```
Platform Services
├── API
├── Web Dashboard
└── Mobile App

Infrastructure
├── Database
├── Authentication
└── CDN

Integrations
├── Slack Integration
├── GitHub Integration
└── Webhook Delivery
```

This helps customers quickly find what they care about without scrolling through dozens of individual components.

### Write Clear Component Names

Use names your customers understand, not internal codenames. "Authentication Service" is better than "auth-svc-prod-v2." If you have an API, call it "API" not "REST Gateway Cluster."

### Keep Incident Updates Honest and Frequent

During an incident, update at least every 30 minutes, even if it's just "we're still investigating." Silence makes people assume the worst.

Write updates in plain language:
- Bad: "Investigating elevated error rates in auth-service pods"
- Good: "Some users are unable to log in. We've identified the cause and are working on a fix."

## Technical Setup Considerations

### Custom Domain

Run your status page on your own domain (status.yourcompany.com) rather than a third-party subdomain. This looks more professional and keeps the branding consistent.

Most status page providers, including [OneUptime](https://oneuptime.com), support custom domains with automatic SSL certificates.

### Monitoring Integration

Connect your status page to your monitoring system so statuses update automatically. Manual updates are fine for small teams, but they don't scale—someone has to remember to update the page at 3am during an incident.

With integrated monitoring, your status page reflects reality without human intervention for routine issues.

### Notification Channels

Support multiple channels for subscriber notifications:
- **Email** for asynchronous updates
- **SMS** for urgent, time-sensitive issues
- **Slack/Teams** for teams that live in chat
- **Webhooks** for custom integrations
- **RSS** for technical users who prefer feeds

Let subscribers choose what they want to be notified about. Not everyone needs to know about every minor degradation.

### Private Status Pages

For B2B products, consider offering private status pages to enterprise customers. These can show more detailed internal metrics or customer-specific service status. Password protection or SSO integration keeps them secure.

## Common Mistakes to Avoid

### Too Much Granularity

Listing 50 microservices confuses customers. They don't care that "inventory-sync-worker-3" is down—they care whether they can complete a purchase. Aggregate into user-facing features.

### Stale Information

A status page showing "All Systems Operational" while Twitter is full of complaints about your outage destroys trust instantly. If you can't keep it updated automatically, at least check it during incidents.

### Vague Incident Descriptions

"We're investigating an issue" tells customers nothing. Be specific about what's affected and what the impact is. You don't need to share root cause analysis in real-time, but do tell people whether they can use your product.

### Forgetting the "Resolved" Update

After fixing an incident, update the status page. Customers who subscribed for updates are waiting to hear that things are back to normal. A postmortem summary a day or two later is also valuable.

### Hiding Behind the Status Page

A status page supplements communication—it doesn't replace it. For major incidents affecting enterprise customers, you should still proactively reach out. The status page is for broadcast updates, not a shield from direct communication.

## Getting Started

Here's a practical checklist:

1. **List your user-facing services.** Think about what your customers actually use, not your internal architecture.

2. **Choose a status page provider or build your own.** Hosted solutions like OneUptime handle the infrastructure, monitoring integration, and subscriber management. Building your own makes sense if you have very specific requirements.

3. **Set up a custom domain.** status.yourcompany.com is the standard.

4. **Connect your monitoring.** Automated updates are more reliable than manual ones.

5. **Configure notifications.** At minimum, support email subscriptions.

6. **Create an internal process.** Define who updates the status page during incidents, how often, and what information to include.

7. **Link to it.** Add links from your main site, login page, and help documentation. A status page nobody can find isn't useful.

## One Platform Approach

One thing worth mentioning: status pages work best when they're connected to the rest of your observability stack. When your monitoring detects an issue, your alerts fire, your on-call engineer responds, and your status page updates—all as part of the same workflow.

This is the approach we take at OneUptime. The status page isn't a separate tool; it's part of an integrated platform that includes monitoring, alerting, incident management, and on-call scheduling. When a monitor detects a problem, it can automatically update the status page and notify subscribers. When an engineer acknowledges an incident, that update flows through to the public page.

The alternative—stitching together separate tools—works, but creates gaps. Information gets lost between systems, and you end up with more manual coordination during incidents, which is exactly when you can least afford it.

## Wrapping Up

A status page is one of those things that seems simple until you actually try to do it well. The key is to think like your customers: what do they need to know, and how can you tell them clearly?

Start basic, automate what you can, and iterate based on what your customers actually ask about during incidents. Over time, your status page becomes not just a communication tool, but a trust signal—evidence that you take reliability seriously and aren't afraid to be transparent about problems.

The best status page is one your customers check once, see accurate information, and then get on with their day. That's the goal.
