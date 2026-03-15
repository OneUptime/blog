# How to Pin Flux Controllers to Dedicated Nodes with Node Affinity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Node Affinity, Scheduling, Controller

Description: Use Kubernetes node affinity rules to schedule Flux controllers on dedicated nodes for predictable performance and resource isolation.

---

## Why Pin Flux Controllers to Specific Nodes

In large clusters, Flux controllers compete with application workloads for CPU, memory, and I/O. When a source-controller pod lands on a node that is already running memory-intensive applications, reconciliation latency suffers. By pinning Flux controllers to dedicated nodes, you guarantee that they have consistent access to resources and are not affected by noisy neighbors.

## Labeling Dedicated Nodes

First, label the nodes you want to reserve for Flux controllers:

```bash
kubectl label node node-infra-01 role=flux-system
kubectl label node node-infra-02 role=flux-system
```

Verify the labels:

```bash
kubectl get nodes -l role=flux-system
```

## Configuring Node Affinity

Use a Kustomize patch to add node affinity to each Flux controller deployment.

### Source Controller Patch

```yaml
# clusters/my-cluster/flux-system/node-affinity-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: role
                    operator: In
                    values:
                      - flux-system
```

### Applying to All Controllers

You can use a single patch that targets all Flux controller deployments by using multiple patch entries:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: node-affinity-patch.yaml
    target:
      kind: Deployment
      name: source-controller
  - path: node-affinity-patch.yaml
    target:
      kind: Deployment
      name: kustomize-controller
  - path: node-affinity-patch.yaml
    target:
      kind: Deployment
      name: helm-controller
  - path: node-affinity-patch.yaml
    target:
      kind: Deployment
      name: notification-controller
```

## Using Preferred vs Required Affinity

The example above uses `requiredDuringSchedulingIgnoredDuringExecution`, which means the controllers will only schedule on nodes with the `role=flux-system` label. If no such nodes are available, the controllers remain unscheduled.

For a softer constraint that prefers but does not require dedicated nodes, use `preferredDuringSchedulingIgnoredDuringExecution`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: role
                    operator: In
                    values:
                      - flux-system
```

This allows the controllers to run on any node if the preferred nodes are unavailable, which is better for high availability.

## Adding Tolerations for Tainted Nodes

If your dedicated nodes are tainted to prevent regular workloads from scheduling on them, add matching tolerations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      tolerations:
        - key: dedicated
          operator: Equal
          value: flux-system
          effect: NoSchedule
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: role
                    operator: In
                    values:
                      - flux-system
```

Taint the nodes to complete the isolation:

```bash
kubectl taint nodes node-infra-01 dedicated=flux-system:NoSchedule
kubectl taint nodes node-infra-02 dedicated=flux-system:NoSchedule
```

## Applying the Changes

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Pin Flux controllers to dedicated nodes with node affinity"
git push
```

## Verifying Placement

After the controllers restart, verify they landed on the expected nodes:

```bash
kubectl get pods -n flux-system -o wide
```

The NODE column should show your dedicated infrastructure nodes.

## Summary

Pinning Flux controllers to dedicated nodes with node affinity eliminates resource contention with application workloads. Use required affinity for strict isolation or preferred affinity for flexibility. Combine with node taints and tolerations for complete workload separation.
