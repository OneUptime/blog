# How to Implement GitOps Without Breaking Existing Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Migration, CI/CD

Description: A practical guide to introducing GitOps into existing CI/CD workflows gradually without disrupting team productivity or breaking current deployment processes.

---

The biggest risk when adopting GitOps is not the technology itself. It is disrupting the workflows your team already relies on. Engineers have muscle memory for their current deployment process. Breaking that muscle memory all at once leads to frustration, mistakes, and resistance.

The key is to introduce GitOps alongside your existing workflows, proving value incrementally before migrating fully. This guide walks through a pragmatic approach that respects your team's existing processes.

## Assess Your Current State

Before changing anything, document what you have today. Answer these questions:

- How do deployments currently work? (Pipeline steps, manual approvals, etc.)
- Who has cluster access and how is it managed?
- How are secrets injected into deployments?
- How do rollbacks work today?
- What monitoring and alerting exists for deployments?
- How many services do you manage and across how many clusters?

Create a simple inventory:

```text
Service: payment-api
Current deployment: GitHub Actions -> kubectl apply
Frequency: 3-4 times per week
Rollback method: kubectl rollout undo
Secrets: Injected via pipeline from AWS Secrets Manager
Owner: payments team
Risk level: High
```

This inventory tells you where to start and what to avoid in early migration phases.

## Phase 1: Install ArgoCD in Observation Mode

Start by installing ArgoCD without connecting it to any deployment workflows. Configure it to observe your existing applications:

```yaml
# Create an ArgoCD application that observes but does not sync
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-api-observe
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: HEAD
    path: services/payment-api/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  # No syncPolicy - ArgoCD just watches
```

Without a `syncPolicy`, ArgoCD will show you the current state of the application, detect any differences between Git and the cluster, and provide a dashboard view. It changes nothing.

This gives your team time to get familiar with the ArgoCD UI and understand what drift looks like - all without risk.

## Phase 2: Migrate Non-Critical Services First

Pick services where a deployment mistake has minimal impact:

- Internal tools and dashboards
- Development environment services
- Batch processing jobs
- Documentation sites

For these services, enable automated sync:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: internal-dashboard
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: HEAD
    path: services/internal-dashboard/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
```

At this point, your CI pipeline for these services needs a small change. Instead of deploying directly, it updates the manifest repository:

```yaml
# Modified CI pipeline - updates Git instead of deploying
deploy:
  steps:
  - name: Update image tag
    run: |
      # Clone the GitOps repo
      git clone https://github.com/org/k8s-manifests
      cd k8s-manifests

      # Update the image tag
      yq e '.spec.template.spec.containers[0].image = "app:${{ github.sha }}"' \
        -i services/internal-dashboard/dev/deployment.yaml

      # Commit and push
      git add .
      git commit -m "Update internal-dashboard to ${{ github.sha }}"
      git push
```

Your team still triggers deployments the same way - by merging PRs and pushing code. The deployment path just goes through Git now.

## Phase 3: Run Both Systems in Parallel

For important services, run the old pipeline and ArgoCD side by side before cutting over. Here is how:

1. Configure ArgoCD to watch the manifests but do not enable auto-sync
2. Keep the existing pipeline deploying as usual
3. After each deployment, check the ArgoCD UI to verify it shows "Synced"

```yaml
# ArgoCD watches but pipeline still deploys
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-api-parallel
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: HEAD
    path: services/payment-api/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  # Manual sync only - pipeline still does the actual deploy
```

If ArgoCD shows "OutOfSync" after a pipeline deployment, it means your pipeline and your Git manifests do not agree. Fix this alignment before proceeding.

This parallel phase builds confidence. When ArgoCD consistently shows "Synced" after pipeline deployments, you know the Git state matches reality.

## Phase 4: Cut Over One Service at a Time

When the team is comfortable, switch one service at a time from pipeline deployment to ArgoCD:

```yaml
# Enable auto-sync for a specific service
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-api
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/k8s-manifests
    targetRevision: HEAD
    path: services/payment-api/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
    - Validate=true
```

Simultaneously, remove the deploy step from the CI pipeline and replace it with the Git update step:

```yaml
# CI pipeline now only builds and updates Git
jobs:
  build:
    steps:
    - name: Build and push image
      run: docker build -t app:${{ github.sha }} . && docker push app:${{ github.sha }}

  update-manifests:
    needs: build
    steps:
    - name: Update GitOps repo
      run: |
        git clone https://github.com/org/k8s-manifests
        cd k8s-manifests
        yq e '.spec.template.spec.containers[0].image = "app:${{ github.sha }}"' \
          -i services/payment-api/production/deployment.yaml
        git add . && git commit -m "Update payment-api" && git push
```

Keep the old pipeline code commented out (not deleted) for the first two weeks. If anything goes wrong, you can switch back quickly.

## Handling Secrets During Migration

If your current pipeline injects secrets during deployment, you need to migrate to a GitOps-compatible secrets solution before cutting over:

```yaml
# Before: Pipeline injects secrets
# deploy step: kubectl create secret ... && kubectl apply -f deployment.yaml

# After: External Secrets Operator manages secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-api-secrets
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: payment-api-secrets
  data:
  - secretKey: DATABASE_URL
    remoteRef:
      key: production/payment-api
      property: database_url
```

Install the External Secrets Operator and migrate secrets before switching the service to ArgoCD deployment. This is a prerequisite, not something to figure out later.

## Communication and Documentation

Create a simple runbook for the team that covers:

1. How to deploy a new version (commit to Git)
2. How to roll back (revert the Git commit)
3. How to check deployment status (ArgoCD UI or CLI)
4. How to handle emergencies (documented escape hatch)

```bash
# Quick reference card for the team

# Deploy a new version:
# 1. Update image tag in k8s-manifests repo
# 2. Create PR, get approval, merge
# 3. ArgoCD auto-syncs within 3 minutes

# Check status:
argocd app get payment-api

# Rollback:
git revert HEAD
git push origin main

# Emergency - manual sync:
argocd app sync payment-api --revision <previous-sha>
```

Post this in your team's Slack channel and wiki. The simpler the documentation, the more likely people will follow it.

## Measuring Migration Progress

Track migration progress to keep momentum:

```text
Total services: 45
Observed by ArgoCD: 45 (100%)
Managed by ArgoCD (auto-sync): 32 (71%)
Still using pipeline deploy: 13 (29%)
Target completion: Month 4
```

For monitoring the health of both your old pipeline deployments and new GitOps-managed services during the transition, setting up unified alerting through [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-failed-syncs/view) ensures nothing falls through the cracks.

## Summary

Implementing GitOps without breaking existing workflows requires a phased approach. Start with observation mode to build familiarity. Migrate non-critical services first to build confidence. Run parallel systems for important services to verify alignment. Cut over one service at a time with rollback capability. Migrate secrets management before switching deployment methods. Document the new workflow clearly and track migration progress. The goal is zero disruption to existing deployment capability at every step of the migration.
