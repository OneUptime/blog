# How to Perform Fleet Rollbacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Rollback

Description: Learn how to roll back Fleet deployments to a previous state using Git revert, commit pinning, and branch management strategies.

## Introduction

In GitOps, rollbacks are usually performed by reverting Git history or changing the Git reference a deployment tracks rather than manually editing downstream clusters. Fleet automatically detects the Git or GitRepo change and restores the previous configuration across all targeted clusters. This approach maintains audit trails, avoids direct access to each downstream cluster for rollbacks, and keeps Git as the source of the deployed content.

This guide covers several rollback strategies for Fleet deployments, from simple Git reverts to more sophisticated branch-based strategies.

## Prerequisites

- Fleet installed and managing active deployments
- `kubectl` access to Fleet manager
- Git CLI and access to your repository
- Understanding of Git branching and revert operations

## GitOps Rollback Principles

In Fleet (and GitOps generally):
- The Git repository is the source of the deployed manifests and charts
- Rolling back means changing Git history or changing the Git reference that the GitRepo tracks
- Fleet automatically reconciles clusters to match the current GitRepo configuration and selected Git revision
- There is no separate Fleet "rollback command" - rollback is driven by Git history or GitRepo reference changes

## Strategy 1: Git Revert (Recommended)

The safest rollback approach is `git revert`, which creates a new commit that undoes the changes from a previous commit. This preserves history.

```bash
# Step 1: Identify the problematic commit

git log --oneline -10

# Example output:
# a1b2c3d Update image to v2.0.0 (PROBLEMATIC)
# e4f5c6d Add production configmap
# b7c8d9e Initial application deployment

# Step 2: Revert the problematic commit
git revert a1b2c3d --no-edit

# This creates a new commit that undoes the changes:
# f6e5d4c  Revert "Update image to v2.0.0"

# Step 3: Push the revert
git push origin main

# Step 4: Fleet automatically detects the change and rolls back
```

### Verifying the Rollback

```bash
# Monitor Fleet syncing the revert
kubectl get gitrepo my-app -n fleet-default -w

# Check the GitRepo has picked up the expected commit
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath='{.status.commit}'

# Verify the old image/configuration is back
# (On downstream cluster)
kubectl get deployment my-app -n my-app \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Strategy 2: Pinning to a Specific Commit

If you need to roll back quickly without creating a revert commit, you can pin the GitRepo to a specific commit:

```bash
# Step 1: Find the last known good commit
git log --oneline

# Step 2: Pin Fleet's GitRepo to that commit
GOOD_COMMIT="e4f5c6d"

kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p "{\"spec\":{\"revision\":\"${GOOD_COMMIT}\"}}"

# Step 3: Fleet will reconcile all clusters to that commit's state
# Monitor the rollback
kubectl get bundles -n fleet-default -w
```

```bash
# Step 4: After the incident, fix the issue properly
# Edit the manifests to fix the bug

# Step 5: Resume tracking the main branch
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"revision":"","branch":"main"}}'
```

## Strategy 3: Branch-Based Rollback

For larger teams or complex applications, use a branch-based release strategy:

```bash
# Create a release branch from a known good state
git checkout -b release/v1.5.0 e4f5c6d
git push origin release/v1.5.0
```

```yaml
# gitrepo-release.yaml - Track the stable release branch
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app-production
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  # Track the release branch instead of main
  branch: release/v1.5.0
  targets:
    - clusterSelector:
        matchLabels:
          env: production
```

```bash
# To roll back: switch to the previous release branch
kubectl patch gitrepo my-app-production -n fleet-default \
  --type=merge \
  -p '{"spec":{"branch":"release/v1.4.0"}}'
```

## Strategy 4: Tag-Based Rollback

Using Git tags for version control makes rollbacks even more explicit:

```bash
# Tag stable releases
git tag -a v1.5.0 -m "Release v1.5.0"
git push origin v1.5.0

# If v1.5.0 has issues, roll back to v1.4.0
kubectl patch gitrepo my-app -n fleet-default \
  --type=merge \
  -p '{"spec":{"revision":"v1.4.0","branch":""}}'
```

## Rollback for Helm Deployments

For Helm-based Fleet deployments, verify that the downstream Helm release now reflects the expected state. If your `fleet.yaml` sets `helm.releaseName: my-app`, you can check it like this:

```bash
# After Fleet rolls back, verify the Helm release now matches the expected state
# (On downstream cluster)
helm list -n my-app

# Check Helm release history
helm history my-app -n my-app

# Get the currently deployed values
helm get values my-app -n my-app
```

## Emergency Rollback Script

```bash
#!/bin/bash
# emergency-rollback.sh
# Usage: ./emergency-rollback.sh <gitrepo-name> <good-commit> [namespace]

GITREPO_NAME="$1"
GOOD_COMMIT="$2"
NAMESPACE="${3:-fleet-default}"

if [ -z "${GITREPO_NAME}" ] || [ -z "${GOOD_COMMIT}" ]; then
  echo "Usage: $0 <gitrepo-name> <good-commit> [namespace]"
  exit 1
fi

echo "Rolling back ${GITREPO_NAME} to commit ${GOOD_COMMIT}..."

# Pin to the last known good commit
kubectl patch gitrepo "${GITREPO_NAME}" \
  -n "${NAMESPACE}" \
  --type=merge \
  -p "{\"spec\":{\"revision\":\"${GOOD_COMMIT}\"}}"

echo "Rollback initiated. Monitoring..."
kubectl get gitrepo "${GITREPO_NAME}" -n "${NAMESPACE}" -w &
WATCH_PID=$!

# Wait for sync
sleep 30
kill "${WATCH_PID}" 2>/dev/null

# Report status
CURRENT_COMMIT=$(kubectl get gitrepo "${GITREPO_NAME}" \
  -n "${NAMESPACE}" \
  -o jsonpath='{.status.commit}')
echo "GitRepo is now at commit: ${CURRENT_COMMIT}"
```

## Monitoring Rollback Progress

```bash
# Watch the rollback progress across all clusters
kubectl get bundles -n fleet-default -w

# Check bundle deployment status
kubectl get bundledeployments -A

# Verify all clusters are at the rolled-back state
kubectl get bundles -n fleet-default \
  -o jsonpath='{range .items[*]}{.metadata.name}: ready={.status.summary.ready}/{.status.summary.desiredReady}{"\n"}{end}'
```

## Conclusion

Fleet rollbacks leverage Git's natural version control capabilities to restore previous application states across all managed clusters simultaneously. Whether you use `git revert` for production-safe history preservation, commit pinning for immediate emergency rollbacks, or branch/tag-based strategies for structured release management, Fleet ensures all clusters converge to the specified state without manual intervention on each cluster. The key principle is that rollback is driven by Git history or by the Git reference a GitRepo tracks - Fleet takes care of propagating that change to your infrastructure.
