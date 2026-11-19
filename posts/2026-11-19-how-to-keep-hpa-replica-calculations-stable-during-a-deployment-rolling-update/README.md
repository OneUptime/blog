# How to Keep HPA Replica Calculations Stable During a Deployment Rolling Update

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Keep metric meaning and available capacity consistent across old and new ReplicaSets while HPA and the Deployment controller reconcile a rolling update.

---

A rolling update temporarily mixes old Pods, new Pods, initializing Pods, and terminating Pods. An HPA sees that changing population while the Deployment controller is also adjusting ReplicaSets. A surprising replica count does not automatically mean that the two controllers conflict.

The useful goal is stable metric meaning and enough ready capacity throughout the rollout. You cannot make a changing fleet look identical to a steady one simply by increasing a stabilization window.

## Keep the HPA attached to the Deployment

The HPA manages the Deployment's scale. The Deployment controller distributes replicas across its ReplicaSets, including proportional scaling during an active rollout. Bind the HPA to the Deployment, not to an individual rollout ReplicaSet:

```yaml
scaleTargetRef:
  apiVersion: apps/v1
  kind: Deployment
  name: checkout
```

Inspect the three levels separately:

```bash
kubectl get hpa checkout -n production -o yaml
kubectl get deployment checkout -n production -o json |
  jq '{desired: .spec.replicas, strategy: .spec.strategy, status: .status}'
kubectl get replicasets -n production -l app=checkout
kubectl get pods -n production -l app=checkout -o wide
```

The [Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#proportional-scaling) explains how an additional scaling request is distributed across active ReplicaSets. Do not count only the newest ReplicaSet when reconstructing HPA inputs.

## Avoid changing the CPU denominator accidentally

A CPU utilization target is relative to requests. Suppose four eligible Pods each use `300m`. Initially every Pod requests `500m`, so total usage is `1200m` against `2000m` requested: 60% utilization.

During a rollout, two new Pods request `1000m` while the old two still request `500m`. At the same usage per Pod, the matching totals become `1200m / 3000m`, or 40%. The HPA can interpret this as reduced utilization even though traffic has not changed.

That calculation assumes complete samples, identical container layouts, and no Pod-level resource requests. The [resource replica calculator](https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/replica_calculator.go) handles additional cases such as Pod-level requests and missing metrics.

Keep request changes separate from application changes when practical. If an absolute CPU target better expresses capacity, plan an `AverageValue` migration and test it before the rollout. It is not an automatic remedy: a new application version may need more CPU per request.

## Make container names and metric labels survive the transition

For `ContainerResource`, the HPA follows a named container. Renaming it in the Deployment before adjusting the HPA can leave some Pods outside that metric's coverage.

Kubernetes recommends temporarily tracking both old and new container names as separate metrics during such a transition, then removing the old metric after the rollout. Review the [container resource guidance](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#container-resource-metrics) before using that approach, including how multiple metrics influence downscaling.

For custom metrics, check that the adapter discovers both ReplicaSets. A query filtered to a single version label can make healthy old Pods disappear from the metric population. Use workload identity for fleet membership and retain revision labels for investigation.

## Coordinate availability and scaling behavior

An illustrative rollout fragment is:

```yaml
spec:
  minReadySeconds: 20
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 25%
```

This preserves the Deployment's availability objective while allowing surge capacity, subject to scheduling and readiness. It requires room for extra Pods. Terminating Pods may continue consuming resources during their grace period, so requested and observed Pod counts can temporarily exceed your intuitive steady-state total.

`minReadySeconds` controls when the Deployment considers a Pod available. It is not an HPA-specific delay for all metrics. Use accurate startup and readiness probes, and understand CPU startup filtering separately.

A cautious HPA scale-down policy can reduce simultaneous capacity removal:

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
      - type: Pods
        value: 1
        periodSeconds: 60
```

This does not freeze a rollout or guarantee exactly one terminating Pod. Deployment rollout decisions and HPA scale-down decisions remain separate mechanisms.

## Verify with a rollout at realistic demand

Test at a load where the service is already using several replicas. Compare old and new per-Pod CPU, request rates, readiness, adapter coverage, pending time, and latency. Then add a burst during the rollout and confirm new requested capacity becomes ready before existing Pods overload.

If the rollout stalls, inspect scheduling constraints and startup failures before tuning HPA. Record the HPA desired count separately from Deployment available replicas and actual Pod count. Those three views explain whether a recommendation changed, a rollout added surge, or capacity simply failed to become usable.
