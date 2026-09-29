# Validation Summary: How to Fix Fleet CPU Alerts During Autoscaling with Ready Capacity

## Status
validated

## Post Type
Technical guide with Prometheus recording rules and a PromQL workload CPU query.

## Technologies Covered
- Kubernetes CPU requests, limits, pod readiness, and workload capacity
- Horizontal Pod Autoscaler (HPA)
- Prometheus recording rules and PromQL
- kube-state-metrics
- cAdvisor CPU counters

## Sources Consulted
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/) — request-relative resource utilization, readiness handling, and missing metrics.
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/) — requests, CPU units, scheduling, and CPU limit enforcement.
- [kube-state-metrics: Pod metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md) — readiness and container request metric names, types, labels, stability, and the scheduler metric recommendation.
- [cAdvisor: Prometheus metrics](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md) — cumulative CPU usage counter and units.
- [Prometheus: Recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/) — rule-file structure, recording names, and evaluation ordering.
- [Prometheus: Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/) — aggregation, boolean comparisons, vector matching, grouping modifiers, and arithmetic.
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/) — counter rates, reset handling, and rate-before-aggregation semantics.

## Issues Found
1. The introduction attributed a worsening graph during healthy scale-in to a fixed total-CPU threshold. Removing capacity does not itself increase total CPU usage. Replaced this with the actual limitation: an absolute threshold can miss rising utilization as capacity shrinks.
2. The query explanation unconditionally described both totals as covering the same ready population. Readiness masking alone cannot ensure equal coverage when either metric source is incomplete. Qualified that statement with complete usage and request coverage and added the missing-usage failure mode: requests can remain in the denominator when usage disappears, understating the ratio. Also made the numerical unit explicit: the expression returns a ratio, with 1 representing 100% of requests.

## Review Notes
- The YAML structure and all four PromQL expressions were reviewed against official documentation. The metric names and selectors are current; no deprecated APIs or terminal commands appear in the post.
- CPU time in seconds divided by elapsed seconds yields CPU cores. Applying rate before sum preserves per-series counter reset handling.
- Boolean readiness values and matching on cluster, namespace, and pod correctly mask both totals under the documented enrichment and deduplication assumptions. Workload labels require external enrichment; they are not native to all metric families.
- The one-core/four-core example correctly motivates a ratio of totals instead of an unweighted average of per-pod ratios.
- Zero capacity can yield NaN or infinity, and absent inputs can yield no series. The advice to monitor availability and source coverage separately and gate saturation on positive capacity is appropriate.
- The current-readiness mask does not exclude startup CPU already present in a five-minute rate. The post correctly explains this and does not claim to reproduce the HPA controller.
- kube-state-metrics documents the request metric as stable and recommends the scheduler's effective pod-request metric for greater precision. The post appropriately limits its simple request sum and calls out init-container and pod-level resource behavior.
- The two technical links resolve to the intended official resources. No specific Kubernetes or Prometheus version is claimed.
- Validation was a documentation and static semantic review. promtool is not installed in the environment; no live Kubernetes rollout or Prometheus execution was performed.
