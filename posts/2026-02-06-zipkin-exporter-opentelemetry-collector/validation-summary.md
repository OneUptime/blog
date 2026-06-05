# Validation Summary: How to Configure the Zipkin Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Zipkin exporter
- Zipkin v2 span ingestion API
- OpenTelemetry Collector processors: batch, memory_limiter, resource, attributes, filter, tail_sampling, k8sattributes
- OpenTelemetry Collector exporter retry, sending queue, and file_storage extension
- Collector internal telemetry and Prometheus metrics
- Kubernetes metadata enrichment

## Sources Consulted
- OpenTelemetry Collector Zipkin exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/zipkinexporter/README.md
- OpenTelemetry Collector Zipkin exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/zipkinexporter/config.go
- OpenTelemetry Collector HTTP client configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector TLS configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configtls/README.md
- OpenTelemetry Collector exporterhelper queue, retry, timeout, and persistent queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector k8sattributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Collector file_storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- Zipkin API documentation: https://zipkin.io/zipkin-api/

## Issues Found
- The Zipkin exporter examples nested HTTP client settings under `http`, but the Zipkin exporter embeds the Collector HTTP client config at the exporter level. Moved `max_idle_conns`, `max_idle_conns_per_host`, `idle_conn_timeout`, `tls`, `headers`, and `compression` to the `zipkin` exporter level.
- The production and monitoring examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current Prometheus pull reader configuration using `host` and `port`, and preserved the listed metric names with `without_type_suffix` and `without_units`.
- The persistent queue example used `sending_queue.persistent_storage`, which is not the current exporterhelper field. Replaced it with `sending_queue.storage`.
- The filtering example used the older nested `traces.span` filter syntax and deprecated `http.target` attribute. Updated it to current `trace_conditions` syntax with `error_mode: ignore` and `span.attributes["url.path"]`.
- The sampling example defined a standalone `probabilistic_sampler` processor but did not include it in the pipeline, making that configuration misleading. Removed the unused processor block and kept the tail-sampling policies that were actually referenced.
- The performance section claimed protobuf gives "30-50% better performance" without an official source. Changed the wording to the supported general claim that protobuf is used for better performance.

## Review Notes
Representative Collector configurations from the corrected production, filtering/sampling, persistent queue, performance, and telemetry examples were validated with `otel/opentelemetry-collector-contrib:latest validate`. No further technical issues were found.
