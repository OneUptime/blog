# How to Plan a Migration from ArgoCD to Flux CD Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Migration, GitOps, Kubernetes, Planning

Description: A practical step-by-step guide to planning and executing a migration from ArgoCD to Flux CD with minimal disruption to production workloads.

---

## Introduction

Migrating from ArgoCD to Flux CD is a strategic decision that requires careful planning, parallel operation periods, and thorough validation. The migration is not just a tooling change—it changes how your team thinks about deployments, how secrets are managed, and how notifications work. Done well, it can be nearly invisible to application teams; done poorly, it can cause downtime.

This guide provides a structured migration plan covering discovery, parallel operation, workload migration, and cutover strategies.

## Prerequisites

- ArgoCD installed and managing production workloads
- A fleet repository ready for Flux CD
- `flux` CLI installed
- Understanding of both ArgoCD and Flux CD concepts
- A staging environment for testing the migration

## Step 1: Discovery and Inventory

Before writing any Flux YAML, inventory all ArgoCD resources:

```bash
# Export all ArgoCD Applications
kubectl get applications -n argocd -o yaml > argocd-applications-backup.yaml

# Count applications by project
kubectl get applications -n argocd \
  -o jsonpath='{range .items[*]}{.spec.project}{"\n"}{end}' | sort | uniq -c

# List all source repositories
kubectl get applications -n argocd \
  -o jsonpath='{range .items[*]}{.spec.source.repoURL}{"\n"}{end}' | sort -u

# Identify Helm vs Kustomize vs plain YAML applications
kubectl get applications -n argocd \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.spec.source.helm.chart}{"\n"}{end}'

# List all AppProjects
kubectl get appprojects -n argocd -o yaml > argocd-projects-backup.yaml

# Export ImageUpdater annotations
kubectl get applications -n argocd \
  -o jsonpath='{range .items[*]}{.metadata.name}{": "}{.metadata.annotations}{"\n"}{end}'
```

## Step 2: Create the Migration Matrix

Document each application with its migration complexity:

```
| Application | Source Type | Sync Waves | Hooks | Notifications | Complexity |
|-------------|-------------|------------|-------|---------------|------------|
| frontend    | Helm        | No         | No    | Slack         | Low        |
| backend     | Kustomize   | Yes        | No    | PagerDuty     | Medium     |
| database    | Helm        | Yes        | Yes   | PagerDuty     | High       |
```

## Step 3: Bootstrap Flux CD in the Same Cluster

Run Flux alongside ArgoCD during the migration period:

```bash
# Bootstrap Flux - it will not conflict with ArgoCD resources
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal

# Verify Flux is running
flux check
kubectl get pods -n flux-system
```

## Step 4: Migrate Applications in Waves

Create a migration script to convert ArgoCD Applications to Flux Kustomizations:

```bash
#!/bin/bash
# migrate-app.sh - Convert a single ArgoCD Application to Flux resources

APP_NAME=$1
NAMESPACE=$(kubectl get application $APP_NAME -n argocd -o jsonpath='{.spec.destination.namespace}')
SOURCE_PATH=$(kubectl get application $APP_NAME -n argocd -o jsonpath='{.spec.source.path}')
REPO_URL=$(kubectl get application $APP_NAME -n argocd -o jsonpath='{.spec.source.repoURL}')
BRANCH=$(kubectl get application $APP_NAME -n argocd -o jsonpath='{.spec.source.targetRevision}')

# Generate Flux Kustomization
cat > clusters/production/apps/${APP_NAME}.yaml << EOF
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: ${APP_NAME}
  namespace: flux-system
spec:
  interval: 1m
  url: ${REPO_URL}
  ref:
    branch: ${BRANCH}
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ${APP_NAME}
  namespace: flux-system
spec:
  interval: 5m
  path: ${SOURCE_PATH}
  prune: true
  sourceRef:
    kind: GitRepository
    name: ${APP_NAME}
  targetNamespace: ${NAMESPACE}
EOF

echo "Generated Flux resources for $APP_NAME"
```

## Step 5: Define the Cutover Process

For each application migration:

1. Add the Flux Kustomization to the fleet repo (commit to main)
2. Suspend the ArgoCD Application (disable auto-sync)
3. Verify Flux is reconciling the same resources
4. Compare resource states between ArgoCD and Flux
5. Delete the ArgoCD Application
6. Remove the ArgoCD suspension

```bash
# Step 1: Commit Flux resources
git add clusters/production/apps/myapp.yaml
git commit -m "feat: migrate myapp to Flux CD"
git push

# Step 2: Suspend ArgoCD Application (prevents double-management)
kubectl patch application myapp -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'

# Step 3: Verify Flux is reconciling
flux get kustomizations myapp -n flux-system

# Step 4: Compare states
kubectl get all -n myapp

# Step 5: Remove ArgoCD Application
kubectl delete application myapp -n argocd

# Verify resources still exist (managed by Flux now)
kubectl get all -n myapp
```

## Step 6: Validate and Cleanup

After migrating all applications:

```bash
# Verify no ArgoCD Applications remain
kubectl get applications -n argocd

# Verify all Flux Kustomizations are Ready
flux get kustomizations -A

# Uninstall ArgoCD (only after full validation)
kubectl delete namespace argocd

# Final verification
flux check
kubectl get pods -n flux-system
```

## Best Practices

- Migrate in waves: start with low-complexity, low-traffic applications in staging before touching production.
- Never let ArgoCD and Flux manage the same resources simultaneously; suspend ArgoCD before Flux takes over.
- Keep the ArgoCD installation running and healthy during the migration; don't uninstall it until all applications are migrated.
- Document each application's migration status in a shared tracking document.
- Test rollback procedures: if Flux migration fails, you should be able to re-enable ArgoCD auto-sync.
- Run the migration during business hours with the team available, not during off-hours.

## Conclusion

Migrating from ArgoCD to Flux CD is achievable with a methodical, wave-based approach. The parallel operation period—running both tools simultaneously on different applications—is critical for building confidence and establishing migration patterns. Allow at least 2-4 weeks for the migration of a medium-complexity environment, and longer for environments with many hooks, waves, or custom health checks.
