# How to Pin an Application to a Specific Git Commit in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Deployment

Description: Learn how to pin an ArgoCD application to a specific Git commit SHA for maximum deployment control and reproducibility.

---

Sometimes you need absolute precision over what is deployed to your cluster. While tracking branches gives you continuous delivery and tracking tags gives you versioned releases, pinning to a specific Git commit SHA gives you the most deterministic deployment possible. No matter what happens to branches or tags in your repository, a commit-pinned application always deploys exactly the same state.

In this guide, we will cover when and how to pin ArgoCD applications to specific commits, and discuss the operational patterns around this approach.

## When to Pin to a Specific Commit

Pinning to a commit is useful in several scenarios:

- **Incident response**: You need to lock a production deployment to a known good state while investigating an issue.
- **Compliance requirements**: Your audit process requires that deployments reference exact commit SHAs rather than mutable references.
- **Debugging**: You want to deploy a specific historical state to reproduce a bug.
- **Hotfix isolation**: You need to cherry-pick and deploy a specific change without pulling in other commits on the branch.

## Configuring Commit-Pinned Applications

To pin an application to a specific commit, set the `targetRevision` to the full commit SHA:

```yaml
# production-app.yaml - pinned to a specific commit
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    # Use the full 40-character commit SHA
    targetRevision: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Using the CLI:

```bash
# Pin to a specific commit
argocd app create my-app-production \
  --repo https://github.com/myorg/my-manifests.git \
  --path k8s/overlays/production \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production \
  --revision a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

You can also use a short SHA (first 7-12 characters), but using the full SHA is recommended to avoid ambiguity:

```bash
# Short SHA works but full SHA is safer
argocd app set my-app-production --revision a1b2c3d
```

## Finding the Right Commit SHA

Before pinning, you need to identify the correct commit. Here are some common approaches:

```bash
# Get the latest commit on a branch
git log main --oneline -5
# Output:
# a1b2c3d Fix ingress configuration
# e4f5g6h Add resource limits
# i7j8k9l Update configmap values
# m0n1o2p Initial production config

# Get the commit that a tag points to
git rev-parse v1.5.2
# Output: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2

# Find the commit currently deployed by ArgoCD
argocd app get my-app-production -o json | jq -r '.status.sync.revision'
```

## Pinning During an Incident

A common real-world scenario is locking down a deployment during an incident. Here is the workflow:

```bash
# Step 1: Find the last known good commit
# Check the ArgoCD history
argocd app history my-app-production

# Output:
# ID  DATE                 REVISION
# 5   2026-02-26 10:00:00  a1b2c3d4 (current - has issues)
# 4   2026-02-25 15:00:00  x9y8z7w6 (last known good)
# 3   2026-02-24 12:00:00  p5q4r3s2

# Step 2: Pin to the last known good commit
argocd app set my-app-production --revision x9y8z7w6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4

# Step 3: Disable auto-sync to prevent accidental updates
argocd app set my-app-production --sync-policy none

# Step 4: Sync to the pinned commit
argocd app sync my-app-production

# Step 5: Verify the rollback
argocd app get my-app-production
```

## Combining Commit Pinning with Sync Policies

When you pin to a commit, you often want to temporarily disable auto-sync to prevent ArgoCD from overwriting your pinned state:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
  annotations:
    # Document why the app is pinned
    pinned-reason: "Incident INC-1234: Rolling back to pre-regression state"
    pinned-by: "oncall-engineer"
    pinned-at: "2026-02-26T10:30:00Z"
spec:
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    targetRevision: x9y8z7w6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  # No syncPolicy.automated - manual sync only while pinned
  syncPolicy: {}
```

Adding annotations to document why the application is pinned is good practice. It helps the next person who looks at the application understand the context.

## Verifying the Pinned State

After pinning, verify that ArgoCD is using the correct commit:

```bash
# Check the target revision (what you configured)
argocd app get my-app-production -o json | jq -r '.spec.source.targetRevision'

# Check the sync revision (what is actually deployed)
argocd app get my-app-production -o json | jq -r '.status.sync.revision'

# Both should match the commit SHA you pinned to
```

## Unpinning and Returning to Branch Tracking

Once an incident is resolved or you no longer need the pin, switch back to branch or tag tracking:

```bash
# Switch back to tracking the main branch
argocd app set my-app-production --revision main

# Re-enable auto-sync
argocd app set my-app-production \
  --sync-policy automated \
  --auto-prune \
  --self-heal

# Sync to get the latest state from the branch
argocd app sync my-app-production
```

## Commit Pinning in an App-of-Apps Setup

If you use the app-of-apps pattern, you can manage commit pins through your parent application's Git repository:

```yaml
# In your app-of-apps repo: apps/production/my-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    targetRevision: x9y8z7w6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

This way, the pin itself is tracked in Git, giving you an audit trail of when and why the application was pinned.

## Trade-offs of Commit Pinning

Commit pinning provides maximum control but comes with operational overhead:

- **Pro**: Completely deterministic - the deployed state cannot change without an explicit update.
- **Pro**: Perfect for auditing and compliance.
- **Con**: Requires manual updates for every deployment.
- **Con**: Commit SHAs are not human-readable, making it harder to know what is deployed at a glance.

For most teams, a hybrid approach works best: use branch tracking for dev/staging, tag tracking for production releases, and commit pinning for incident response or compliance-critical applications.

## Summary

Pinning an ArgoCD application to a specific Git commit SHA gives you the highest level of deployment control. Set `targetRevision` to the full commit SHA, and consider disabling auto-sync while pinned. This approach is particularly valuable during incidents when you need to lock down a known good state. For day-to-day operations, combine commit pinning with [tag-based tracking](https://oneuptime.com/blog/post/2026-02-26-argocd-track-git-tag/view) for a robust promotion workflow.
