# Self-Hosted Status Pages Compared: Cachet, Upptime, Gatus, cState, and OneUptime

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Status Page, Open Source, Self-Hosting, Comparison, Incident Management, Reliability

Description: An honest comparison of the most popular self-hosted status page tools, covering features, maintenance burden, and which one fits different team sizes and use cases.

If you're reading this, you've probably decided you want to run your own status page rather than paying a SaaS provider. Good instinct - status pages are critical infrastructure, and depending on a third party for your availability communication introduces an ironic single point of failure (just ask anyone who was on Atlassian Statuspage during the [21-day System Metrics outage in February 2026](https://oneuptime.com/blog/post/2026-02-25-atlassian-statuspage-21-day-outage/view)).

But which self-hosted tool should you pick? There are more options than you'd expect, and they range from static site generators to full observability platforms. This guide compares the most actively maintained options honestly - including where each one falls short.

## What to Look For in a Self-Hosted Status Page

Before diving into specific tools, here's what actually matters when you're running your own:

- **Maintenance burden**: How much work is it to keep running? A status page that goes down during an incident defeats the entire purpose.
- **Incident management**: Can you create, update, and resolve incidents through the tool itself, or is it just a display layer?
- **Monitoring integration**: Does it detect outages automatically, or do you have to manually flip switches?
- **Subscriber notifications**: Can users subscribe to updates via email, SMS, or webhook?
- **Custom domains and branding**: Can you put it on `status.yourcompany.com` with your own look?
- **Authentication for private pages**: Not every status page is public. Internal teams need private ones too.

## The Contenders

### Cachet (PHP)

**GitHub**: [cachethq/cachet](https://github.com/cachethq/cachet)  
**Stack**: PHP / Laravel / MySQL or PostgreSQL  
**License**: BSD-3-Clause

Cachet was the original open-source status page and the one most people find first when searching. It has a clean UI, metric tracking, and a solid API for programmatic incident management.

**Strengths**:
- Mature project with a well-designed interface
- API-driven - easy to integrate with CI/CD pipelines
- Component groups and metric graphs
- Subscriber notifications built in
- Multilingual support

**Weaknesses**:
- **Maintenance concerns**: Cachet went through a long period of inactivity. The v3 rewrite has been in progress for years. Depending on when you read this, check the commit history carefully.
- Requires PHP hosting (Laravel), which adds operational overhead if your stack is containers or Node.js
- No built-in monitoring - it's purely a display layer. You need external tools to detect outages and push updates via the API.
- No on-call or alerting features

**Best for**: Teams that want a traditional status page with API integration and already run PHP infrastructure.

### Upptime (Static Site)

**GitHub**: [upptime/upptime](https://github.com/upptime/upptime)  
**Stack**: GitHub Actions + GitHub Pages (static)  
**License**: MIT

Upptime takes a radically different approach: it runs entirely on GitHub infrastructure. Monitoring happens via GitHub Actions cron jobs, incidents are GitHub Issues, and the status page is deployed to GitHub Pages. Zero servers required.

**Strengths**:
- **Zero infrastructure to maintain** - runs on GitHub's free tier
- Monitoring is built in (HTTP, TCP, DNS checks via Actions)
- Incident history is just GitHub Issues, making it highly transparent
- Response time graphs generated from monitoring data
- Custom domains via GitHub Pages

**Weaknesses**:
- **Tied to GitHub** - if GitHub has issues, your status page and monitoring are both down (GitHub Actions has a track record of reliability issues during platform incidents)
- Limited notification options - relies on GitHub's notification system
- No real incident management workflow - creating an incident means opening a GitHub Issue
- Can't handle private status pages
- Customization is limited to what GitHub Pages and their template system support
- Monitoring granularity is limited by GitHub Actions cron (minimum 5-minute intervals)

**Best for**: Small teams, open-source projects, or personal projects that want monitoring and a status page with zero operational overhead.

### Gatus (Go)

**GitHub**: [TwiN/gatus](https://github.com/TwiN/gatus)  
**Stack**: Go binary / Docker  
**License**: Apache-2.0

Gatus is primarily a monitoring tool with a built-in status page. It's lightweight, fast, and configured entirely via YAML. If you want something that "just works" in a single container, Gatus is hard to beat.

**Strengths**:
- **Single binary, minimal resource usage** - runs happily on a Raspberry Pi
- Monitoring is first-class: HTTP, TCP, DNS, ICMP, SSH, and even GraphQL checks
- Alerting integrations: Slack, PagerDuty, Discord, Telegram, email, and more
- Conditional alerting (alert only if X consecutive failures)
- YAML-based configuration is version-controllable
- Built-in badge generation for README files

**Weaknesses**:
- **No incident management** - it monitors and displays status, but there's no way to manually create incidents, post updates, or manage scheduled maintenance
- No subscriber notifications (email/SMS to end users)
- The status page UI is functional but basic - limited branding options
- No API for programmatic incident creation
- No private/authenticated status pages
- Configuration changes require restarting the service (no hot reload for most settings)

**Best for**: DevOps teams that want lightweight, automated status monitoring with a clean dashboard. Works well as an internal health check display.

### cState (Static Site Generator)

**GitHub**: [cstate/cstate](https://github.com/cstate/cstate)  
**Stack**: Hugo (Go-based static site generator)  
**License**: MIT

cState generates a static status page using Hugo. Incidents are Markdown files, and the page is built and deployed wherever you host static sites - Netlify, Vercel, GitHub Pages, or your own Nginx.

**Strengths**:
- **Blazing fast** - it's a static site, so it loads instantly and handles any traffic spike
- Full design customization via Hugo templates
- Incidents are Markdown files in a Git repo - full version history
- Extremely resilient - a static page hosted on a CDN is about as reliable as it gets
- RSS feed for status updates
- Multi-language support

**Weaknesses**:
- **No monitoring whatsoever** - purely a manual display page
- Creating incidents means committing Markdown files to a Git repo, which isn't exactly fast during a 3 AM outage
- No subscriber notifications
- No API
- No private status pages
- Requires familiarity with Hugo and Git
- The project has lower activity - check the repo for recent commits

**Best for**: Teams that want maximum resilience and full design control, and are comfortable with Git-based workflows for incident updates.

### OneUptime (Full Platform)

**GitHub**: [oneuptime/oneuptime](https://github.com/oneuptime/oneuptime)  
**Stack**: TypeScript / Node.js / PostgreSQL / Docker / Kubernetes  
**License**: Apache-2.0 (fully open source - not open-core)

Full disclosure: this is our project. We're including it because a comparison wouldn't be complete without it, but we'll be honest about the trade-offs.

OneUptime is a full observability platform that includes status pages as one component alongside monitoring, incident management, on-call scheduling, logs, metrics, traces, and alerting.

**Strengths**:
- **All-in-one**: monitoring detects the outage, incident management tracks it, status page communicates it, and on-call routing alerts the right person - in one platform
- Public and private status pages with SSO authentication
- Subscriber notifications (email, SMS, webhook, RSS, Atom)
- Scheduled maintenance management with automatic status page updates
- Custom domains and full branding
- Workflows and automation for incident response
- OpenTelemetry-native for logs, metrics, and traces
- Active development with frequent releases

**Weaknesses**:
- **Heavier to self-host** than single-purpose tools - it runs PostgreSQL, Redis, and multiple services. Kubernetes is recommended for production deployments, though Docker Compose works for smaller setups.
- If you only need a status page and nothing else, it's overkill
- Resource requirements are higher (minimum 4GB RAM for a comfortable deployment)
- The learning curve is steeper since there are more features to configure
- SaaS version has usage-based pricing (charges by GB ingested for telemetry). Self-hosted is free.

**Best for**: Teams that want to consolidate monitoring, incident management, on-call, and status pages into a single self-hosted platform.

## Feature Comparison Table

| Feature | Cachet | Upptime | Gatus | cState | OneUptime |
|---|---|---|---|---|---|
| **Built-in monitoring** | No | Yes (GitHub Actions) | Yes | No | Yes |
| **Incident management** | Yes (API) | Via GitHub Issues | No | Via Markdown/Git | Yes (full workflow) |
| **Scheduled maintenance** | Yes | No | No | Yes (manual) | Yes (automated) |
| **Subscriber notifications** | Yes | No | No | No | Yes (email, SMS, webhook) |
| **Private/auth status pages** | No | No | No | No | Yes (SSO, per-user) |
| **On-call scheduling** | No | No | No | No | Yes |
| **Custom domain** | Yes | Yes | Limited | Yes | Yes |
| **Branding/theming** | Moderate | Limited | Minimal | Full (Hugo) | Full |
| **API** | Yes | GitHub API | No | No | Yes |
| **Minimum resources** | 512MB | 0 (GitHub-hosted) | 64MB | 0 (static) | 4GB |
| **Deploy complexity** | Medium | Low | Low | Low | Medium-High |
| **License** | BSD-3 | MIT | Apache-2.0 | MIT | Apache-2.0 |

## How to Choose

**You want zero infrastructure**:  
Use **Upptime** if you're okay with GitHub dependency, or **cState** on a CDN if you want more control. Both are static and nearly indestructible.

**You want automated health checks with a status display**:  
**Gatus** is the right choice. It's the best "lightweight monitoring with a status page" tool available. Pair it with PagerDuty or Slack for alerting.

**You want a traditional status page with an API**:  
**Cachet** is the closest to Atlassian StatusPage in terms of mental model. Check the project health before committing - activity has been inconsistent.

**You want monitoring, incidents, on-call, AND a status page**:  
**OneUptime** is designed for this. If you're already running Kubernetes, deploying it is straightforward. If you're trying to consolidate tools rather than add another single-purpose one, it makes sense.

**You want a status page for an open-source project**:  
**Upptime** is probably the best fit. GitHub-native, transparent, and free.

## A Note on Reliability

Here's the counterintuitive thing about self-hosted status pages: your status page infrastructure can itself go down during the incident it's supposed to communicate about. If your status page runs in the same cluster as your application, a cluster-wide failure takes both down.

Mitigations:
- **Static pages on a CDN** (cState, Upptime) are naturally resilient to this
- **Separate infrastructure**: run your status page on a different provider than your main application
- **DNS-level failover**: some teams point their status domain to a static fallback if the primary page becomes unreachable
- **Multiple zones**: OneUptime supports deploying across regions for exactly this reason

Whatever tool you choose, think about this failure mode. A status page that's down when you need it most is worse than no status page at all.

## Conclusion

There's no single best self-hosted status page - it depends on what you're trying to solve. If you need a simple display, the lightweight options (Gatus, cState, Upptime) are great. If you need the full incident management lifecycle, you'll want something with more structure (Cachet, OneUptime).

The good news is that all of these are open source, so you can try them without spending anything except time. Start with the one that matches your current team size and infrastructure, and migrate later if your needs grow.
