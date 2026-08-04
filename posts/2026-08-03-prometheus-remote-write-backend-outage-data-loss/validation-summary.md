# Validation Summary: How Long Can Remote Write Survive a Backend Outage Before Losing Samples?

## Status

validated

## Post Type

Technical guide and recovery-planning reference

## Technologies Covered

- Prometheus 3.13.2
- Prometheus Remote Write 1.0 and 2.0
- Prometheus server mode and Agent mode
- Prometheus TSDB write-ahead log (WAL)
- Prometheus Remote Write queue configuration and metrics
- PromQL
- Kubernetes storage and persistent volumes

## Sources Consulted

- [Prometheus Remote Write tuning and two-hour WAL behavior](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus 3.13 local storage documentation](https://prometheus.io/docs/prometheus/3.13/storage/)
- [Prometheus 3.13 command-line reference](https://prometheus.io/docs/prometheus/3.13/command-line/prometheus/)
- [Prometheus 3.13 Agent mode documentation](https://prometheus.io/docs/prometheus/3.13/prometheus_agent/)
- [Prometheus 3.13 configuration reference](https://prometheus.io/docs/prometheus/3.13/configuration/configuration/#remote_write)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus 3.13.2 release](https://github.com/prometheus/prometheus/releases/tag/v3.13.2)
- [Prometheus 3.13.2 Remote Write HTTP client source](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/client.go)
- [Prometheus 3.13.2 Remote Write queue manager source](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/queue_manager.go)
- [Prometheus 3.13.2 WAL watcher source](https://github.com/prometheus/prometheus/blob/v3.13.2/tsdb/wlog/watcher.go)
- [Prometheus 3.13.2 Agent WAL source](https://github.com/prometheus/prometheus/blob/v3.13.2/tsdb/agent/db.go)
- [Kubernetes volume and `emptyDir` lifecycle documentation](https://kubernetes.io/docs/concepts/storage/volumes/#emptydir)

## Issues Found

- The opening two-hour statement said that failures generally are retried without loss. It was narrowed to retriable failures because Prometheus does not retry most HTTP 4xx responses; HTTP 429 is retried only when `retry_on_http_429` is enabled.
- The storage section implied that a Kubernetes `emptyDir` is lost on any restart. It now states that `emptyDir` survives container restarts but is deleted with the Pod, and recommends persistent storage for Pod replacement or movement to another node.
- The catch-up section said that `C <= R` inevitably postpones a gap. It now distinguishes `C < R`, where lag grows until it exceeds a finite WAL window, from `C = R`, where backlog can remain at a constant lag but cannot drain. Catch-up requires `C > R`.

## Review Notes

- Prometheus 3.13.2 was the current release on the validation date. Its generated command reference and binary help report Agent retention defaults of `5m` minimum and `4h` maximum, while the narrative Agent page still says two hours. The post correctly tells operators to inspect the deployed binary and process arguments.
- The official two-hour server-mode guidance and Agent maximum retention are truncation boundaries, not service-level guarantees; disk capacity, `sample_age_limit`, permanent errors, and catch-up throughput can shorten the usable recovery window.
- The PromQL examples were parsed successfully with Prometheus 3.13.2 `promtool`, and the Remote Write YAML fields were validated with `promtool check config`.
- Metric selectors using `remote_name="central"` and `consumer="central"` assume that the corresponding Remote Write configuration is named `central`; otherwise Prometheus uses the configured or generated queue name.
