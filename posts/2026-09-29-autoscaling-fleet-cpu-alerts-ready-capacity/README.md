# How to Fix Fleet CPU Alerts During Autoscaling with Ready Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Kubernetes, Prometheus, Autoscaling

Description: Normalize CPU usage against the same ready pod population and declared resource basis so scaling and heterogeneous replicas do not distort alerts.

A fleet CPU graph can improve during an outage simply because new pods were added to its denominator before they became ready. A fixed “total CPU cores used” threshold can also miss rising utilization during scale-in because it ignores the remaining capacity.

Define the numerator, denominator and membership before choosing a percentage threshold. “CPU percent” can mean utilization of machine cores, container limits, resource requests or an average of per-pod percentages. Those are different quantities with different operational implications.

## Choose a capacity basis

For a Kubernetes workload, usage divided by CPU requests is useful when comparing with request-based autoscaling policy. It is not physical utilization and can exceed 100%. A request is a scheduling and allocation input; a CPU limit, when configured, is a separate bound enforced through throttling behavior.

Kubernetes [Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) uses resource utilization relative to requests and includes handling for readiness and missing metrics. A dashboard ratio should not be presented as an exact reconstruction of the controller unless it reproduces all those details.

Use requested CPU consistently in this example, and monitor physical node headroom and container throttling separately.

## Normalize raw metrics into one pod identity

Assume scrape configuration attaches `cluster`, `namespace`, `pod` and `workload` consistently, and duplicate scrapes have been removed. These recording rules produce per-pod usage and requests:

```yaml
groups:
  - name: workload-cpu
    rules:
      - record: pod:cpu_usage_cores:rate5m
        expr: |
          sum by (cluster, namespace, workload, pod) (
            rate(container_cpu_usage_seconds_total{
              container!="", container!="POD"
            }[5m])
          )
      - record: pod:cpu_requests:cores
        expr: |
          sum by (cluster, namespace, workload, pod) (
            kube_pod_container_resource_requests{
              resource="cpu", unit="core"
            }
          )
      - record: pod:ready:bool
        expr: |
          max by (cluster, namespace, pod) (
            kube_pod_status_ready{condition="true"} == bool 1
          )
```

The `workload` label here is an explicit enrichment contract; these metric families do not all provide it automatically. If using owner-reference joins, verify uniqueness and distinguish Deployments from their ReplicaSets. The [kube-state-metrics pod reference](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md) documents the native labels and resource-request metric.

This example sums ordinary container requests. For workloads with complex init-container or pod-level resource behavior, choose an effective pod-request source matching scheduler semantics instead of assuming that sum is sufficient.

## Apply the same readiness membership to both sides

```promql
sum by (cluster, namespace, workload) (
  pod:cpu_usage_cores:rate5m
  * on (cluster, namespace, pod) group_left
  pod:ready:bool
)
/
sum by (cluster, namespace, workload) (
  pod:cpu_requests:cores
  * on (cluster, namespace, pod) group_left
  pod:ready:bool
)
```

With complete usage and request metrics, this divides total usage by total requested cores among the same currently ready pods. The result is a ratio: 1 means 100% of requests. A one-core pod and a four-core pod contribute their actual requests to the denominator; averaging their percentages would give both equal weight.

Current readiness filters a five-minute usage rate, so a pod that just became ready may contribute usage observed during startup. That can be appropriate for a diagnostic chart, but it is not a strict “CPU only while ready” integral. Require a stable-ready warmup or model readiness across the measurement window when that distinction matters.

## Keep zero and missing capacity visible

If no pods are ready, the denominator may be zero. The useful state is “no ready capacity,” not 0% CPU. Alert on desired-versus-ready replicas separately, and gate a CPU saturation alert on a positive denominator.

A missing readiness series drops matching usage from the join. A missing request can inflate or invalidate the ratio. Missing usage metrics can understate the ratio while the corresponding requests remain in the denominator. Monitor source coverage, required CPU requests and metric freshness rather than using `or vector(0)` to make the result look complete.

Likewise, a fleet average can hide one hot pod. Pair the aggregate with a per-pod view, throttling, latency and imbalance signals. Autoscaling cannot necessarily help a hot shard or one serial bottleneck.

## Test scaling transitions

Replay a rollout with two old ready pods, two new unready pods and then a completed handoff. The denominator should increase when the new population becomes eligible, not merely when pod objects appear. Test scale-in, heterogeneous requests, missing requests and a completely unavailable workload.

For paging, link sustained saturation to customer symptoms or exhausted headroom. A high request-relative ratio alone may simply mean requests are conservative. Conversely, a healthy CPU ratio does not excuse an unavailable workload or storage-bound latency incident.

## Conclusion

Make fleet CPU a ratio of compatible totals over the same ready population. State whether the denominator means requests, limits or physical cores, and retain explicit no-capacity and missing-coverage states. That keeps autoscaling transitions from manufacturing either reassurance or noise.
