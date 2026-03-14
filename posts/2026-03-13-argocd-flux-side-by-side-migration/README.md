# How to Run ArgoCD and Flux Side by Side During Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Migration, GitOps, Kubernetes, Parallel Operation, Side by Side

Description: Learn how to safely operate ArgoCD and Flux CD in parallel during a gradual migration, avoiding conflicts and ensuring continuous availability.

---

## Introduction

The safest approach to migrating from ArgoCD to Flux CD is a gradual, parallel operation period where both tools run simultaneously in the same cluster but manage different applications. This allows teams to build confidence in Flux CD's behavior, establish runbooks, and validate configuration before the final cutover—without any risk of production outage.

The critical rule is: ArgoCD and Flux must never manage the same Kubernetes resources simultaneously. This guide explains how to enforce that boundary safely.

## Prerequisites

- ArgoCD installed and managing production workloads
- Flux CD bootstrapped in the same cluster (does not conflict with ArgoCD if managing different resources)
- kubectl and both `argocd` and `flux` CLIs installed
- A fleet repository for Flux CD configuration

## Step 1: Bootstrap Flux in the Same Cluster

Flux and ArgoCD can coexist in the same cluster without conflicts as long as they manage separate resources:

```bash
# Bootstrap Flux - it installs in flux-system namespace only
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal

# Verify both are running
kubectl get pods -n flux-system
kubectl get pods -n argocd

# Verify no overlap in managed applications
flux get kustomizations -A
kubectl get applications -n argocd
```

## Step 2: Define the Ownership Boundary

Create a tracking document for application ownership:

```yaml
# docs/migration-status.yaml (stored in Git for visibility)
applications:
  # Managed by ArgoCD (pending migration)
  - name: frontend
    tool: argocd
    status: pending
    priority: high

  - name: backend
    tool: argocd
    status: pending
    priority: medium

  # Migrated to Flux CD
  - name: monitoring
    tool: flux
    status: migrated
    migrated_date: "2026-03-01"

  - name: logging
    tool: flux
    status: migrated
    migrated_date: "2026-03-05"
```

## Step 3: Safe Migration of a Single Application

```bash
# Step 1: Create Flux resources for the application (but don't apply yet)
cat > /tmp/myapp-flux.yaml << 'EOF'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  suspend: true  # START SUSPENDED - don't reconcile yet
EOF

# Step 2: Commit Flux resources to fleet repo (suspended)
git add clusters/production/apps/myapp.yaml
git commit -m "feat: add myapp Flux Kustomization (suspended during migration)"
git push

# Step 3: Suspend ArgoCD Application auto-sync FIRST
argocd app set myapp --sync-policy none
echo "ArgoCD auto-sync disabled for myapp"

# Step 4: Enable Flux reconciliation (remove suspend)
flux resume kustomization myapp -n flux-system
# Or update the YAML: suspend: false

# Step 5: Watch Flux reconcile
flux get kustomizations myapp -n flux-system --watch

# Step 6: Verify resources are still healthy
kubectl get all -n myapp

# Step 7: Remove ArgoCD Application (only after verification)
argocd app delete myapp --cascade=false  # cascade=false preserves resources
```

## Step 4: Preventing Double-Management

The most dangerous scenario is both tools managing the same resource simultaneously. Prevent this with:

```bash
#!/bin/bash
# check-ownership-conflicts.sh
# Verify no resource is managed by both tools

echo "=== Checking for ownership conflicts ==="

# Get all resources managed by Flux
FLUX_RESOURCES=$(kubectl get all -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' \
  -l 'kustomize.toolkit.fluxcd.io/name')

# Get all resources managed by ArgoCD
ARGOCD_RESOURCES=$(kubectl get all -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' \
  -l 'argocd.argoproj.io/app-name')

# Find overlaps
OVERLAP=$(comm -12 \
  <(echo "$FLUX_RESOURCES" | sort) \
  <(echo "$ARGOCD_RESOURCES" | sort))

if [ -n "$OVERLAP" ]; then
  echo "CONFLICT DETECTED: The following resources are managed by both tools:"
  echo "$OVERLAP"
  exit 1
else
  echo "No conflicts detected. Safe to proceed."
fi
```

## Step 5: Monitor Both Systems During Migration

```bash
#!/bin/bash
# monitor-migration.sh - Run periodically during migration period

echo "=== ArgoCD Application Status ==="
argocd app list

echo ""
echo "=== Flux Kustomization Status ==="
flux get kustomizations -A

echo ""
echo "=== Migration Progress ==="
ARGOCD_COUNT=$(kubectl get applications -n argocd --no-headers | wc -l)
FLUX_COUNT=$(flux get kustomizations -A --no-headers | wc -l)
TOTAL=$((ARGOCD_COUNT + FLUX_COUNT))
echo "ArgoCD applications remaining: $ARGOCD_COUNT"
echo "Flux kustomizations migrated: $FLUX_COUNT"
echo "Migration progress: $FLUX_COUNT/$TOTAL applications"
```

## Step 6: Rollback Procedure

If a Flux migration goes wrong, roll back to ArgoCD:

```bash
# Suspend Flux reconciliation immediately
flux suspend kustomization myapp -n flux-system

# Re-enable ArgoCD auto-sync
argocd app set myapp --sync-policy automated --self-heal

# Trigger ArgoCD sync to restore desired state
argocd app sync myapp

# Verify ArgoCD has taken back control
argocd app get myapp
```

## Best Practices

- Never enable Flux reconciliation for an application while ArgoCD auto-sync is still enabled for the same application.
- Always start Flux Kustomizations with `suspend: true` and verify them before resuming.
- Use namespace label selectors to track which namespace is owned by which tool.
- Run the ownership conflict check script before every migration step.
- Keep ArgoCD running and healthy throughout the migration; don't uninstall it until migration is 100% complete.
- Communicate migration timelines to all stakeholders so they know which tool to consult during the transition period.

## Conclusion

Running ArgoCD and Flux side by side is safe and recommended for gradual migrations. The key is enforcing a strict ownership boundary: one tool per application at any given time. Starting new Flux Kustomizations in suspended state, disabling ArgoCD auto-sync before activating Flux, and running regular ownership conflict checks makes the migration process systematic and reversible at every step.
