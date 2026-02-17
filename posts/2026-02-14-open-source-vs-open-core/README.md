# Open Source vs Open Core: What It Actually Means for Your Infrastructure

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Open Source, Observability, DevOps

Description: Open source and open core sound similar but work very differently in practice. Here's what the distinction means when you're picking infrastructure tools.

You're evaluating monitoring tools. Two vendors both say "open source" on their website. You pick one, deploy it, and six months later discover that the alerting feature your team needs is locked behind an enterprise license. The other vendor? Everything works out of the box.

Welcome to the open source vs open core distinction — one of the most misunderstood concepts in infrastructure software.

## What Open Source Actually Means

Open source software ships its entire codebase under a permissive license (MIT, Apache 2.0, GPL, etc.). You can run it, modify it, distribute it, and build on it. There's no "community edition" vs "enterprise edition." The code you see on GitHub is the code that runs in production.

Examples in the infrastructure space:

- **Prometheus** (Apache 2.0) — All monitoring and alerting features available to everyone
- **Grafana's core** (AGPL v3) — Dashboarding and visualization, fully open
- **PostgreSQL** (PostgreSQL License) — The entire database, no features withheld

The license matters. Apache 2.0 and MIT are permissive — use the software however you want, including in commercial products. GPL and AGPL require you to share modifications under the same license. But in all cases, every feature is available to every user.

## What Open Core Actually Means

Open core takes a different approach: the base product is open source, but significant features are proprietary and require a paid license. The "core" is open. Everything else is behind a paywall.

This model is common in infrastructure tooling:

- **GitLab** — The Community Edition is open source. But features like security scanning, compliance dashboards, and advanced CI/CD are only in the proprietary Enterprise Edition.
- **Elastic** — Elasticsearch was open source under Apache 2.0 until 2021, when Elastic switched to SSPL (not OSI-approved). Many features now require a paid license.
- **Grafana** — While the core is AGPL, Grafana Labs offers proprietary plugins, enterprise features (SAML, auditing, reporting), and Grafana Cloud with capabilities not in the open source version.
- **HashiCorp** — Terraform, Vault, and Consul were open source under MPL 2.0 until 2023, when HashiCorp moved to BSL (Business Source License). Enterprise features like namespaces, sentinel policies, and multi-tenancy require paid licenses.

The pattern is consistent: ship a useful free version, then gate the features that enterprises need behind a commercial license.

## Why This Matters When You're Picking Tools

### The Feature Gap Problem

With open core, you start building on the free version. Your team gets comfortable. Then you hit a wall — the feature you need (SSO, audit logs, advanced alerting, role-based access) is enterprise-only. You're now choosing between paying up or rearchitecting.

This isn't hypothetical. It plays out constantly:

- Need SAML/SSO? Enterprise tier.
- Need audit logging for compliance? Enterprise tier.
- Need fine-grained access control? Enterprise tier.

These aren't niche features. They're table stakes for any team operating in a regulated environment or at scale.

### The License Risk

Open core vendors can change their license at any time. Elastic did it. HashiCorp did it. Redis Labs did it. MongoDB did it (SSPL). When the business model isn't working, the license gets more restrictive. Your deployment doesn't change, but your legal standing does.

With fully open source software under Apache 2.0 or MIT, this risk is structurally different. Even if the maintainer changes direction, the existing code under the permissive license can be forked. That's exactly what happened — OpenSearch forked from Elasticsearch, OpenTofu forked from Terraform.

### The Vendor Lock-in Angle

Open core creates a subtle form of lock-in. You're not locked into the open source part — you can always fork that. You're locked into the proprietary features you've come to depend on. And migrating away from those features often means migrating away from the entire platform.

## How to Evaluate "Open Source" Claims

When a vendor says they're open source, ask these questions:

1. **What license?** Apache 2.0, MIT, and GPL are legitimate open source licenses (OSI-approved). SSPL, BSL, and "source available" licenses are not.

2. **Is every feature in the repo?** Clone the repo, build it, and compare to the commercial offering. If features are missing, it's open core.

3. **Is there a separate "Enterprise" binary or plugin?** This is the clearest signal. If you need a different binary or a proprietary plugin for certain features, it's open core.

4. **What's the contributor model?** Fully open source projects tend to have diverse contributors from multiple organizations. Open core projects often have commits almost exclusively from the company behind them.

5. **Has the license changed before?** A license change history suggests the company is still figuring out how to monetize. This carries risk.

## The Business Model Question

You might wonder: if everything is open source, how does the company make money?

Several proven models exist:

- **Managed hosting** — Run the software as a service so customers don't have to. Red Hat (RHEL), Canonical (Ubuntu Pro), and most cloud-native projects do this.
- **Support and consulting** — Sell expertise, SLAs, and implementation help.
- **Complementary services** — Offer things that make the open source product better in a hosted context (managed storage, global CDN, premium integrations).

The key insight: you monetize the *convenience and operational burden*, not the *features*. Customers pay because running infrastructure at scale is hard, not because you've locked a checkbox behind a paywall.

## What This Means for Observability

The observability space is particularly affected by the open source vs open core split. Monitoring, alerting, incident management, status pages, log management — these are operational necessities. Gating critical features means teams can't fully respond to incidents without paying enterprise prices.

Consider what happens during an outage at 3 AM:

- With fully open source tooling, every team member has access to every feature. Alerts fire, dashboards load, incident workflows trigger — regardless of your plan tier.
- With open core tooling, you might discover that the escalation policy you need, or the SSO that lets your on-call engineer log in, requires an upgrade.

Observability tools shouldn't have feature gates. When something is on fire, you need everything available to everyone.

## Making the Choice

Neither model is inherently evil. Open core companies need to pay engineers. The question is whether the trade-offs work for your team.

Choose fully open source when:
- You operate in regulated environments needing SSO, RBAC, and audit logs
- You want zero risk of license changes affecting your deployment
- You have the engineering capacity to self-host (or want a managed option without feature gaps)
- You want to contribute back and influence the roadmap

Choose open core when:
- The free tier genuinely covers your needs today *and* for the foreseeable future
- You're comfortable with the vendor's pricing if you grow into enterprise features
- The proprietary features aren't critical to your operations

The distinction matters. "Open source" has become a marketing term that covers a wide range of actual licensing models. Look past the label. Read the license. Check the repo. Understand what you're building on before your team depends on it.
