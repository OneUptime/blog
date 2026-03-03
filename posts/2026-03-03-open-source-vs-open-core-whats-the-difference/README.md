# Open Source vs Open Core: What's the Difference?

Author: [mallersjamie](https://www.github.com/mallersjamie)

Tags: Open Source, Observability, DevOps

Description: A clear breakdown of open source vs open core licensing models, why the distinction matters for engineering teams, and what to watch for when evaluating infrastructure tools.

If you've spent any time evaluating DevOps or observability tools, you've probably noticed that "open source" gets thrown around pretty loosely. Some projects are genuinely open source. Others use an open core model where the free version is intentionally limited to push you toward a paid tier. The difference matters more than most teams realize - especially when you're building critical infrastructure on top of these tools.

Let's break it down.

## What Is Open Source?

Open source means the entire codebase is available under a license that allows anyone to use, modify, and distribute it. The most common licenses are MIT, Apache 2.0, and GPL variants. The key point: there's no "enterprise edition" hiding behind a paywall. What you see is what you get.

Projects like Linux, PostgreSQL, and Kubernetes are fully open source. You can self-host them, fork them, contribute to them, and build commercial products on top of them without restrictions (beyond the license terms).

The economics are different too. Fully open source projects typically make money through hosted services, support contracts, or consulting - not by gating features.

## What Is Open Core?

Open core means the base product is open source, but important features are locked behind a proprietary commercial license. You get a free tier that works, but the features you actually need in production - things like SSO, RBAC, audit logging, advanced integrations, or high availability - require a paid upgrade.

This model is incredibly common in the DevOps and observability space. The pitch is always the same: "We're open source!" But the asterisk is doing a lot of heavy lifting.

Here's what open core typically looks like in practice:

- **Free tier**: Basic functionality, single-user, limited retention, community support only
- **Enterprise tier**: SSO/SAML, RBAC, longer data retention, SLA, dedicated support, clustering

The free version exists primarily as a funnel for the paid product. That's not inherently evil - companies need revenue - but calling it "open source" without qualification is misleading.

## Why the Distinction Matters

### 1. Vendor Lock-In Risk

With open core, you're building on a foundation that can change under you. The vendor decides what stays free and what moves behind the paywall. Features that were free in v2 might require an enterprise license in v3. You have no control over that decision.

With fully open source tools, you always have the option to self-host, fork, or migrate. The community can maintain the project even if the original company changes direction.

### 2. Total Cost of Ownership

Open core tools often look cheap initially. The free tier gets you started, and by the time you need enterprise features, you're already invested. Migration costs are high. The pricing reflects that leverage.

Fully open source tools have a different cost profile. You might spend more on infrastructure and engineering time upfront, but you're not subject to surprise pricing changes or feature gates at renewal time.

### 3. Community and Ecosystem

Open core projects tend to have a split community. Core contributors work on the proprietary features, and the open source community gets the leftovers. Bug fixes for enterprise features don't benefit the community. The incentive structure pulls development toward the paid tier.

Fully open source projects align the incentives differently. Every contribution benefits everyone. The community is unified, and the ecosystem develops around the complete product.

### 4. Security and Auditing

When part of the codebase is proprietary, you can't audit it. For security-sensitive infrastructure like monitoring, incident management, and alerting systems, this is a real concern. You're trusting the vendor with visibility into your production environment without being able to verify what their code actually does.

## The Observability Space Is Full of Open Core

Let's be specific. In the monitoring and observability world, several major players use the open core model:

- **Grafana**: The dashboarding tool is open source (AGPL), but Grafana Cloud and many Grafana Enterprise features (like enhanced RBAC, audit logging, and enterprise plugins) are proprietary.
- **GitLab**: Open core with a very clear free/premium/ultimate tier split.
- **Elastic/Elasticsearch**: After the license change from Apache 2.0 to SSPL/Elastic License, it's arguably not even open core anymore - it's source-available with restrictions.
- **Sentry**: The self-hosted version is open source, but many features and the hosted version have different terms.

This isn't a hit list. These are good products. But teams should understand what they're actually getting when they evaluate them.

## What to Look For When Evaluating Tools

Here's a practical checklist:

**Check the license.** MIT and Apache 2.0 are permissive open source licenses. AGPL is open source but with strong copyleft requirements. SSPL, Elastic License, and BSL (Business Source License) are not open source by OSI standards - they're source-available.

**Look for feature gates.** If the pricing page shows features split across free/pro/enterprise tiers, it's open core. Check which features you'd actually need in production.

**Read the contributor agreement.** Some projects require a CLA (Contributor License Agreement) that gives the company the right to relicense contributions. This is a signal that the company might change the license later.

**Check the commit history.** Are most commits coming from the company's employees, or is there a genuine community? A project dominated by a single company's engineers is more vulnerable to direction changes.

**Ask about data portability.** Can you export your data in a standard format? Can you migrate to a self-hosted version without losing history? Lock-in isn't just about code - it's about data.

## The Case for Fully Open Source Infrastructure

For infrastructure that's central to your operations - monitoring, alerting, incident management, status pages - the licensing model matters. These aren't peripheral tools. They're the systems you rely on when everything else is broken.

A fully open source observability platform means:

- You can self-host with no feature restrictions
- You can audit every line of code that touches your production data
- You're not subject to pricing changes or feature gates
- The community develops the complete product, not just the free tier
- You can fork and customize if needed

The trade-off is real: fully open source projects sometimes move slower than well-funded open core competitors. But the stability, transparency, and long-term cost predictability often make up for it.

## Making the Decision

Neither model is universally better. Open core works well when:

- You need a mature product quickly and have budget
- The enterprise features you need are worth the cost
- Vendor lock-in risk is acceptable for your use case

Fully open source works well when:

- You want full control over your infrastructure
- Security auditing is a requirement
- Long-term cost predictability matters
- You have engineering capacity to self-host and maintain

The key is making an informed decision. Don't assume a tool is fully open source just because it has a GitHub repository. Read the license. Check the feature matrix. Understand what you're actually getting.

## Conclusion

The open source vs open core debate isn't about ideology. It's about understanding what you're building on and what the long-term implications are for your team. Both models produce great software. But they come with fundamentally different trade-offs around cost, control, and risk.

When evaluating infrastructure tools, especially in the observability space, take ten minutes to read the license and check the feature gates. Your future self, stuck in a renewal negotiation or scrambling during an incident, will thank you.
