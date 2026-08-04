# Validation Summary: Tuning Remote Write `capacity`, Shards, Batch Size, and Backoff

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Prometheus
- Prometheus Remote Write
- Prometheus Remote Write 2.0 specification
- Prometheus queue configuration and automatic sharding
- PromQL metrics for Remote Write monitoring
- YAML configuration

## Sources Consulted

- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus Remote Write queue implementation and metric definitions](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Remote Write HTTP client implementation](https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go)
- [Prometheus default Remote Write and queue configuration](https://github.com/prometheus/prometheus/blob/main/config/config.go)
- [Prometheus Remote Write 2.0 retry and backoff semantics](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#retries--backoff)
- [Prometheus local storage and WAL documentation](https://prometheus.io/docs/prometheus/latest/storage/#local-storage)

## Issues Found

- The backoff explanation implied that every recoverable retry delay starts at `min_backoff` and is capped by `max_backoff`. Prometheus honors a positive `Retry-After` delay on retried 429 and 5xx responses, so I added that exception.
- The example discussion described `batch_send_deadline` as a delivery deadline. It controls when a partial batch is sent, while the HTTP request and retries can add more time, so I changed the wording to “batch-send deadline.”
- The baseline checklist could be read as saying retried, failed, and dropped sample metrics all have a `reason` label. Only `prometheus_remote_storage_samples_dropped_total` is partitioned by `reason`, so I clarified that retried and failed samples are counts while dropped samples are tracked by reason.

## Review Notes

- The documented defaults, configuration field names, YAML values, shard metrics, queue-memory formula, capacity recommendation, and `reason="too_old"` label match the current Prometheus documentation and source as of 2026-08-04.
- `retry_on_http_429` remains marked experimental in the Prometheus configuration reference.
- The cited Prometheus Remote Write 2.0 specification remains experimental, currently at release-candidate status.
