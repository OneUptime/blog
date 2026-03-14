# How to Handle Node Drain and Pod Disruption with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, Node Drain, PodDisruptionBudget, Cluster Operations

Description: Manage node drains and pod disruptions in Flux-managed clusters to ensure workloads move gracefully without triggering unwanted Flux reconciliations.

---

## Introduction

Node draining is a routine operation in Kubernetes: before maintenance, upgrades, or decommissioning, nodes are drained to move workloads to other nodes gracefully. In Flux-managed clusters, draining introduces interactions that can cause confusion: Flux may try to reconcile resources while pods are being disrupted, PodDisruptionBudgets may conflict with Flux-managed replica counts, and the drain process itself needs to be sequenced with Flux's reconciliation loop.

Understanding these interactions lets you perform node drains safely and efficiently. The key is ensuring PodDisruptionBudgets are correctly configured in Git and deployed by Flux before they are needed, and knowing how Flux's reconciliation behavior changes when pods are disrupted and rescheduled.

This guide covers the complete workflow for draining nodes in a Flux-managed cluster, including pre-drain preparation, the drain process, post-drain verification, and uncordoning.

## Prerequisites

- Flux CD v2 managing Deployments and PodDisruptionBudgets
- kubectl with cluster-admin access
- At least N+1 nodes available (where N is your minimum pod count)
- PodDisruptionBudgets deployed via Flux for all critical workloads

## Step 1: Ensure PodDisruptionBudgets Are in Git

PodDisruptionBudgets must be deployed by Flux before you need them. Check that all critical workloads have PDBs.

```yaml
# deploy/pdb.yaml - in the application's Git repository
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service
  namespace: team-alpha
spec:
  selector:
    matchLabels:
      app: my-service
  # Allow at most 1 pod to be unavailable at any time
  # (ensures 2-pod deployments stay at 1 during drain)
  maxUnavailable: 1
  # Alternative: minAvailable: 2 - ensures at least 2 pods always running
```

Verify PDBs are deployed:

```bash
# Check all PDBs across the cluster
kubectl get pdb --all-namespaces

# Check which deployments lack PDBs (risky workloads)
kubectl get deployments --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.replicas > 1) | .metadata.namespace + "/" + .metadata.name' | \
  sort > /tmp/deployments.txt

kubectl get pdb --all-namespaces -o json | \
  jq -r '.items[] | .metadata.namespace + "/" + .metadata.name' | \
  sort > /tmp/pdbs.txt

echo "Deployments without PDBs (review before draining):"
comm -23 /tmp/deployments.txt /tmp/pdbs.txt
```

## Step 2: Pre-Drain Preparation

Before draining, ensure Flux has fully reconciled the target node's pods.

```bash
NODE=worker-node-3.acme.example.com

# Check current pods on the target node
kubectl get pods --all-namespaces \
  --field-selector spec.nodeName=$NODE \
  -o wide

# Verify all Flux Kustomizations are ready before draining
UNHEALTHY=$(flux get kustomizations --all-namespaces | grep "False" | wc -l)
if [ "$UNHEALTHY" -gt 0 ]; then
  echo "WARNING: $UNHEALTHY Kustomizations are unhealthy. Resolve before draining."
  flux get kustomizations --all-namespaces | grep "False"
  exit 1
fi

echo "All Flux Kustomizations are healthy. Proceeding with drain."
```

## Step 3: Cordon the Node

Cordoning prevents new pods from being scheduled on the node while allowing existing pods to continue running.

```bash
# Cordon the node - no new pods will be scheduled here
kubectl cordon $NODE

# Verify the node is cordoned
kubectl get node $NODE
# STATUS: Ready,SchedulingDisabled

# Flux continues to reconcile, but new pods go to other nodes
# This is the safe state to be in while preparing for the drain
```

## Step 4: Drain the Node

