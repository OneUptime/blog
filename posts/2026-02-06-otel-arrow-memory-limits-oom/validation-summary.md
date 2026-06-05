# Validation Summary: How to Configure OTel Arrow Memory Limits to Prevent OOM in High-Throughput

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTel Arrow receiver and exporter
- Collector memory_limiter processor
- Collector batch processor
- Collector exporter sending queues
- Prometheus alerting
- Kubernetes memory limits

## Sources Consulted
- OpenTelemetry Collector Contrib otelarrowreceiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/README.md
- OpenTelemetry Collector Contrib otelarrowreceiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/config.go
- OpenTelemetry Collector Contrib otelarrowexporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/otelarrowexporter/README.md
- OpenTelemetry Collector Contrib otelarrowexporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/otelarrowexporter/config.go
- OpenTelemetry Collector memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry blog, "OpenTelemetry Protocol with Apache Arrow in Production": https://opentelemetry.io/blog/2024/otel-arrow-production/

## Issues Found
- The receiver examples placed `arrow.memory_limit_mib` under `protocols.grpc`. Current `otelarrowreceiver` configuration defines Arrow settings under `protocols.arrow`, so I moved the setting to the correct level.
- The receiver examples omitted OTel Arrow admission control settings even though official docs identify them as key memory controls. I added `admission.request_limit_mib` and `admission.waiting_limit_mib`.
- The text said the Arrow receiver stops reading from streams when memory is exhausted. Official docs state it returns `RESOURCE_EXHAUSTED`, so I corrected the behavior description.
- The memory limiter wording implied direct data dropping. Official docs describe non-permanent refusal and retry/backpressure behavior, with data loss depending on upstream retry behavior, so I corrected the wording.
- The exporter example used an insecure internal endpoint without `tls.insecure: true`. I added it so the example matches Collector gRPC exporter configuration expectations.
- The exporter queue discussion treated `queue_size` as batches without setting the queue sizer. Current exporterhelper docs define `queue_size` units by `sizer`, and OTel Arrow changes defaults, so I added `sizer: requests` and `block_on_overflow: true` to match the surrounding explanation.
- The traffic-spike YAML repeated the `processors` key, which would override the earlier processor map in a real YAML document. I merged `memory_limiter` and `batch` under one `processors` map.
- The monitoring section used outdated or unsupported metric names: `process_resident_memory_bytes`, `otelcol_processor_refused_spans`, and `otelcol_receiver_otelarrow_memory_usage_bytes`. I replaced them with `otelcol_process_memory_rss`, `otelcol_receiver_refused_spans`, `arrow_memory_inuse`, and OTel Arrow admission metrics.
- The memory calculation used `num_agents * max_recv_msg_size_mib`, which is a rough worst case but not a direct Collector memory limit. I changed it to `concurrent_messages * max_recv_msg_size_mib` and added admission memory to the estimate.
- The tuning snippets used a bare `arrow:` fragment. I updated them to show `protocols.arrow.memory_limit_mib` to match the corrected receiver schema.

## Review Notes
The throughput sizing values remain illustrative rather than official capacity guidance. Real limits should be load-tested with representative telemetry, batch sizes, queue settings, and Collector resource limits.
