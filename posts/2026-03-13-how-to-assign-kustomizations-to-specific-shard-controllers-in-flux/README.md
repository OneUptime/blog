# How to Assign Kustomizations to Specific Shard Controllers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Kustomization, Controller Assignment

Description: Learn how to assign Flux Kustomization resources to specific shard controllers using labels for targeted reconciliation.

---

## Introduction

Once you have deployed multiple kustomize-controller instances, you need a reliable way to assign Kustomization resources to specific shards. This guide covers labeling strategies, automation approaches, and patterns for managing shard assignments at scale.

## Prerequisites

- A running Kubernetes cluster with Flux bootstrapped
- Multiple kustomize-controller shard instances deployed
- Main controller configured to exclude sharded resources

## Understanding Shard Assignment

Shard assignment works through Kubernetes labels. Each shard controller watches for resources with a specific label value, and each Kustomization must have the corresponding label to be picked up by the intended shard.

```
Kustomization (label: shard-1) --> kustomize-controller-shard-1
Kustomization (label: shard-2) --> kustomize-controller-shard-2
Kustomization (no shard label) --> kustomize-controller (main)
```

## Method 1: Static Label Assignment

The simplest approach is to add shard labels directly in your Kustomization manifests.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: apps-repo
  path: ./production
  prune: true
```

## Method 2: Assign via kubectl

For existing resources, use kubectl to add or change shard labels.

```bash
# Assign a Kustomization to shard-1
kubectl label kustomization production-apps \
  sharding.fluxcd.io/key=shard-1 \
  -n flux-system

# Reassign to a different shard
kubectl label kustomization production-apps \
  sharding.fluxcd.io/key=shard-2 \
  -n flux-system --overwrite

# Remove shard assignment (returns to main controller)
kubectl label kustomization production-apps \
  sharding.fluxcd.io/key- \
  -n flux-system
```

## Method 3: Assign via Kustomize Overlays

Use Kustomize to apply shard labels as part of your GitOps workflow.

```yaml
# clusters/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/apps
patches:
  - target:
      kind: Kustomization
      labelSelector: "team=frontend"
    patch: |
      - op: add
        path: /metadata/labels/sharding.fluxcd.io~1key
        value: shard-1
  - target:
      kind: Kustomization
      labelSelector: "team=backend"
    patch: |
      - op: add
        path: /metadata/labels/sharding.fluxcd.io~1key
        value: shard-2
```

Note the use of `~1` to escape the `/` in the label key `sharding.fluxcd.io/key` within JSON Patch paths.

## Method 4: Automated Assignment Script

For large deployments, automate shard assignment using a script.

```bash
#!/bin/bash
# assign-shards.sh
# Distributes Kustomizations across shards based on a strategy

NAMESPACE="flux-system"
NUM_SHARDS=3

# Strategy: Round-robin assignment
assign_round_robin() {
  local counter=0
  for ks in $(kubectl get kustomizations -n "$NAMESPACE" \
    -o jsonpath='{.items[*].metadata.name}'); do
    shard=$((counter % NUM_SHARDS + 1))
    echo "Assigning $ks to shard-$shard"
    kubectl label kustomization "$ks" -n "$NAMESPACE" \
      sharding.fluxcd.io/key="shard-$shard" --overwrite
    counter=$((counter + 1))
  done
}

# Strategy: Assignment by path prefix
assign_by_path() {
  for ks in $(kubectl get kustomizations -n "$NAMESPACE" \
    -o jsonpath='{range .items[*]}{.metadata.name}={.spec.path}{"\n"}{end}'); do
    name=$(echo "$ks" | cut -d'=' -f1)
    path=$(echo "$ks" | cut -d'=' -f2)

    case "$path" in
      ./infrastructure*)
        shard="shard-1"
        ;;
      ./apps*)
        shard="shard-2"
        ;;
      *)
        shard="shard-3"
        ;;
    esac

    echo "Assigning $name (path: $path) to $shard"
    kubectl label kustomization "$name" -n "$NAMESPACE" \
      sharding.fluxcd.io/key="$shard" --overwrite
  done
}

# Run the chosen strategy
assign_round_robin
```

## Method 5: Assignment via Flux Kustomization Post-Build

Use variable substitution in Flux to set shard labels dynamically.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: apps-repo
  path: ./apps
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: shard-config
```

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shard-config
  namespace: flux-system
data:
  SHARD_KEY: shard-1
```

## Verifying Shard Assignments

```bash
# List all Kustomizations with their shard labels
kubectl get kustomizations -n flux-system \
  -o custom-columns='NAME:.metadata.name,SHARD:.metadata.labels.sharding\.fluxcd\.io/key,READY:.status.conditions[0].status'

# Count resources per shard
echo "Shard distribution:"
for shard in shard-1 shard-2 shard-3; do
  count=$(kubectl get kustomizations -n flux-system \
    -l "sharding.fluxcd.io/key=$shard" --no-headers | wc -l)
  echo "  $shard: $count resources"
done

# Count unsharded resources
unsharded=$(kubectl get kustomizations -n flux-system \
  -l '!sharding.fluxcd.io/key' --no-headers | wc -l)
echo "  main (unsharded): $unsharded resources"
```

## Reassigning Resources Between Shards

When you change a shard label, the old shard stops reconciling the resource and the new shard picks it up. There may be a brief delay during the transition.

```bash
# Move a resource from shard-1 to shard-2
kubectl label kustomization my-app \
  sharding.fluxcd.io/key=shard-2 \
  -n flux-system --overwrite

# Force immediate reconciliation on the new shard
flux reconcile kustomization my-app -n flux-system
```

## Best Practices

- Keep shard assignments in version control alongside your Kustomization manifests
- Monitor shard distribution to prevent imbalances
- Use consistent naming conventions for shard values
- Test shard reassignment in staging before production
- Document which teams or applications map to which shards
- Avoid frequent shard reassignment as it can cause brief reconciliation gaps

## Conclusion

Assigning Kustomizations to specific shard controllers is straightforward with label-based sharding. Whether you use static labels in manifests, Kustomize overlays, or automated scripts, the key is to maintain a consistent and well-documented assignment strategy. Regular monitoring of shard distribution ensures balanced workloads across all controller instances.
