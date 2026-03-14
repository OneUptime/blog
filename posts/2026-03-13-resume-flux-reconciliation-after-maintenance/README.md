# How to Resume All Flux Reconciliation After Maintenance Window

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Maintenance Window, Recovery

Description: Resume Flux reconciliation after a maintenance window and verify cluster state converges correctly to the Git-declared desired state.

---

## Introduction

Resuming Flux after a maintenance window is as important as pausing it. A careless resume can cause problems: if Git accumulated new commits during the window, Flux will apply all of them simultaneously, potentially flooding the cluster with changes. If a source fails to reconcile, dependent Kustomizations may be stuck. If a HelmRelease upgrade fails, the rollback needs attention.

The correct approach is to resume in a controlled order, watch for failures, and verify the cluster converges to the expected state before declaring the maintenance window closed. This guide covers the resume sequence, verification steps, and how to handle common post-maintenance issues.

## Prerequisites

- Flux CD v2 with all reconcilers suspended (from a previous maintenance window)
- Flux CLI and kubectl installed
- A pre-maintenance snapshot of Flux object state for comparison
- Access to cluster logs and monitoring

## Step 1: Check Git for Changes During the Maintenance Window

Before resuming, understand what Flux will apply when it starts reconciling.

```bash
# Check if any commits were pushed to the platform repo during maintenance
git log --oneline --since="2026-03-13T08:00:00Z" --until="now"

# If there were commits, review them
git log --stat --since="2026-03-13T08:00:00Z"

# If commits contain risky changes, consider reverting them before resuming
# or resuming incrementally rather than all at once
```

## Step 2: Resume Sources First

Sources must be resumed before reconcilers, or reconcilers will fail with source-not-ready errors.

```bash
# Resume all GitRepository sources
kubectl get gitrepositories --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume source git "$name" -n "$ns"
    echo "Resumed GitRepository: $ns/$name"
  done

# Wait for sources to become ready
echo "Waiting for sources to reconcile..."
sleep 30

# Verify sources are ready before proceeding
flux get sources git --all-namespaces
# All sources should show READY: True
```

## Step 3: Resume Infrastructure Reconcilers First

Resume in dependency order: infrastructure before tenants, base components before applications.

```bash
# Resume infrastructure Kustomizations first
flux resume kustomization infrastructure -n flux-system
flux reconcile kustomization infrastructure -n flux-system --with-source

# Wait and check
flux get kustomization infrastructure -n flux-system --watch
# Wait until READY: True appears

# Resume monitoring
flux resume kustomization monitoring -n flux-system
flux reconcile kustomization monitoring -n flux-system

# Resume tenant management
flux resume kustomization tenants -n flux-system
```

## Step 4: Resume All Remaining Reconcilers

After infrastructure is stable, resume the remaining Kustomizations and HelmReleases.

```bash
# Resume all Kustomizations except flux-system managed ones (already done)
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.suspend == true) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume kustomization "$name" -n "$ns"
    echo "Resumed Kustomization: $ns/$name"
    sleep 2   # Small delay to avoid overwhelming the API server
  done

# Resume all HelmReleases
kubectl get helmreleases --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.suspend == true) | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux resume helmrelease "$name" -n "$ns"
    echo "Resumed HelmRelease: $ns/$name"
    sleep 2
  done

echo "All reconcilers resumed at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 5: Force Reconciliation and Verify Convergence

After resuming, trigger immediate reconciliation and watch for convergence.

```bash
# Force all Kustomizations to reconcile now
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux reconcile kustomization "$name" -n "$ns" &
  done

wait  # Wait for all reconciliation triggers to complete

# Watch overall status
watch -n5 'flux get all --all-namespaces | grep -v "True"'
```

## Step 6: Post-Maintenance Verification Checklist

```bash
# Verify all Kustomizations are ready
FAILING=$(flux get kustomizations --all-namespaces | grep "False" | wc -l)
if [ "$FAILING" -gt 0 ]; then
  echo "WARNING: $FAILING Kustomizations are not ready:"
  flux get kustomizations --all-namespaces | grep "False"
else
  echo "✓ All Kustomizations are ready"
fi

# Verify all HelmReleases are ready
HELM_FAILING=$(flux get helmreleases --all-namespaces | grep "False" | wc -l)
if [ "$HELM_FAILING" -gt 0 ]; then
  echo "WARNING: $HELM_FAILING HelmReleases are not ready:"
  flux get helmreleases --all-namespaces | grep "False"
else
  echo "✓ All HelmReleases are ready"
fi

# Check that no Flux objects are still suspended
SUSPENDED=$(kubectl get kustomizations,helmreleases --all-namespaces \
  -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.spec.suspend}{"\n"}{end}' | \
  grep "true" | wc -l)
if [ "$SUSPENDED" -gt 0 ]; then
  echo "WARNING: $SUSPENDED objects are still suspended"
else
  echo "✓ No objects are suspended"
fi

# Verify cluster nodes are healthy
kubectl get nodes
echo ""
echo "Post-maintenance verification complete at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 7: Handle Common Post-Maintenance Failures

```bash
# Scenario: A HelmRelease failed to upgrade after maintenance
flux get helmrelease my-app -n team-alpha
# READY: False  MESSAGE: Helm upgrade failed: ...

# Check the HelmRelease events for details
kubectl describe helmrelease my-app -n team-alpha | tail -20

# Attempt a manual reconciliation with force
flux reconcile helmrelease my-app -n team-alpha --force

# If still failing, check the Helm release history
helm history my-app -n team-alpha

# Roll back if needed
helm rollback my-app 1 -n team-alpha

# Then let Flux reconcile to the Git-declared state
flux reconcile helmrelease my-app -n team-alpha
```

```bash
# Scenario: A GitRepository source fails to authenticate after maintenance
flux get source git flux-system -n flux-system
# READY: False  MESSAGE: authentication required

# Verify the SSH key or token is still valid
flux export source git flux-system -n flux-system | grep secretRef

# Recreate the secret if it was rotated during maintenance
kubectl create secret generic flux-system \
  --from-file=identity=/path/to/new/key \
  --from-file=identity.pub=/path/to/new/key.pub \
  --from-file=known_hosts=/path/to/known_hosts \
  -n flux-system --dry-run=client -o yaml | kubectl apply -f -

flux reconcile source git flux-system -n flux-system
```

## Best Practices

- Resume in dependency order: sources → infrastructure → platform services → applications
- Add a 30-second pause between resuming sources and resuming reconcilers to let sources sync
- Run the verification script and fix any failures before announcing the maintenance window closed
- Compare the post-maintenance Flux state snapshot with the pre-maintenance snapshot to identify unexpected changes
- If a HelmRelease fails post-maintenance, check whether the Helm chart version was updated during the window
- Send a maintenance-complete notification to the team with the reconciliation status summary

## Conclusion

Resuming Flux after a maintenance window requires the same care as pausing it. By resuming in dependency order, verifying convergence before closing the window, and having runbooks for common failure scenarios, you ensure the cluster returns to its declared desired state reliably. The combination of a systematic resume sequence and post-maintenance verification transforms the end of a maintenance window from a moment of uncertainty into a confident, verifiable handoff back to GitOps.
