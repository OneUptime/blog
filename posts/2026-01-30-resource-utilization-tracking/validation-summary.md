# Validation Summary: How to Implement Resource Utilization Tracking

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Prometheus (PromQL, recording rules, alerting rules)
- Prometheus node_exporter (CPU, memory, disk, network, vmstat, netstat metrics)
- Kubernetes (resource requests/limits, ResourceQuota, allocatable resources)
- cAdvisor (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, CFS throttling metrics)
- kube-state-metrics v2.10.0 (pod/container/node resource specs, ServiceMonitor)
- Linux CFS scheduler (CPU throttling periods)
- Grafana (gauge and timeseries panel config)
- OpenTelemetry Python SDK (OTLP gRPC metric exporter, MeterProvider, PeriodicExportingMetricReader, observable gauges)
- psutil (process resource introspection)
- Mermaid (diagrams)

## Sources Consulted
- Prometheus querying basics — subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus node_exporter README (collectors and exposed metrics): https://github.com/prometheus/node_exporter
- kube-state-metrics CLI arguments and metric label allowlist docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/cli-arguments.md
- kube-state-metrics resource metrics documentation (pod, node, resourcequota): https://github.com/kubernetes/kube-state-metrics/tree/main/docs
- cAdvisor exposed Prometheus metrics reference
- OpenTelemetry Python SDK API documentation: https://opentelemetry-python.readthedocs.io/
- OpenTelemetry Python OTLP gRPC exporter source layout: opentelemetry-exporter-otlp-proto-grpc package
- psutil documentation: https://psutil.readthedocs.io/

## Issues Found
1. **Invalid PromQL subquery syntax in `Linear Regression for Forecasting`** — The two `deriv(...)` expressions in the `capacity_forecasting` group applied `[7d]` directly to a binary expression (`sum(rate(...)) / sum(...)`). In PromQL, `[duration]` without a colon is a range-vector selector and is only valid against a metric/series selector. Applying a range to a composed expression requires subquery syntax `[duration:resolution]` (resolution optional, but the colon is required). Fixed by wrapping each ratio in parentheses and changing `[7d]` to `[7d:1h]` so the inner expression is evaluated as a subquery, which is what `deriv` needs. This applies to both `cluster:cpu_exhaustion_days:prediction` and `cluster:memory_exhaustion_days:prediction`.

## Review Notes
- `node_procs_running - 1` is presented as "CPU run queue length (processes waiting for CPU)". This is a common simplification: `procs_running` reports the count of runnable processes (including those currently executing on each CPU), so on an N-CPU system the actual queue depth is closer to `max(0, node_procs_running - N)`. The post's table mitigates this by giving thresholds per-CPU, so left as-is.
- `node_procs_running` requires the node_exporter `processes` collector, which is **disabled by default**. Operators must enable it with `--collector.processes`. Not strictly an error in the post but worth noting in a future revision.
- The `node_load1 / count by (instance) (node_cpu_seconds_total{mode="idle"})` expression correctly yields load-per-CPU because there is one `idle` series per logical CPU.
- The OpenTelemetry observable-gauge callbacks use `yield metrics.Observation(...)`, which makes each callback a generator — that satisfies the SDK requirement that callbacks return an `Iterable[Observation]`. This is correct.
- `process.cpu_percent(interval=0.1)` blocks for 100 ms inside the observable callback, which could delay metric export under high cardinality. Functionally correct but a minor performance consideration.
- kube-state-metrics v2.10.0 is a valid released version; newer 2.x versions exist but the configuration shown remains compatible.
- All node_exporter metric names referenced (`node_cpu_seconds_total`, `node_load1`, `node_memory_*`, `node_vmstat_pgmajfault`, `node_vmstat_pswpin/pswpout`, `node_disk_io_time_*_seconds_total`, `node_network_*_drop_total`, `node_netstat_Tcp_RetransSegs`, etc.) match the upstream node_exporter naming conventions, including the PascalCase mapping for `/proc/net/snmp`-derived netstat metrics.
- kube-state-metrics `--metric-labels-allowlist=pods=[app,component],nodes=[topology.kubernetes.io/zone]` syntax is correct; dotted/slashed Kubernetes label keys are accepted inside the brackets.
