# Validation Summary: How to Audit and Identify the Top 10 Most Expensive Telemetry Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- OpenTelemetry Collector count connector
- OpenTelemetry Collector filter and tail_sampling processors
- OpenTelemetry Python SDK
- Prometheus and PromQL
- Python requests library

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector count connector README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/countconnector
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md

## Issues Found
- The internal telemetry configuration used `service.telemetry.metrics.address`, which is ignored in current Collector versions as of v0.123.0. Updated the snippet to use a Prometheus pull reader with `host`, `port`, `without_type_suffix`, and `without_units`.
- The post said the OpenTelemetry SDK sets `service.name` and `service.namespace` by default. Updated the text to clarify that SDKs fall back to `unknown_service` for `service.name` and that service attributes should be set explicitly.
- The Python resource comment implied the trace-only example attached attributes to spans, metrics, and logs. Updated the comment to say the same `Resource` should be used on trace, metric, and log providers.
- The count connector snippet used `metrics:` while describing metric data point counts. Updated it to `datapoints:` and renamed the generated metric to `otel.datapoint.count`.
- The action list referenced a `rate_limiter` extension, which is not a current standard Collector extension. Updated it to reference the `tail_sampling` processor's `rate_limiting` policy for trace rate limits.
- The filter processor example used a numeric severity comparison. Updated it to use the documented `SEVERITY_NUMBER_INFO` OTTL constant and added `error_mode: ignore`.

## Review Notes
The cost-estimation script is illustrative and uses per-item prices even though the surrounding text notes that many vendors price by GB ingested. For production use, teams should estimate average serialized item size or use backend/vendor ingestion byte metrics where available.
