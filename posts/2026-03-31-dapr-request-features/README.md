# How to Request Features in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Feature Request, Open Source, Proposal, Community

Description: Submit effective Dapr feature requests by writing clear problem statements, providing concrete use cases, and engaging the community through GitHub issues and the proposals process.

---

## The Dapr Feature Request Process

Dapr uses two paths for feature requests:
1. **GitHub Issues** (dapr/dapr) - for smaller, well-scoped features
2. **Proposals** (dapr/proposals) - for significant features requiring design discussion

## When to Use Issues vs Proposals

| Feature Scope | Use |
|---------------|-----|
| Small API addition | GitHub Issue in dapr/dapr |
| New component type | GitHub Issue in dapr/components-contrib |
| New building block | dapr/proposals |
| SDK language feature | SDK-specific repository issue |
| Breaking API change | dapr/proposals |

## Check Existing Requests First

```bash
# Search open feature requests
gh issue list \
  --repo dapr/dapr \
  --label "feature-request" \
  --state open \
  --search "workflow timeout" \
  --limit 10

# Thumbs-up existing requests to signal demand
# Navigate to the issue and add a reaction via GitHub UI
# Or use the API:
gh api repos/dapr/dapr/issues/1234/reactions \
  -X POST \
  -f content="+1"
```

## Write an Effective Feature Request

```bash
gh issue create \
  --repo dapr/dapr \
  --title "feat: add configurable workflow history retention per workflow type" \
  --label "feature-request" \
  --body "$(cat << 'EOF'
## Problem Statement
Currently, Dapr workflow history retention is configured globally via TTL.
High-volume workflows generate excessive history that consumes state store
storage, but low-volume audit workflows need indefinite retention.

## Proposed Solution
Allow TTL configuration per workflow type in the workflow component definition:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflowbackend
spec:
  type: workflow.dapr
  version: v1
  metadata:
    - name: workflowRetentionPolicy
      value: |
        OrderWorkflow: 7d
        AuditWorkflow: indefinite
        AnalyticsWorkflow: 1d
```

## Use Case
Our e-commerce platform runs 50,000 OrderWorkflow instances/day but only
100 AuditWorkflow instances/week. Current global TTL wastes resources on
order history while deleting needed audit records.

## Alternatives Considered
- Manual purge via API (requires custom scheduler, operational overhead)
- Separate Dapr instances per workflow type (excessive resource overhead)

## Additional Context
- Temporal (similar workflow engine) supports per-workflow-type retention
- This is compatible with existing TTL semantics - no breaking change
EOF
)"
```text

## Submit a Formal Proposal

For significant features, submit to `dapr/proposals`:

```bash
git clone https://github.com/YOUR_USERNAME/proposals.git
cd proposals

# Create proposal file
cat > proposals/0040-per-workflow-retention.md << 'EOF'
# Proposal: Per-Workflow-Type History Retention

## Overview
Add support for configuring history retention TTL per workflow type...

## Goals
- Allow different TTLs for different workflow types
- Backward compatible with existing global TTL setting

## Non-Goals
- Manual history compaction
- Cross-component retention policies

## Design
...

## Implementation Plan
1. Update workflow component metadata schema
2. Parse per-type TTL at workflow registration
3. Apply TTL when writing history entries
EOF

git checkout -b proposal/per-workflow-retention
git add proposals/0040-per-workflow-retention.md
git commit -s -m "proposal: add per-workflow-type history retention"

gh pr create \
  --repo dapr/proposals \
  --title "proposal: per-workflow-type history retention" \
  --body "See proposal document for full design."
```

## Engage the Community

After filing, engage to build support:

```bash
# Post in Dapr Discord #general channel
# Share the GitHub issue link with context

# Reference related issues
gh issue comment 1234 \
  --repo dapr/dapr \
  --body "Related to #1100 (global TTL implementation). This extends that with per-type configuration."
```

## Track Your Request

```bash
# Watch the issue for updates (opens in browser to subscribe)
gh issue view 1234 --repo dapr/dapr --web

# Check if it was added to a milestone
gh issue view 1234 --repo dapr/dapr --json milestone
```

## Summary

Effective Dapr feature requests include a clear problem statement with real-world use cases, a concrete proposed API or configuration change, and alternatives considered. Small requests go to GitHub Issues with the `feature-request` label, while architectural changes go through the `dapr/proposals` repository for community design review before implementation begins.
