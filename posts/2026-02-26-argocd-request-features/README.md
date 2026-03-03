# How to Request Features for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Open Source, Community

Description: Learn how to write compelling feature requests for ArgoCD that get accepted, including proposal structure, community engagement, and implementation strategies.

---

ArgoCD evolves based on community needs. Some of the most impactful features in ArgoCD - like ApplicationSets, multi-source Applications, and the notification engine - started as community feature requests. Getting a feature accepted and implemented requires more than just saying "I want this." You need to clearly articulate the problem, propose a solution, and demonstrate that others share the need. This guide walks through the entire process of making effective feature requests for the ArgoCD project.

## Understanding the ArgoCD Feature Process

ArgoCD uses GitHub issues and proposals for feature requests. The process generally follows these stages:

```mermaid
flowchart LR
    A[Feature Request Issue] --> B[Community Discussion]
    B --> C[Design Proposal]
    C --> D[Maintainer Approval]
    D --> E[Implementation PR]
    E --> F[Release]
```

Small features can go directly from a GitHub issue to a PR. Larger features that change architecture, APIs, or user experience require a formal design proposal.

## Writing a Compelling Feature Request

Start by creating a GitHub issue using the feature request template. The quality of your request directly impacts whether it gets attention.

### Define the Problem First

The most common mistake in feature requests is jumping straight to a solution without explaining the problem. Maintainers need to understand why this matters.

```markdown
## Problem Statement

When managing 200+ Applications across 15 clusters, there is no way to
bulk-sync applications that share a common label. Currently, operators must
either sync each application individually through the UI/CLI or write custom
scripts that call the ArgoCD API.

This is particularly painful during cluster upgrades when we need to re-sync
all applications targeting a specific cluster after the upgrade completes.

### Who is affected?
- Platform teams managing large-scale multi-cluster deployments
- Organizations with 100+ ArgoCD Applications

### Current workaround
We wrote a bash script that calls the ArgoCD API in a loop:
```

```bash
#!/bin/bash
# Current workaround - fragile and lacks proper error handling
APPS=$(argocd app list -l cluster=production -o name)
for app in $APPS; do
    argocd app sync "$app" --async
    echo "Triggered sync for $app"
done
```

### Propose a Solution

After establishing the problem, describe your proposed solution. Be specific but leave room for the maintainers to suggest alternatives.

```markdown
## Proposed Solution

Add a `--selector` flag to `argocd app sync` that allows bulk-syncing
applications matching a label selector:

```bash
# Sync all apps with the cluster=production label
argocd app sync --selector cluster=production

# Sync all apps in a specific project
argocd app sync --selector project=payments

# Combine with existing sync options
argocd app sync --selector cluster=production --prune --force
```

### API Changes

Add a new endpoint or extend the existing sync endpoint:

```text
POST /api/v1/applications/bulk-sync
{
  "selector": "cluster=production",
  "syncOptions": {
    "prune": true,
    "dryRun": false
  }
}
```

### UI Changes

Add a "Sync Selected" button to the Applications list view when
applications are selected via checkboxes.
```text

### Explain the Impact

Help maintainers understand the scope and value.

```markdown
## Impact

- **User impact:** Reduces time to re-sync a cluster's applications from
  30+ minutes of manual work to a single command
- **Complexity:** Medium - requires changes to CLI, API, and UI
- **Breaking changes:** None - this is purely additive
- **Related issues:** #12345, #67890
```

## Preparing a Design Proposal

For significant features, maintainers will ask for a design document. ArgoCD uses a proposal process similar to Kubernetes Enhancement Proposals (KEPs).

Create a proposal document in the `docs/proposals` directory of the ArgoCD repo.

