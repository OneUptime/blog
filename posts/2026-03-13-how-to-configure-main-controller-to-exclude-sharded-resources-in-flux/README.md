# How to Configure Main Controller to Exclude Sharded Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Sharding, Controller Configuration

Description: Learn how to configure the main Flux controller to exclude resources that are handled by dedicated shard controllers to prevent duplicate reconciliation.

---

## Introduction

When you deploy shard controllers in Flux, the main controller must be configured to exclude the resources that shards are responsible for. Without this configuration, both the main controller and the shard controller will attempt to reconcile the same resources, leading to conflicts and wasted compute. This guide covers the different exclusion strategies and how to apply them.

## Prerequisites

- A running Kubernetes cluster (v1.25 or later)
- Flux CLI installed (v2.0 or later)
- kubectl configured with cluster access
- Flux bootstrapped with at least one shard controller deployed

## The Problem: Duplicate Reconciliation

By default, the main Flux controller watches all resources across all namespaces. When you add a shard controller with its own label selector, both controllers will try to reconcile resources that match the shard's selector, unless the main controller is explicitly told to exclude them.

Symptoms of duplicate reconciliation include:

- Frequent status updates on resources
- Conflicting apply operations
- Increased API server load
- Inconsistent resource states

## Strategy 1: Exclude by Shard Label Absence

The most common approach uses a negated label selector. The main controller only reconciles resources that do not have any shard label.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --watch-all-namespaces=true
            - --watch-label-selector=!sharding.fluxcd.io/key
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
```

The `!sharding.fluxcd.io/key` selector means the controller only watches resources where the `sharding.fluxcd.io/key` label does not exist. Any resource with that label, regardless of its value, will be ignored by the main controller.

## Strategy 2: Exclude Specific Shard Values

If you want more control, exclude specific shard values using set-based selectors.

```yaml
args:
  - --watch-label-selector=sharding.fluxcd.io/key notin (shard-1,shard-2,shard-3)
```

This approach is less maintainable because you need to update the main controller every time you add a new shard, but it gives you the ability to have the main controller handle certain labeled resources.

## Strategy 3: Use a Default Shard Label

Assign the main controller its own shard identity. All resources must then have a shard label.

```yaml
# Main controller watches resources labeled as "default"
args:
  - --watch-label-selector=sharding.fluxcd.io/key=default

# Shard controller watches resources labeled as "shard-1"
args:
  - --watch-label-selector=sharding.fluxcd.io/key=shard-1
```

With this approach, resources without any shard label will not be reconciled by any controller. This can be used as a safety mechanism but requires disciplined labeling.

## Applying the Configuration with Kustomize

Use a Kustomize patch to modify the main controller's arguments.

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - --watch-all-namespaces=true
          - --watch-label-selector=!sharding.fluxcd.io/key
          - --log-level=info
          - --log-encoding=json
          - --enable-leader-election
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - --watch-all-namespaces=true
          - --watch-label-selector=!sharding.fluxcd.io/key
          - --log-level=info
          - --log-encoding=json
          - --enable-leader-election
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - --watch-all-namespaces=true
          - --watch-label-selector=!sharding.fluxcd.io/key
          - --log-level=info
          - --log-encoding=json
          - --enable-leader-election
          - --storage-path=/data
          - --storage-adv-addr=source-controller.flux-system.svc.cluster.local
```

## Verifying the Exclusion

After applying the configuration, verify that the main controller is properly excluding sharded resources.

```bash
# Check the main controller's arguments
kubectl get deployment kustomize-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}'

# Watch the main controller logs for any activity on sharded resources
kubectl logs deployment/kustomize-controller -n flux-system -f | grep "shard"

# Verify no duplicate reconciliation events
kubectl get events -n flux-system --field-selector reason=ReconciliationSucceeded \
  --sort-by='.lastTimestamp' | head -20
```

## Testing the Exclusion

Create a test resource with the shard label and confirm the main controller does not reconcile it.

```bash
# Create a test Kustomization with a shard label
cat <<EOF | kubectl apply -f -
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-shard-exclusion
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard-1
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./test
  prune: false
EOF

# Check main controller logs - should not see this resource
kubectl logs deployment/kustomize-controller -n flux-system --tail=10

# Check shard controller logs - should see this resource
kubectl logs deployment/kustomize-controller-shard-1 -n flux-system --tail=10

# Clean up
kubectl delete kustomization test-shard-exclusion -n flux-system
```

## Common Mistakes

1. **Forgetting to update all controllers**: If you shard the kustomize-controller, remember to also configure the source-controller and helm-controller if they use the same sharding labels.

2. **Using incorrect selector syntax**: The `!` prefix negates the entire label key existence, not its value. `!key` means "key does not exist" while `key!=value` means "key exists but does not equal value."

3. **Not restarting the controller**: Changes to deployment args require a pod restart. Kubernetes handles this automatically when you update the deployment spec.

## Best Practices

- Use the negated label absence strategy (`!sharding.fluxcd.io/key`) for simplicity
- Apply the same exclusion pattern consistently across all controller types
- Store the configuration in Git as Kustomize patches for reproducibility
- Test exclusion before deploying shards to production
- Monitor for duplicate reconciliation events after configuration changes

## Conclusion

Properly configuring the main controller to exclude sharded resources is essential for a working sharding setup. The negated label selector approach is the simplest and most maintainable strategy, ensuring that any resource with a shard label is automatically excluded from the main controller's watch scope. This prevents duplicate reconciliation and ensures clean separation of responsibilities between the main controller and its shards.
