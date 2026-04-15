# Validation Summary: How to Monitor AI Agent Performance with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, Configuration CRD, annotations)
- Prometheus (metrics collection, scrape configuration, relabeling)
- Grafana (PromQL dashboard queries)
- Python prometheus_client library
- Zipkin / Jaeger (distributed tracing)
- Kubernetes (pod annotations, service discovery, port-forwarding)

## Sources Consulted
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr official metrics list (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Prometheus relabel_config documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus kubernetes_sd_configs examples: https://github.com/prometheus/prometheus/blob/main/documentation/examples/prometheus-kubernetes.yml
- Python prometheus_client library documentation: https://prometheus.github.io/client_python/

## Issues Found

### 1. Invalid `port` field in Dapr Configuration CRD (line 34)
**What was wrong:** The `spec.metric` section included `port: 9090`, which is not a valid field in the Dapr Configuration resource. The metrics port is configured via the `dapr.io/metrics-port` Kubernetes annotation or the `--metrics-port` CLI flag, not through the Configuration CRD.
**What was changed:** Removed the `port: 9090` line from the Configuration YAML. The port is already correctly set via the `dapr.io/metrics-port: "9090"` annotation shown later in the post.

### 2. Incorrect Dapr HTTP latency metric name (line 61)
**What was wrong:** `dapr_http_server_latency_ms` is not a real Dapr metric. The actual metric is `dapr_http_server_latency` (no `_ms` suffix).
**What was changed:** Corrected to `dapr_http_server_latency`.

### 3. Incorrect Dapr actor metric names (lines 64-66)
**What was wrong:** Three actor metric names used a `dapr_actor_` prefix that does not exist. All Dapr actor metrics use the `dapr_runtime_actor_` prefix. Specifically:
- `dapr_actor_active_actors` does not exist at all
- `dapr_actor_timer_fired_total` should be `dapr_runtime_actor_timers_fired_total` (plural "timers")
- `dapr_actor_reminder_fired_total` should be `dapr_runtime_actor_reminders_fired_total` (plural "reminders")
**What was changed:** Corrected to `dapr_runtime_actor_pending_actor_calls`, `dapr_runtime_actor_timers_fired_total`, and `dapr_runtime_actor_reminders_fired_total`.

### 4. Broken Prometheus relabel config for port replacement (lines 139-144)
**What was wrong:** The relabel config used only `__meta_kubernetes_pod_annotation_prometheus_io_port` as the source label and replaced `__address__` with just the port value (e.g., `9090`), discarding the pod IP entirely. Prometheus would then try to scrape `9090` as a hostname, which would fail.
**What was changed:** Corrected to the standard approach that combines both `__address__` and the port annotation as source labels, using regex `([^:]+)(?::\d+)?;(\d+)` with replacement `$1:$2` to properly construct `<pod-ip>:<annotation-port>`.

## Review Notes
- The Python `prometheus_client` code is syntactically correct and uses current APIs properly (Counter, Histogram, Gauge, start_http_server, labels, observe, inc).
- The PromQL queries are valid and correctly compute average latency, error rate, and token consumption rate from the custom metrics.
- The Jaeger port-forward command and default UI port (16686) are correct.
- The Dapr tracing claims (service invocation, pub/sub, state store tracing) are accurate.
- The token consumption PromQL query `rate(agent_llm_tokens_total[1h]) * 60` gives tokens-per-minute, which is described as "cost tracking" -- this is a reasonable proxy but not a direct cost calculation. This is more of a labeling nuance than a technical error.
