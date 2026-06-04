# Validation Summary: How to Configure Log Sampling and Throttling to Reduce Kubernetes Log Volume

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Fluent Bit
- Fluent Bit Lua, Kubernetes, parser, grep, and Loki plugins
- Vector `kubernetes_logs`, `route`, `throttle`, and Loki sink configuration
- Grafana Loki and LogQL
- Lua

## Sources Consulted
- Fluent Bit Lua filter official documentation: https://docs.fluentbit.io/manual/dev-4.0/pipeline/filters/lua
- Fluent Bit grep filter official documentation: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit Loki output official documentation: https://docs.fluentbit.io/manual/pipeline/outputs/loki
- Fluent Bit Prometheus exporter official documentation: https://docs.fluentbit.io/manual/pipeline/outputs/prometheus-exporter
- Fluent Bit throttle filter official documentation: https://docs.fluentbit.io/manual/pipeline/filters/throttle
- Vector throttle transform official documentation: https://vector.dev/docs/reference/configuration/transforms/throttle/
- Vector route transform official documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector Kubernetes logs source official documentation: https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/
- Grafana Loki Fluent Bit documentation: https://grafana.com/docs/loki/latest/send-data/fluentbit/
- Grafana Loki label guidance: https://grafana.com/docs/loki/latest/get-started/labels/

## Issues Found
- The post said Fluent Bit sampling was implemented with `nest` and `grep`; Fluent Bit does not provide sampling through `nest`. Updated the wording to describe the actual `lua` plus `grep` approach used by the configuration.
- The Fluent Bit Loki output only set `job=kubernetes`, but later LogQL examples queried `namespace` and `level` labels. Added Loki record-accessor labels for namespace and level.
- The content-based Lua sampling example intended to keep 1% of noisy logs, but retained noisy logs could fall through to default sampling and be dropped again. Added an immediate return for retained noisy logs.
- The Lua examples accessed `record["kubernetes"]["namespace_name"]` and `record["kubernetes"]["pod_name"]` without checking whether Kubernetes metadata existed. Added nil-safe access.
- The Vector `key_field` values were plain strings, which would not bucket by event field. Updated them to Vector template syntax.
- The Vector `kubernetes_logs` example used `kubernetes.namespace_name`, but current Vector defaults use `kubernetes.pod_namespace`. Updated route conditions and namespace throttling accordingly.
- The Vector route fallback used `source = "true"`, which would also match high-volume events because the `route` transform can send events to multiple matching routes. Made the low-volume route mutually exclusive.
- The Vector throttling thresholds made the later high-volume throttle ineffective after the initial namespace throttle. Adjusted thresholds so the stages have the intended effect.
- The monitoring example used Fluent Bit `prometheus_exporter` for arbitrary log records, but that output is for metrics from metric plugins. Replaced it with Loki output for periodic sampling summary log entries.
- The LogQL compensation examples used `avg(sample_rate)` as if `sample_rate` were directly queryable as a metric. Added `sample_weight` fields to retained sampled logs and updated LogQL to parse and unwrap that field.
- The alert expression mixed sampled and unsampled rates incorrectly. Updated it to divide error rate by a weighted total-log rate derived from `sample_weight`.

## Review Notes
The examples remain illustrative and should be tested against the exact deployed Fluent Bit, Vector, and Loki versions before production rollout. The post recommends consistent-hash sampling, but the included Lua examples still use random sampling; that is acceptable as a basic example but related-log correlation would require a deterministic key-based sampling implementation.
