# How to Follow Istio Roadmap

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Roadmap, Planning, Kubernetes, Service Mesh

Description: Learn how to track Istio's development roadmap, understand release cycles, and stay informed about upcoming features and changes.

---

Keeping up with Istio's development direction matters if you're running it in production or evaluating it for your organization. The project moves fast, and knowing what's coming next helps you plan upgrades, avoid deprecated features, and take advantage of new capabilities before your competitors do. Here's how to stay in the loop.

## Where the Roadmap Lives

Istio publishes its roadmap on the official website at `istio.io/latest/about/feature-stages/`. This page breaks down features by their maturity level and shows what's being actively worked on.

But the website roadmap is just the tip of the iceberg. The real planning happens across several places:

1. **GitHub Milestones**: Each release has a milestone with the issues and PRs targeted for it
2. **Working Group Meetings**: Technical direction is discussed in weekly/biweekly calls
3. **Design Documents**: Major features go through a design proposal process
4. **Release Notes**: Show what actually shipped in each version
5. **Blog Posts**: The Istio blog announces major features and direction changes

## Understanding Feature Stages

Istio uses a feature maturity model that you should understand when reading the roadmap:

| Stage | Meaning |
|---|---|
| Experimental | Feature is new, API may change, not recommended for production |
| Alpha | Feature is functional but not fully tested, API may still change |
| Beta | Feature is well-tested, API is stable, safe for production with caution |
| Stable | Feature is production-ready, API is locked, backward compatibility guaranteed |

When evaluating features for production use, stick to Beta or Stable features. Experimental and Alpha features can change or be removed entirely between releases.

You can check the current feature status:

```bash
# The feature status page lists every feature and its current stage
# https://istio.io/latest/about/feature-stages/

# You can also check what's supported in your installed version
istioctl version

# Review the configuration that's available
kubectl api-resources | grep istio
```

## Tracking GitHub Milestones

Every Istio release is tracked through GitHub milestones. To see what's planned for the next release:

```bash
# Using the GitHub CLI
gh api repos/istio/istio/milestones --jq '.[] | {title: .title, open_issues: .open_issues, due_on: .due_on}'

# Or visit directly:
# https://github.com/istio/istio/milestones
```

Each milestone shows the issues and PRs that are targeted for that release. You can filter by label to see specific areas:

```
# All networking features planned for a milestone
https://github.com/istio/istio/issues?q=milestone:"1.23"+label:area/networking

# All bug fixes planned
https://github.com/istio/istio/issues?q=milestone:"1.23"+label:kind/bug
```

## Following Design Proposals

Major features go through a formal design process. Design documents are typically shared as Google Docs linked from GitHub issues, or as markdown files in the repository. These proposals contain:

- Problem statement
- Proposed solution
- API changes
- Migration plan
- Alternatives considered

To find active design proposals:

```bash
# Search for design docs on GitHub
# https://github.com/istio/istio/issues?q=is:open+label:kind/design-doc

# The community also uses Google Docs for design proposals
# Links are shared in working group meetings and on the mailing list
```

Reading design proposals is the best way to understand not just what's coming, but why. You'll get insight into the trade-offs and constraints that shape the project's direction.

## Subscribing to Release Announcements

Istio publishes detailed release notes with every version. There are several ways to get notified:

### Watch the Releases on GitHub

```bash
# You can watch for releases only (without getting all issue notifications)
# Go to https://github.com/istio/istio
# Click "Watch" -> "Custom" -> check "Releases"
```

### Follow the Istio Blog

The Istio blog at `istio.io/latest/blog/` publishes announcements for major releases, security advisories, and feature highlights. You can subscribe via RSS:

```
# RSS feed URL
https://istio.io/latest/blog/feed.xml
```

### Join the Mailing List

Release announcements go out on the `istio-announce@googlegroups.com` mailing list. This is a low-traffic list that only sends notifications for releases and security advisories.

## Understanding the Release Cycle

Istio follows a predictable release cadence:

- **Minor releases** (1.x.0) ship roughly every quarter
- **Patch releases** (1.x.y) ship as needed for bug fixes and security patches
- **Support window**: Each minor release is supported with patches for about 6 months after release
- **Upgrade path**: You can upgrade one minor version at a time (e.g., 1.21 to 1.22, not 1.20 to 1.22)

Here's how to check which versions are currently supported:

```bash
# The support status is published at:
# https://istio.io/latest/docs/releases/supported-releases/

# Check your current version against the support matrix
istioctl version

# You can also see all available versions
# https://github.com/istio/istio/releases
```

## Tracking Deprecations

This is a big one that people often miss. Features and APIs get deprecated before they're removed, and you need to know about it to plan your upgrades.

```bash
# Check for deprecated features in your current configuration
istioctl analyze --all-namespaces

# This will warn you about:
# - Deprecated API versions
# - Configuration that will change in future versions
# - Best practice violations
```

Deprecation notices appear in release notes and on the feature stages page. When a feature moves to "Deprecated" status, you typically have at least two minor releases before it's removed.

## Watching Working Group Progress

Working groups are where the real decisions happen. Each group has regular meetings and publishes notes. Here's how to follow them:

```bash
# Working group information is at:
# https://github.com/istio/community/blob/master/WORKING-GROUPS.md

# Meeting notes are published in shared Google Docs
# Links are available in the community repository and calendar
```

The most active working groups to follow are:

- **Networking WG**: If you care about traffic management, gateways, and virtual services
- **Security WG**: If you care about mTLS, authorization, and certificate management
- **Environments WG**: If you care about platform support and installation

## Building Your Own Tracking System

If you want to stay systematically informed, here's a practical approach:

1. **Weekly**: Skim the `#istio-dev` Slack channel for significant discussions
2. **Monthly**: Review the GitHub milestone for the next release
3. **Quarterly**: Read the full release notes for new minor versions
4. **Always**: Run `istioctl analyze` after upgrades to catch deprecated features

You can also set up GitHub notifications with filters:

```bash
# Use gh CLI to check for new issues with specific labels
gh issue list --repo istio/istio --label "kind/design-doc" --state open

# Check recent PRs in an area you care about
gh pr list --repo istio/istio --label "area/networking" --state open --limit 10
```

## Key Areas to Watch Right Now

As of early 2026, some of the most significant areas of development include:

- **Ambient Mesh**: The sidecar-less data plane mode is maturing rapidly
- **Gateway API support**: Istio is moving toward the Kubernetes Gateway API as the primary ingress API
- **Multi-cluster improvements**: Simpler setup and better cross-cluster connectivity
- **Performance**: Continued work on reducing resource overhead, especially with ztunnel

Understanding the roadmap isn't just about knowing what features are coming. It's about making informed decisions about when to adopt new capabilities, when to upgrade, and how to plan your own infrastructure roadmap around Istio's direction. The project is transparent about its plans, and taking advantage of that transparency gives you a real edge.
