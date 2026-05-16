# Validation Summary: How to Monitor Cgroup Metrics on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- cgroup v2 (Linux control groups)
- Pressure Stall Information (PSI)
- cadvisor (Container Advisor)
- Kubernetes (kubelet, DaemonSet, ServiceMonitor)
- Prometheus (PrometheusRule, recording rules, alerting rules, metric relabeling)
- prometheus-operator (monitoring.coreos.com/v1 CRDs)
- Grafana (dashboard JSON)
- prometheus-node-exporter

## Sources Consulted
- Linux kernel PSI docs: https://docs.kernel.org/accounting/psi.html
- cgroup v2 docs: https://docs.kernel.org/admin-guide/cgroup-v2.html
- cadvisor metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cadvisor runtime options: https://github.com/google/cadvisor/blob/master/docs/runtime_options.md
- prometheus-operator ServiceMonitor / PrometheusRule CRD docs
- node_exporter collectors: https://github.com/prometheus/node_exporter
- Talos Linux documentation: https://www.talos.dev/

## Issues Found
1. **`container_memory_failures_total` label name was wrong** — the post used `type="pgfault"` and `type="pgmajfault"`, but cadvisor exposes this metric with the label `failure_type`, not `type`. Fixed in both recording rules in the `cgroup.memory` group.
2. **`accelerator` is not a valid cadvisor metric flag value** — the `--disable_metrics=` list contained `accelerator`, which is not in cadvisor's metric set, so it would cause cadvisor to fail to start (or be ignored depending on version). Removed it from the list.
3. **PSI section said "three metrics per resource"** — PSI provides only two indicators per resource (`some` and `full`), and the post itself only listed two. Changed "three" to "two".
4. **`container_memory_failures_total` was both dropped and used** — the cadvisor ServiceMonitor's `metricRelabelings` dropped `container_memory_failures_total`, but the recording rules below relied on it for page-fault rates. Removed it from the drop regex so the recording rules continue to work.

## Review Notes
- CPU `cpu.pressure` does contain a `full` line on modern kernels (since 5.13) for backward compatibility, but CPU "full" at the system level is undefined and the values are always zero. The post's general description of `some`/`full` is fine for the cgroup-level use case discussed.
- The `--collector.cgroups` node_exporter collector is disabled by default and was introduced in node_exporter ~1.4 — readers on older versions may need to upgrade.
- cadvisor v0.49.1 is pinned; by 2026 newer cadvisor releases exist, but v0.49.1 is a real, valid release and the flags used remain valid in later versions.
- The kubelet ServiceMonitor uses `insecureSkipVerify: true`, which is common for kubelet scraping but not ideal in hardened environments — readers in regulated environments may want to provide proper CA configuration.
- The `ContainerOOMDetected` alert depends on `kube-state-metrics` being deployed (for `kube_pod_container_status_*`), which is not mentioned but is a standard component in most Prometheus stacks.
