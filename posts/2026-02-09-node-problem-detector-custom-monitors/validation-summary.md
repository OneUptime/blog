# Validation Summary: How to Configure Node Problem Detector Custom Monitors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Node Problem Detector
- Node Problem Detector System Log Monitor
- Node Problem Detector Custom Plugin Monitor
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Bash

## Sources Consulted
- Node Problem Detector README and flags: https://github.com/kubernetes/node-problem-detector
- Node Problem Detector system log monitor documentation: https://github.com/kubernetes/node-problem-detector/blob/master/pkg/systemlogmonitor/README.md
- Node Problem Detector custom plugin monitor documentation: https://github.com/kubernetes/node-problem-detector/blob/master/docs/custom_plugin_monitor.md
- Node Problem Detector custom plugin config source: https://github.com/kubernetes/node-problem-detector/blob/master/pkg/custompluginmonitor/types/config.go
- Node Problem Detector custom plugin exit code handling: https://github.com/kubernetes/node-problem-detector/blob/master/pkg/custompluginmonitor/plugin/plugin.go
- Node Problem Detector problem metrics source: https://github.com/kubernetes/node-problem-detector/blob/master/pkg/problemmetrics/problem_metrics.go
- Node Problem Detector container image tags: https://registry.k8s.io/v2/node-problem-detector/node-problem-detector/tags/list
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The DaemonSet used the outdated `registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.15` image tag. Updated it to `v1.35.2`, which is the latest Node Problem Detector release and is present in the official Kubernetes image registry.
- The `kmsg` system log monitor example included `pluginConfig.source`. Official NPD documentation states that `kmsg` has no plugin configuration, so the unsupported `pluginConfig` block was removed.
- The NetworkLatency custom plugin rule was configured as `temporary`, but later Prometheus examples alerted on `problem_gauge`, which is emitted for permanent problems. Changed the rule to `permanent` so it updates the `NetworkLatency` node condition and gauge metric.
- The disk IO script used a fixed `/tmp/npd-disk-test` path, unquoted variables, and could divide by zero for very fast runs. Updated it to use `mktemp`, quote the file path, and guard against zero-duration calculations.
- The CPU throttling script only read `/sys/fs/cgroup/cpu/cpu.stat`, which misses the standard cgroup v2 path. Updated it to check `/sys/fs/cgroup/cpu.stat` first, fall back to the cgroup v1 path, and handle missing statistics safely.
- The PromQL examples referenced `problem_counter{type!=""}` even though NPD's `problem_counter` only has a `reason` label. Replaced it with `sum by (reason) (problem_counter)`.
- The PromQL examples referenced `problem_duration_seconds`, which is not an NPD problem metric. Removed that query.

## Review Notes
The examples are now aligned with current Node Problem Detector monitor config fields, command-line flags, image tags, and problem metric labels. The custom scripts remain illustrative and should still be tuned for each cluster's OS, cgroup layout, container image utilities, and operational thresholds.
