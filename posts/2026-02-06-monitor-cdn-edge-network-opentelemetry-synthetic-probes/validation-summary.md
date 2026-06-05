# Validation Summary: How to Monitor CDN and Edge Network Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK metrics
- OpenTelemetry OTLP gRPC metric exporter
- OpenTelemetry Collector OTLP receiver, resource processor, batch processor, and OTLP exporter
- urllib3 HTTP client
- Prometheus / PromQL
- CDN cache response headers

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Cloudflare cache response documentation: https://developers.cloudflare.com/cache/concepts/cache-responses/

## Issues Found
- The OpenTelemetry histogram names included `_ms` while also setting `unit="ms"`. OpenTelemetry-to-Prometheus translation can add the unit suffix to metric names, so the PromQL examples would not match the exported metric names. Changed histogram names to `cdn.probe.ttfb` and `cdn.probe.total_time`, and updated PromQL to use `cdn_probe_ttfb_milliseconds_*` and `cdn_probe_total_time_milliseconds_*`.
- The cache hit ratio query claimed to cover the last hour but used raw cumulative counters. Changed it to use `increase(...[1h])`.
- The average response time query averaged per-series ratios instead of aggregating histogram sums and counts by URL over a time window. Changed it to divide `sum by (cdn_url) (rate(..._sum[10m]))` by `sum by (cdn_url) (rate(..._count[10m]))`.
- The cache status classifier only counted exact `HIT` / `MISS` strings and missed common CDN values such as CloudFront-style `Hit from cloudfront` and Cloudflare statuses including `STALE`, `REVALIDATED`, `UPDATING`, `BYPASS`, and `DYNAMIC`. Added normalization and broader hit/miss classification based on documented CDN cache statuses.
- The Python probe assigned the first-byte read to an unused variable. Removed the unused assignment while preserving the TTFB measurement behavior.

## Review Notes
The code snippets are syntactically valid Python. The collector configuration uses valid OTLP receiver/exporter, resource processor, and batch processor structure. The `httpcheck` receiver exists in the OpenTelemetry Collector contrib/Kubernetes distributions and is currently listed as alpha.
