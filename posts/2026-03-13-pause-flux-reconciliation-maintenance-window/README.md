# How to Pause All Flux Reconciliation During Maintenance Window

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Maintenance Window, Operations

Description: Suspend all Flux reconciliation across the cluster during maintenance windows to prevent automated changes from interfering with planned infrastructure work.

---

## Introduction

Maintenance windows require predictable, stable cluster state. If Flux is actively reconciling during a node upgrade, etcd compaction, or network change, it can make debugging difficult and introduce unexpected changes at exactly the wrong time. The safest approach is to pause all Flux reconciliation for the duration of the maintenance window and resume it with a controlled verification once the work is complete.

Flux provides first-class support for this through the suspend mechanism on all source and reconciler objects. This guide covers how to pause the entire cluster's Flux reconciliation systematically, perform maintenance safely, verify cluster state post-maintenance, and resume reconciliation with confidence.

## Prerequisites

- Flux CD v2 managing resources in your cluster
- Flux CLI and kubectl installed with cluster-admin access
- A scheduled maintenance window with clear start and end times
- A runbook for the specific maintenance being performed

## Step 1: Inventory All Flux Objects Before the Window

Before suspending, know exactly what you're pausing.

```bash
# List all Kustomizations across all namespaces
flux get kustomizations --all-namespaces
# NAMESPACE       NAME                   SUSPENDED  READY
# flux-system     flux-system            False      True
# flux-system     infrastructure         False      True
# flux-system     monitoring             False      True
# flux-system     tenants                False      True
# team-alpha      my-service             False      True

# List all HelmReleases
flux get helmreleases --all-namespaces

# List all GitRepository sources
flux get sources git --all-namespaces

# Save the inventory for post-maintenance verification
flux get all --all-namespaces > /tmp/flux-pre-maintenance-state.txt
echo "Pre-maintenance snapshot saved to /tmp/flux-pre-maintenance-state.txt"
```

## Step 2: Suspend All Flux Sources

Suspending sources prevents Flux from polling Git or registries for new content during maintenance.

```bash
# Suspend all GitRepository sources
kubectl get gitrepositories --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend source git "$name" -n "$ns"
    echo "Suspended GitRepository: $ns/$name"
  done

# Suspend all HelmRepository sources
kubectl get helmrepositories --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend source helm "$name" -n "$ns"
    echo "Suspended HelmRepository: $ns/$name"
  done

# Suspend all OCIRepository sources
kubectl get ocirepositories --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend source oci "$name" -n "$ns"
    echo "Suspended OCIRepository: $ns/$name"
  done
```

## Step 3: Suspend All Reconcilers

Suspending reconcilers prevents Flux from applying any changes to the cluster.

```bash
# Suspend all Kustomizations
kubectl get kustomizations --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend kustomization "$name" -n "$ns"
    echo "Suspended Kustomization: $ns/$name"
  done

# Suspend all HelmReleases
kubectl get helmreleases --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    flux suspend helmrelease "$name" -n "$ns"
    echo "Suspended HelmRelease: $ns/$name"
  done

echo "All Flux reconciliation suspended at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Step 4: Create a Maintenance Window Script

Package the suspension into a reusable script with logging.

```bash
#!/bin/bash
# scripts/maintenance-start.sh

OPERATOR=${1:-"unknown"}
REASON=${2:-"maintenance window"}
WINDOW_DURATION=${3:-"2h"}

echo "========================================"
echo "STARTING MAINTENANCE WINDOW"
echo "Operator: $OPERATOR"
echo "Reason:   $REASON"
echo "Duration: $WINDOW_DURATION"
echo "Started:  $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "========================================"

# Save pre-maintenance state
flux get all --all-namespaces > /tmp/flux-pre-maintenance-$(date +%Y%m%d-%H%M%S).txt

# Suspend all sources
for resource_type in source git source helm source oci; do
  kubectl get $(echo $resource_type | tr ' ' '') --all-namespaces -o json 2>/dev/null | \
    jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
    while read ns name; do
      flux suspend $resource_type "$name" -n "$ns" 2>/dev/null
    done
done

# Suspend all reconcilers
for resource_type in kustomization helmrelease; do
  kubectl get ${resource_type}s --all-namespaces -o json 2>/dev/null | \
    jq -r '.items[] | "\(.metadata.namespace) \(.metadata.name)"' | \
    while read ns name; do
      flux suspend $resource_type "$name" -n "$ns" 2>/dev/null
    done
done

echo ""
echo "All Flux reconciliation suspended."
echo "Cluster is ready for maintenance."
echo ""
echo "IMPORTANT: Run ./scripts/maintenance-end.sh when maintenance is complete."
```

## Step 5: Verify the Cluster State During Maintenance

After suspending Flux, confirm the cluster is stable before proceeding.

```bash
# Verify all Kustomizations are suspended
flux get kustomizations --all-namespaces | grep -c "True"
# Should show 0 unsuspended Kustomizations

# Verify no Flux controllers are making changes
kubectl get events --all-namespaces --field-selector reason=ReconciliationSucceeded \
  --sort-by='.lastTimestamp' | tail -5
# Should show no recent events if suspension worked

# Check Flux controller logs for any in-flight reconciliations
kubectl logs -n flux-system deployment/kustomize-controller -f --since=1m
```

## Step 6: Monitor During Maintenance

Keep a terminal open to watch for unexpected changes:

```bash
# Watch for any resource changes during maintenance
kubectl get events --all-namespaces -w --field-selector reason!=Pulling,reason!=Pulled

# Watch pod status across the cluster
kubectl get pods --all-namespaces -w | grep -v Running
```

## Best Practices

- Send a Slack notification to your team announcing the maintenance window start and end
- Take a snapshot of the cluster state with `kubectl get all --all-namespaces` before and after
- Maintain a maintenance log with start time, end time, operator, and a summary of changes made
- Set a calendar alert for the end of the maintenance window to remind you to resume Flux
- Never leave Flux suspended overnight - if maintenance runs long, extend the window explicitly
- Test your maintenance scripts in a staging cluster before running them in production

## Conclusion

Pausing Flux reconciliation during maintenance windows is a simple, safe operation that gives you complete control over cluster state during sensitive infrastructure work. The key discipline is being systematic about suspending all sources and reconcilers, not just the ones directly affected by your maintenance. A complete suspension followed by a controlled, verified resume is far safer than a partial suspension that leaves some reconcilers running and potentially interfering with your maintenance work.
