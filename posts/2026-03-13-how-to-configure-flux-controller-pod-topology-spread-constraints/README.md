# How to Configure Flux Controller Pod Topology Spread Constraints

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Topology Spread, Scheduling, High Availability

Description: Use pod topology spread constraints to distribute Flux controller pods evenly across failure domains for better reliability and performance.

---

## Why Topology Spread Matters

When running multiple replicas of Flux controllers (for example, with leader election in an active-passive setup or with sharding), you want to ensure that pods are distributed across different nodes, zones, or other topology domains. If all controller pods land on the same node and that node fails, Flux stops reconciling until the pods are rescheduled.

Pod topology spread constraints tell the Kubernetes scheduler to distribute pods evenly across your specified topology domains.

## Understanding Topology Keys

Common topology keys include:

- `kubernetes.io/hostname`: Spread across different nodes
- `topology.kubernetes.io/zone`: Spread across availability zones
- `topology.kubernetes.io/region`: Spread across regions

## Configuring Topology Spread for Flux Controllers

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/topology-spread-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: source-controller
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: source-controller
```

### Key Fields Explained

- **maxSkew**: The maximum difference in pod count between any two topology domains. A value of 1 means the distribution should be as even as possible.
- **topologyKey**: The node label used to define topology domains.
- **whenUnsatisfiable**: What to do when the constraint cannot be met. `DoNotSchedule` blocks scheduling (like a hard constraint), while `ScheduleAnyway` makes it a soft preference.
- **labelSelector**: Identifies which pods to consider when calculating the spread.

## Applying to All Flux Controllers

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: topology-spread-patch.yaml
    target:
      kind: Deployment
      name: source-controller
  - path: topology-spread-kustomize-patch.yaml
    target:
      kind: Deployment
      name: kustomize-controller
  - path: topology-spread-helm-patch.yaml
    target:
      kind: Deployment
      name: helm-controller
```

Each patch file should reference the correct `app` label for its respective controller.

## When This Is Most Useful

Topology spread constraints are most valuable when:

1. You run Flux across multiple availability zones and want zone-level resilience.
2. You have scaled Flux controller replicas beyond one for performance or availability reasons.
3. Your cluster has many nodes and you want to avoid hotspots.

For single-replica deployments (the default), topology spread constraints have limited benefit since there is only one pod to place. However, they still serve as documentation of your scheduling intent and will apply correctly if you later scale up.

## Combining with Node Affinity

Topology spread constraints work well alongside node affinity. You can pin controllers to a set of dedicated nodes with node affinity and then spread them evenly across those nodes with topology spread:

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
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: role
                    operator: In
                    values:
                      - flux-system
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: source-controller
```

## Applying the Changes

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Add pod topology spread constraints to Flux controllers"
git push
```

## Verifying the Spread

After pods are rescheduled, check their distribution:

```bash
kubectl get pods -n flux-system -o wide
```

Compare the NODE column values to confirm pods are on different nodes or zones.

## Summary

Pod topology spread constraints help distribute Flux controller pods across failure domains for improved availability and balanced resource usage. Use `ScheduleAnyway` for soft preferences or `DoNotSchedule` for hard requirements, and combine them with node affinity for fine-grained scheduling control.
