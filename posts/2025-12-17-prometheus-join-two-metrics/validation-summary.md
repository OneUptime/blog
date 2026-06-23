# Validation Summary: How to Join Two Metrics in Prometheus Query

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Vector matching
- Recording rules
- kube-state-metrics

## Sources Consulted
- Prometheus documentation: Operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Query functions (`label_replace`, `label_join`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics namespace metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/namespace-metrics.md
- kube-state-metrics ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md

## Issues Found
- The post described many-to-many joins as a supported vector matching type. Prometheus only supports one-to-one and explicitly requested many-to-one/one-to-many matching for arithmetic and comparison operators; many-to-many is not allowed for those joins. Updated the description and diagram label.
- The default matching section said binary operations match on common labels. Prometheus default one-to-one matching requires the exact same label set and values. Updated the explanation and example.
- Some examples labeled ratios as percentages without multiplying by 100. Updated the memory and filesystem examples to calculate percentages.
- Several kube-state-metrics examples used unprefixed Kubernetes label names such as `owner`, `app`, `version`, `zone`, and `instance_type`. kube-state-metrics exports allowlisted Kubernetes labels as `label_*` labels. Updated the examples to use `label_owner`, `label_app`, `label_version`, `label_topology_kubernetes_io_zone`, and `label_node_kubernetes_io_instance_type`.
- The ResourceQuota examples could fail when multiple ResourceQuota objects exist in a namespace. Aggregated the quota side by namespace before matching.
- The troubleshooting section suggested `group_left()`/`group_right()` as a fix for true many-to-many matching. Updated the example to aggregate first so one side is unique.
- The label retention troubleshooting note implied all labels outside `on()` are dropped. Updated it to clarify that labels from the one side are only copied when listed in the group modifier.

## Review Notes
Some metric names remain environment-dependent examples, such as application metrics and node utilization metrics. The PromQL vector matching syntax and kube-state-metrics label examples are now aligned with the official documentation.
