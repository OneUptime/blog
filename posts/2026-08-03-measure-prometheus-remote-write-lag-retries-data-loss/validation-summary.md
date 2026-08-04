# Validation Summary: How to Measure Remote Write Lag, Pending Samples, Retries, and Data Loss

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- Prometheus Remote Write 1.0 and 2.0
- PromQL
- Prometheus Remote Write queue manager
- Prometheus TSDB write-ahead log (WAL) and WAL watcher
- Native histograms and exemplars

## Sources Consulted

- [Prometheus Remote Write tuning](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus Remote Write configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus queue manager source](https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go)
- [Prometheus Remote Write HTTP client source](https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go)
- [Prometheus Remote Write storage/appender source](https://github.com/prometheus/prometheus/blob/main/storage/remote/write.go)
- [Prometheus WAL watcher source](https://github.com/prometheus/prometheus/blob/main/tsdb/wlog/watcher.go)
- [Prometheus Remote Write 1.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec/)
- [Prometheus Remote Write 2.0 specification](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/)
- [Prometheus local storage and WAL documentation](https://prometheus.io/docs/prometheus/latest/storage/#local-storage)
- [PromQL functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [PromQL operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)

## Issues Found

- The post described `prometheus_remote_storage_queue_highest_sent_timestamp_seconds` as an unconditional record of successful delivery. The current queue-manager implementation also advances it after a terminal non-recoverable send error. The heading and explanation now describe it as a normal-operation lag signal, require pairing it with failure counters, and carry the same caveat into the timestamp-gap explanation.
- The active-ingestion gate used a global TSDB counter without explaining that write relabeling can remove every sample for one destination. The text now identifies that query as a coarse gate and recommends route-specific activity that survives the queue's relabeling path.
- The pending-samples explanation said all pending samples were simply waiting in shard queues. The gauge remains incremented while a batch is in flight or retrying and is decremented at a terminal outcome, so the explanation was corrected.
- The compressed-bytes explanation could be read as actual network throughput across retries and as including all metadata. The queue manager records the compressed data-request size once after send processing, not once per retry attempt, and separately sent Remote Write 1.0 metadata is exposed through `prometheus_remote_storage_metadata_bytes_total`. The guidance now distinguishes those counters from network-level saturation metrics.
- The permanent-failure explanation omitted samples dropped from pending shard queues during hard shutdown. The `prometheus_remote_storage_samples_failed_total` description now includes that path.
- The Remote Write 1.0 success statement was too general. It now states the concrete Prometheus behavior: a 2xx response to a 1.0 message without written-count headers is treated as full-batch success.
- The data-durability discussion implied that the acceptance-versus-persistence boundary was specific to Remote Write 1.0. The text now clarifies that Remote Write 2.0 written-count headers report receiver-defined acceptance and do not prove durable persistence.

## Review Notes

- The YAML configuration and all PromQL examples are syntactically consistent with current Prometheus documentation.
- The documented metric names, labels, drop reasons, retry behavior, HTTP 429 default, shard behavior, and WAL-watcher signals match the current Prometheus source.
- Remote Write 2.0 remains experimental in the current specification, and `prometheus.WriteRequest` remains the default `protobuf_message` in the current Prometheus configuration reference.
- All external links in the post returned successful HTTP responses during validation.
