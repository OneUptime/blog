# Validation Summary: Why Remote Write Increases Prometheus Memory and CPU: How to Control It

## Status
validated

## Post Type
Technical performance-tuning guide

## Technologies Covered
- Prometheus
- Prometheus Remote Write 1.0 and 2.0
- Prometheus TSDB and write-ahead log (WAL)
- PromQL
- Prometheus YAML configuration
- Protocol Buffers and Snappy compression
- Prometheus Agent mode

## Sources Consulted
- Prometheus Remote Write tuning documentation — https://prometheus.io/docs/practices/remote_write/
- Prometheus configuration reference for `remote_write`, queue configuration, write relabeling, and metadata — https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write
- Prometheus configuration reference for scrape and metric relabel configuration — https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config
- Prometheus relabel configuration reference — https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
- Prometheus Agent mode documentation — https://prometheus.io/docs/prometheus/latest/prometheus_agent/
- Prometheus Remote Write 1.0 specification — https://prometheus.io/docs/specs/prw/remote_write_spec/
- Prometheus Remote Write 2.0 specification — https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/
- Prometheus Remote Write queue implementation and exported metrics — https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go
- Prometheus Remote Write HTTP client implementation — https://github.com/prometheus/prometheus/blob/main/storage/remote/client.go
- Prometheus TSDB head metrics implementation — https://github.com/prometheus/prometheus/blob/main/tsdb/head.go
- Prometheus Go client process collector — https://github.com/prometheus/client_golang/blob/main/prometheus/process_collector.go
- Prometheus Go client Go runtime collector — https://github.com/prometheus/client_golang/blob/main/prometheus/go_collector.go

## Issues Found

1. **Retry encoding behavior was overstated**: The post said retries “encode or send batches again,” implying that every retry repeats protobuf construction and Snappy compression. Prometheus normally builds the compressed request before entering the retry loop and reuses those bytes for subsequent attempts. It rebuilds the request during a retry only when `sample_age_limit` requires newly old data to be filtered. Changed the sentence to say that retries “resend batches.”

2. **Batch-efficiency wording incorrectly generalized TLS as per-request overhead**: The post said larger batches can reduce “per-request CPU and TLS overhead.” Remote Write can reuse persistent HTTP connections, so a TLS handshake is not inherently performed for every request. Changed “TLS overhead” to “HTTP overhead,” which accurately describes the request-count reduction from larger batches.

3. **WAL outage retention was described too strongly**: The post called the unsent remainder in the WAL “durable” without stating the retention limit. The official tuning guide warns that an endpoint outage longer than two hours can allow WAL truncation to discard data that has not been sent. Changed the text to describe the remainder as disk-backed and made the two-hour loss boundary explicit.

## Review Notes
- The documented queue defaults (`capacity: 10000`, `max_samples_per_send: 2000`, and `max_shards: 50`) and the recommended capacity range of 3–10 times the batch size match the current Prometheus documentation.
- The memory model, approximately 25% typical Remote Write memory increase, per-destination series caches, dynamic sharding, and less-than-2-MB default shard-queue estimate match the official tuning guide and current implementation.
- The outage and backpressure guidance now reflects the tuning guide's warning that unsent WAL data can be lost after an endpoint has remained unavailable for more than two hours.
- The configuration examples use current field names and valid Prometheus relabel actions. Metric relabeling is correctly described as occurring before ingestion, while write relabeling is correctly described as occurring after external labels and only affecting a Remote Write destination.
- The PromQL metric names in the post exist in current Prometheus and client_golang source. `prometheus_remote_storage_samples_total` is incremented for every send attempt, so the post correctly warns that retries are included.
- Remote Write 2.0 remains experimental, and Prometheus still defaults to the Remote Write 1.0 `prometheus.WriteRequest` message. Operators must confirm receiver support before choosing `io.prometheus.write.v2.Request`.
- When native histograms or exemplars are enabled, `prometheus_remote_storage_histograms_pending` and `prometheus_remote_storage_exemplars_pending` can supplement the post's `prometheus_remote_storage_samples_pending` query because Prometheus exports separate pending gauges for those data types.
