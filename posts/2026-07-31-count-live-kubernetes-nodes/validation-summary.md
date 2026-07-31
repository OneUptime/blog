# Validation Summary: How to Count Live Kubernetes Nodes and Alert on Unexpected Fleet-Size Changes

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Nodes and Node conditions
- kube-state-metrics
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus alerting rules

## Sources Consulted

- [kube-state-metrics: Node metrics](https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md)
- [kube-state-metrics: Node metric generator](https://github.com/kubernetes/kube-state-metrics/blob/main/internal/store/node.go)
- [kube-state-metrics: Condition metric generation](https://github.com/kubernetes/kube-state-metrics/blob/main/internal/store/utils.go)
- [kube-state-metrics project documentation](https://github.com/kubernetes/kube-state-metrics)
- [Kubernetes: Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/)
- [Kubernetes API: Node v1](https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/)
- [Prometheus: Recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus: Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus: Query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Querying basics and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus: Configuration and external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus: Jobs, instances, and the `up` metric](https://prometheus.io/docs/concepts/jobs_instances/)

## Issues Found

- The original not-Ready count and per-node alert selected only explicit `Ready=False` or `Ready=Unknown` series. A registered Node can have no Ready condition yet, in which case kube-state-metrics emits no Ready-condition series for that Node. Changed both expressions to subtract the set of Ready-true nodes from the registered-node set with `unless`, so missing Ready conditions are treated as not Ready.
- The original per-node alert did not deduplicate multiple kube-state-metrics scrape targets and could create duplicate alert instances for one Node. Added `max by (cluster, node)` aggregation on both sides of the alert expression.
- PromQL aggregation returns no series, rather than a sample with value zero, when its input is empty. The original Ready count disappeared when no nodes were Ready, and the original not-Ready count disappeared when all nodes were Ready. Anchored both recording rules to registered clusters with a zero-valued `kube_node_info` aggregation.
- The fixed-size and Ready safety-floor alerts could return an empty result when the registered-node series disappeared, including when a successfully scraped cluster had zero Node objects. Added a zero fallback gated by a successful kube-state-metrics `up` series. The multi-cluster expected-size comparison now uses the expectation metric as inventory and supplies zero for an expected cluster with no actual count.
- The post referred to an external cluster label in a way that could imply Prometheus external labels are available to local PromQL evaluation. Clarified that `external_labels` are added when Prometheus communicates with external systems and that the query layer must actually contain the `cluster` label.
- `changes()` observes changes between samples but does not turn a disappeared count series into a zero-valued sample. Added a caveat that complete series disappearance requires an independent presence check.
- `up == 0` covers failed scrapes only for targets that Prometheus has discovered. Tightened the wording and retained the independent metric-presence check for complete target or series disappearance.

## Review Notes

- All PromQL and rule YAML was syntax-checked with `promtool` 3.13.2. The corrected recording rules and per-node alert also passed unit tests covering duplicate scrape targets, a registered Node with no Ready condition, an all-Ready cluster, zero-valued counts, and alert-label templating.
- No version-specific deprecated APIs or commands are used. The existing Kubernetes Node API link redirects to the current canonical Node v1 page.
- The examples require a real `cluster` target or ingestion label on both kube-state-metrics samples and the generated `up` series. Prometheus `external_labels` alone do not make that label available to local recording and alerting rules.
- Kubernetes documents `machineID` as preferable to `systemUUID` for unique machine identification. Current kube-state-metrics Node documentation exposes `system_uuid` and `provider_id` on `kube_node_info`; the post appropriately treats them as correlation fields rather than Kubernetes scheduling identity.
