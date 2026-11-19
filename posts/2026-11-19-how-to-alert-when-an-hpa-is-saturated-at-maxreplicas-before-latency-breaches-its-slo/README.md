# How to Alert When an HPA Is Saturated at `maxReplicas` Before Latency Breaches Its SLO

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Build HPA capacity alerts from kube-state-metrics, distinguish saturation from failed convergence, and size alert delays to the service response budget.

---

An HPA cannot add capacity beyond `maxReplicas`. Waiting for latency to breach its SLO before noticing that ceiling wastes the time you need to inspect quotas, nodes, and downstream limits.

Alert on capacity headroom separately from user impact. A workload at its ceiling deserves investigation, but it does not automatically prove that users are already experiencing an outage.

## Confirm the metrics you have

The [kube-state-metrics HPA reference](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/horizontalpodautoscaler-metrics.md) documents replica bounds, current and desired replica counts, and conditions. Check these series exist in your deployment before installing alerts:

```promql
kube_horizontalpodautoscaler_status_current_replicas
kube_horizontalpodautoscaler_status_desired_replicas
kube_horizontalpodautoscaler_spec_max_replicas
kube_horizontalpodautoscaler_status_condition
```

Use one consistent cluster label in a multi-cluster monitoring system. The examples below retain `cluster`, `namespace`, and `horizontalpodautoscaler`; if your cluster label has another name, replace it throughout. Deduplicate replicated kube-state-metrics scrapes before joins to avoid duplicate-series problems.

## Record a clear measure of used headroom

These recording rules consolidate identical observations and calculate the current count as a fraction of the maximum:

```yaml
groups:
  - name: hpa-capacity
    rules:
      - record: hpa:current_replicas
        expr: max by (cluster, namespace, horizontalpodautoscaler) (kube_horizontalpodautoscaler_status_current_replicas)
      - record: hpa:max_replicas
        expr: max by (cluster, namespace, horizontalpodautoscaler) (kube_horizontalpodautoscaler_spec_max_replicas)
      - record: hpa:replica_fraction
        expr: hpa:current_replicas / hpa:max_replicas
      - alert: HPANearReplicaCeiling
        expr: hpa:replica_fraction >= 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "HPA {{ $labels.namespace }}/{{ $labels.horizontalpodautoscaler }} has little replica headroom"
```

Use this as a capacity warning, then tune it per service. For a two-replica maximum, 90% is effectively the ceiling. A service intentionally configured with equal minimum and maximum should be excluded or handled by a separate capacity policy.

The [Prometheus alerting rules documentation](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) explains that `for` requires the expression to remain active before firing. Two minutes is an example, not a recommended universal delay. If your burst exhausts headroom in 30 seconds, a two-minute timer is too late.

## Identify sustained constrained demand

A stronger signal combines being at the maximum with `ScalingLimited=True`:

```promql
(hpa:current_replicas >= hpa:max_replicas)
and on (cluster, namespace, horizontalpodautoscaler)
(
  max by (cluster, namespace, horizontalpodautoscaler) (
    kube_horizontalpodautoscaler_status_condition{
      condition="ScalingLimited",status="true"
    }
  ) == 1
)
```

Add this as a separate warning or escalation rule using a timer appropriate to your response budget. Inspect the HPA reason when it fires: the condition can also reflect rate policies, and condition values can lag an interrupted reconciliation. Being exactly at maximum without this condition still means there is no configured replica headroom.

Do not alert on `status.desiredReplicas > maxReplicas` as your primary detector. The desired status generally reflects the constrained decision. An unconstrained recommendation is not necessarily exposed there.

## Separate requested capacity from ready capacity

A different incident occurs when the HPA wants more replicas but the workload cannot make them Ready. A maximum-size request may coexist with pending Pods, image errors, failed probes, or quota failures.

Include the target Deployment's desired and available replicas, pending reasons, node headroom, and recent scaling events in the runbook. Mapping HPA names to Deployment names requires a real target mapping; identical names are only a convention.

```bash
kubectl describe hpa checkout -n production
kubectl get deployment checkout -n production -o yaml
kubectl get pods -n production -l app=checkout
kubectl get events -n production --sort-by=.metadata.creationTimestamp
```

## Connect the warning to an actionable response

Graph the metric driving scaling, request arrivals, queue age, ready replicas, and latency together. Before increasing the maximum, check node capacity, namespace quotas, database connection limits, and the possibility of stale or duplicated metrics.

Keep SLO burn-rate or latency alerts independent. Capacity warnings provide advance notice when the signal and traffic pattern permit it; they cannot guarantee prediction of sudden overload or downstream failures.

Test the rules with a workload near the ceiling, sustained excess demand, a short harmless peak, missing monitoring data, and pending Pods. Monitor exporter availability separately because absent series do not mean healthy capacity. A useful warning arrives early enough to act and points directly to whether the fix is a higher ceiling, more schedulable capacity, or a corrected demand signal.