```markdown
# Bulk Application Sync

## Summary
Add the ability to sync multiple ArgoCD Applications simultaneously
using label selectors, both via CLI and API.

## Motivation
[Expand on the problem statement from the issue]

## Goals
- Allow syncing multiple applications via label selector
- Support all existing sync options (prune, dry-run, force, etc.)
- Provide progress tracking for bulk operations
- Rate-limit concurrent syncs to prevent API server overload

## Non-Goals
- This proposal does not cover bulk delete or bulk update operations
- Cross-cluster sync ordering is out of scope

## Proposal

### CLI Interface
[Detailed CLI specification]

### API Interface
[Detailed API specification with request/response schemas]

### Controller Changes
[How the controller will handle bulk sync requests]

### Rate Limiting
[Strategy for preventing resource exhaustion]

## Alternatives Considered

### Alternative 1: ApplicationSet-based bulk sync
[Why this was rejected]

### Alternative 2: External controller approach
[Why this was rejected]

## Security Considerations
- RBAC enforcement for each application in the bulk operation
- Rate limiting to prevent DoS scenarios
```

## Engaging with the Community

Feature requests that gain community support are far more likely to be implemented.

### Build Support

Share your feature request in the ArgoCD community channels.

```bash
# Post in the CNCF Slack #argo-cd channel
# Present at the ArgoCD community meeting (bi-weekly)
# Share on social media with relevant hashtags
```

### Provide Data

Numbers make your case stronger. If you can quantify the impact, do it.

```markdown
## Community Interest

- This issue has been referenced in 15 separate bug reports
- Survey of our 200-person platform engineering team:
  87% said bulk operations are a top-3 missing feature
- Similar functionality exists in FluxCD (flux reconcile --selector)
  and is heavily used
```

### Offer to Implement

Nothing accelerates a feature request like volunteering to build it. Even if you are not sure you can complete it alone, offering to contribute shows commitment.

```markdown
## Implementation Plan

I am willing to implement this feature. My proposed approach:

1. Week 1: CLI changes and unit tests
2. Week 2: API server changes
3. Week 3: Controller changes and rate limiting
4. Week 4: UI changes and E2E tests

I have Go and React experience and have previously contributed to
ArgoCD (PR #11234, #11567).
```

## What Makes Features Get Accepted

Based on observing the ArgoCD project over several years, here are the patterns that lead to feature acceptance:

**Alignment with project goals.** ArgoCD is a GitOps continuous delivery tool. Features that strengthen its core mission - declarative, Git-based application delivery - are prioritized over tangential functionality.

**Backward compatibility.** Features that do not break existing behavior are strongly preferred. If your feature requires API changes, provide a clear migration path.

**Maintainability.** Simple, well-tested implementations are preferred over clever ones. The maintainers have to support this code for years.

**Broad applicability.** Features that benefit many users get priority over niche use cases. If your feature only helps in a very specific scenario, it might be better implemented as a plugin or extension.

**Clean scope.** Keep your feature request focused on one thing. Bundling multiple features into one request makes it harder to evaluate and implement.

## Handling Rejection

Not every feature request will be accepted, and that is okay. Common reasons for rejection include:

- The feature overlaps with existing functionality
- The maintenance burden is too high relative to the benefit
- It conflicts with the project's architecture or direction
- It is better suited as an external plugin or extension

If your request is rejected, ask for feedback and consider whether the feature could be implemented as a Config Management Plugin, a custom controller, or an external tool that integrates with the ArgoCD API.

```yaml
# Example: Implementing a rejected feature as a CMP
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-bulk-sync-plugin
  namespace: argocd
data:
  plugin.yaml: |
    apiVersion: argoproj.io/v1alpha1
    kind: ConfigManagementPlugin
    metadata:
      name: bulk-sync-helper
    spec:
      generate:
        command: ["/bin/bash", "-c"]
        args: ["python3 /scripts/bulk-sync.py"]
```

## After Your Feature Is Accepted

Once a feature is approved, stay engaged during implementation.

- Review the implementation PR if someone else builds it
- Test pre-release builds that include the feature
- Write documentation for the new feature
- Share your experience in the community to help others adopt it

The ArgoCD community thrives on thoughtful contributions. By following this process, you not only improve the tool for yourself but for the thousands of teams worldwide that depend on ArgoCD for their deployment workflows.

For monitoring ArgoCD after new features are deployed to your clusters, see our guide on [effective ArgoCD bug reporting](https://oneuptime.com/blog/post/2026-02-26-argocd-report-bugs-effectively/view) to ensure any issues are caught and reported properly.
