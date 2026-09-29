# How to Alert on a Missing Metric Without Paging When a Workload Intentionally Scales to Zero

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Monitoring, Prometheus, Kubernetes, Alerting

Description: Use independent desired-state inventory to detect missing telemetry while treating intentional zero-replica workloads as inactive.

An alert on missing metrics is only meaningful when the metric is expected. A service deliberately scaled to zero should stop producing process telemetry. A service that unexpectedly lost all its pods should not disappear from monitoring without an alert.

The distinction comes from desired state outside the workload. Counting currently observed pods cannot establish whether missing pods are intentional: that observation disappears in both cases.

## Define a workload-level expectation

Assume an inventory exporter exposes these custom gauges from the deployment controller or another authoritative configuration source:

```text
workload_desired_replicas{cluster="prod",namespace="jobs",workload="renderer"} 0
workload_monitoring_enabled{cluster="prod",namespace="jobs",workload="renderer"} 1
```

These are illustrative names, not built-in Kubernetes metrics. In Kubernetes, kube-state-metrics can provide controller-specific desired replica metrics; normalize them into an explicit contract if you support Deployments, StatefulSets and other workload kinds. Include `kind` in identity when names can collide.

The inventory must stay available when the application's replicas reach zero. Scraping an inventory metric from the application's own metrics endpoint defeats the design.

## Compare expectation with recent presence

Suppose every running workload exposes `workload_metrics_ready=1` after instrumentation initialization, and scrape relabeling attaches the same three identity labels. This expression finds expected workloads with no recent ready metric:

```promql
(
  workload_desired_replicas > 0
  and on (cluster, namespace, workload)
  workload_monitoring_enabled == 1
)
unless on (cluster, namespace, workload)
max by (cluster, namespace, workload) (
  present_over_time(workload_metrics_ready[5m])
)
```

A stored zero value also counts as presence. If `workload_metrics_ready` is a Boolean readiness contract, filter samples according to that contract separately; alternatively use a metric whose existence alone means initialization completed. Do not confuse “some sample exists” with “its numeric value is healthy.”

PromQL's [`unless` operator](https://prometheus.io/docs/prometheus/latest/querying/operators/) performs the set difference. `present_over_time` retains series with observations in the selected window. The five-minute range is already a delay; an additional `for: 5m` roughly doubles the time before the new absence condition can fire.

## Cover inventory failure

If desired-state telemetry vanishes, the left side disappears too. A separate inventory health alert is therefore part of the design:

```promql
absent_over_time(workload_desired_replicas{cluster="prod"}[5m])
```

This detects absence for the selected cluster as a whole, not one missing workload among many. For individual workloads, use an independent catalog of expected inventory entries. Monitor exporter scrape health, data age and the controller API connection as well.

Do not interpret an absent desired-state series as zero replicas. A dashboard should show distinct states: active and observed, intentionally inactive, expected but missing, and expectation unavailable.

## Handle zero-to-one startup deliberately

Desired replicas can become positive before a process is ready to export metrics. Allow an explicit startup budget based on image pull, scheduling, initialization and scrape latency. Make the budget finite; repeated pod restarts should not perpetually reset service-level detection.

For event-driven workloads, queue demand may arrive before desired replicas change. Retain a separate backlog-age or request-latency alert to detect a scaler that never starts the workload. A clean intentional-zero state only describes current controller intent, not whether that intent satisfies customer demand.

Kubernetes [autoscaling documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) explains how utilization, missing metrics and readiness influence scaling decisions. Monitoring should observe those decisions rather than infer them from the absence of CPU samples.

## Keep capacity and telemetry alerts separate

One healthy pod can satisfy a workload-level presence query even if nine expected replicas are missing. Use desired-versus-ready capacity monitoring for that condition. Conversely, all pods can be ready while a metric family is accidentally removed, so require critical telemetry independently.

A typical policy has three signals: insufficient ready capacity, missing telemetry for an active workload, and customer demand exceeding service ability. Their severities and responders can differ. This prevents a metrics exporter issue from being described as proof that the application is down.

## Exercise every state transition

Test zero replicas with no demand, zero replicas with growing demand, one desired replica starting normally, a startup exceeding its budget, all exporter targets removed, and the inventory exporter failing. Confirm the resulting alert labels stay at workload identity rather than changing with each pod.

Include deletion and suspension. Remove obsolete inventory only when the service is truly decommissioned, and retain evidence of intentional suspension with an owner and expiry if it is temporary.

## Conclusion

Scale-to-zero-aware monitoring starts from explicit desired state. Compare that independent expectation with observed telemetry, protect the expectation source itself, and retain demand and capacity alerts. A workload can then be inactive without generating noise, while accidental disappearance remains visible.
