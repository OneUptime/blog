# Validation Summary: How to Build Loki Write Path Optimization

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Promtail
- Fluent Bit
- OpenTelemetry Collector
- LogCLI
- Prometheus recording and alerting rules
- Python requests
- S3/object storage

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki configuration best practices: https://grafana.com/docs/loki/latest/configure/bp-configure/
- Grafana Loki Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki cardinality documentation: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Loki label best practices: https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/
- Grafana Loki LogCLI documentation: https://grafana.com/docs/loki/latest/query/logcli/getting-started/
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Fluent Bit buffering documentation: https://docs.fluentbit.io/manual/data-pipeline/buffering

## Issues Found
- The Fluent Bit Loki output example used `BatchWait` and `BatchSize`, which are not valid Fluent Bit Loki output options. Replaced them with the supported `[SERVICE] Flush` setting and kept the valid Loki output options.
- The Promtail example incorrectly implied `external_labels` enables HTTP compression. Changed the comment to describe static labels and added a current support caveat because Promtail is EOL as of March 2, 2026.
- The Loki `chunk_target_size` comments described the value as an uncompressed size. Updated the comments to say it is a target compressed chunk size.
- The `flush_op_timeout` comment incorrectly described it as a queue size. Updated it to describe the flush attempt timeout.
- The compression recommendation presented `zstd` as the default best choice for most production deployments. Updated the guidance and production config to use `snappy` as the high-throughput starting point, with `lz4` or `zstd` as benchmark-driven alternatives.
- The WAL comments incorrectly described `flush_on_shutdown` and `replay_memory_ceiling`. Updated them to match Loki's documented behavior.
- The memory sizing formula treated the compressed chunk target as an uncompressed in-memory size. Reworded it to use measured in-memory chunk footprint and WAL replay headroom.
- The cardinality detection LogQL query used a non-existent `label_name` grouping and would not identify label cardinality. Replaced it with the documented `logcli series '{}' --since=24h --analyze-labels` command.
- Removed unused Python imports and added `raise_for_status()` calls so API failures are not silently treated as empty results.
- The write-path diagram referred only to gzip compression and zstd chunks. Updated it to reflect Loki's Snappy protobuf or gzipped JSON push formats and the post's revised snappy chunk recommendation.
- The production configuration placed out-of-order-write comments beside `distributor.otlp_config`. Reworded those comments to describe OTLP label mapping and clarified the out-of-order write window under `limits_config`.
- The architecture overview listed older index-store examples. Updated it to reflect current TSDB/BoltDB Shipper object-storage-oriented deployments.

## Review Notes
Promtail content is technically usable for existing deployments, but new deployments should prefer Grafana Alloy or another supported client because Promtail is EOL. Some sizing values remain illustrative and should be benchmarked against a real workload.