```bash
# Drain with grace period and PDB respect
kubectl drain $NODE \
  --ignore-daemonsets \    # DaemonSet pods cannot be moved
  --delete-emptydir-data \ # Allow deletion of pods using emptyDir volumes
  --grace-period=60 \      # Give pods 60 seconds for graceful shutdown
  --timeout=10m \          # Fail if drain takes more than 10 minutes
  --pod-selector='app.kubernetes.io/managed-by notin (flux)' # Optional: skip Flux-managed pods

# Watch pods evacuating
kubectl get pods --all-namespaces \
  --field-selector spec.nodeName=$NODE -w
```

## Step 5: Verify Flux Reconciles Correctly During Drain

```bash
# Watch Flux reconciliation while drain is in progress
flux get kustomizations --all-namespaces -w &

# Flux will detect pod disruptions and may show reconciling status
# This is normal - Flux is waiting for the deployment to stabilize

# Check if any Kustomization is stuck waiting for health checks
flux get kustomizations --all-namespaces | grep -v "True"

# If a Kustomization is stuck, check the health check condition
kubectl describe kustomization my-service -n team-alpha | grep -A5 "Health Check"
```

## Step 6: Verify Pods Rescheduled Successfully

After drain completes, verify pods have rescheduled to other nodes.

```bash
# Confirm no pods remain on the drained node
kubectl get pods --all-namespaces \
  --field-selector spec.nodeName=$NODE

# Verify pods are Running on other nodes
kubectl get pods -n team-alpha -o wide | grep -v $NODE

# Check all deployments are at their desired replica count
kubectl get deployments --all-namespaces | \
  awk 'NR>1 && $3 != $4 {print "NOT READY:", $0}'

# Verify all Flux Kustomizations are still healthy
flux get kustomizations --all-namespaces | grep "False"
```

## Step 7: Uncordon After Maintenance

```bash
# After node maintenance is complete, make it schedulable again
kubectl uncordon $NODE

# Verify the node is ready and schedulable
kubectl get node $NODE
# STATUS: Ready

# Flux will not immediately move pods back to this node
# Kubernetes only rescheduled displaced pods - it doesn't rebalance
# For rebalancing, consider the Descheduler tool or pod disruptions

# Force Flux to reconcile and verify cluster state
flux reconcile kustomization infrastructure -n flux-system --with-source
```

## Step 8: Handle Stuck Drains

```bash
# If drain is stuck, identify which pods are blocking it
kubectl get pods --all-namespaces \
  --field-selector spec.nodeName=$NODE \
  -o wide | grep -v DaemonSet

# Check PDB status - a PDB might be preventing eviction
kubectl get pdb --all-namespaces -o wide

# If a PDB is too restrictive (minAvailable too high for current replicas)
# Temporarily suspend Flux and scale the deployment
flux suspend kustomization my-service -n team-alpha
kubectl scale deployment my-service -n team-alpha --replicas=4

# Retry the drain
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data --force

# After drain, restore original replica count via Flux
flux resume kustomization my-service -n team-alpha
flux reconcile kustomization my-service -n team-alpha
```

## Best Practices

- Always add PDBs to production Deployments in Git before you ever need to drain nodes
- Use `maxUnavailable: 1` rather than `minAvailable: N` when possible - it automatically adapts to replica count changes
- Cordon before draining to prevent scheduling new pods that would immediately be disrupted
- Monitor Flux health checks during drain - if a Kustomization goes unhealthy during drain, investigate before proceeding
- For clusters with many nodes, drain one node at a time, verifying health between each drain
- Use the Kubernetes Descheduler after maintenance to rebalance pods across nodes

## Conclusion

Node draining in Flux-managed clusters is straightforward when PodDisruptionBudgets are correctly configured and deployed through GitOps. Flux continues to reconcile during the drain process - this is expected behavior. By ensuring PDBs exist in Git, verifying cluster health before starting, and following the cordon-drain-verify-uncordon sequence, you can drain nodes safely with confidence that Flux is maintaining cluster state throughout the process.
