# Validation Summary: How to Set Up Prometheus Remote Write Over IPv4 Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus Remote Write
- Prometheus configuration YAML
- PromQL
- VictoriaMetrics
- Docker
- IPv4 networking

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus remote write tuning guide: https://prometheus.io/docs/practices/remote_write/
- Prometheus Remote Write 1.0 specification: https://prometheus.io/docs/specs/prw/remote_write_spec/
- Prometheus source for remote write self-metrics: https://github.com/prometheus/prometheus/blob/main/storage/remote/queue_manager.go
- VictoriaMetrics single-node documentation: https://docs.victoriametrics.com/victoriametrics/
- VictoriaMetrics Prometheus integration guide: https://docs.victoriametrics.com/data-ingestion/prometheus/

## Issues Found
- The bearer-token example used older `bearer_token` syntax. I changed it to the current `authorization` block with `type: Bearer` and `credentials`, which matches current Prometheus HTTP client configuration documentation.
- The monitoring section used two incorrect Prometheus self-metric names: `prometheus_remote_storage_failed_samples_total` and `prometheus_remote_storage_pending_samples`. I corrected them to `prometheus_remote_storage_samples_failed_total` and `prometheus_remote_storage_samples_pending` based on current Prometheus source and tuning documentation.
- The monitoring notes described `prometheus_remote_storage_samples_failed_total` too broadly. I updated the description to clarify that it tracks non-recoverable failed samples.
- The PromQL example labeled queue depth as latency. I corrected the wording to describe it as queue backlog, which is what the metric actually represents.
- The takeaway saying `remote_write.url` accepts an `IPv4:port` endpoint was too imprecise. I corrected it to say it requires a full HTTP or HTTPS URL, which may use an IPv4 host.
- The takeaway suggesting `max_shards` should be increased for high-throughput environments was too broad. I corrected it to reflect Prometheus guidance that defaults are often sufficient and tuning should be deliberate.

## Review Notes
- The VictoriaMetrics receiver example is valid for single-node VictoriaMetrics: `http://<victoriametrics-addr>:8428/api/v1/write` is the documented Prometheus remote write endpoint.
- `-retentionPeriod=12` is valid in VictoriaMetrics and means 12 months because an omitted unit defaults to months.
- The post does not specify `protobuf_message`, which is acceptable. Prometheus still defaults `remote_write` to `prometheus.WriteRequest` unless configured otherwise.
