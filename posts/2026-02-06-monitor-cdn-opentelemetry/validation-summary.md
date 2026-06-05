# Validation Summary: How to Monitor Content Delivery Networks (CDN) with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry OTLP exporters
- OpenTelemetry Collector configuration
- OpenTelemetry Collector filelog receiver and attributes/resource/batch processors
- OpenTelemetry semantic conventions
- Flask routing
- aiohttp asynchronous HTTP client
- CDN cache, purge, POP, latency, and synthetic monitoring concepts

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector architecture and pipelines documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- aiohttp client reference: https://docs.aiohttp.org/en/stable/client_reference.html
- Flask variable rules documentation: https://flask.palletsprojects.com/en/stable/quickstart/#variable-rules

## Issues Found
- The origin server resource used `deployment.environment`, which is deprecated in current OpenTelemetry semantic conventions. Changed it to `deployment.environment.name`.
- The Collector section claimed the shown pipeline extracted metrics from logs, but the configuration only parsed, normalized, and exported log records. Updated the prose and comments to describe attribute normalization instead of metric extraction.
- The Collector configuration defined an OTLP receiver but did not enable it in the logs pipeline, and its comment implied raw CDN log batches could be sent directly to OTLP. Updated the comment to clarify that HTTP ingestion requires OTLP-formatted logs and enabled both `filelog` and `otlp` in the logs pipeline.
- The purge metric recorded `cdn.purge.scope` as `purge_request.purge_type`, which would emit values such as `wildcard` instead of the broad/targeted scope used by the span attributes. Added a `purge_scope` value and used it for the metric attribute.

## Review Notes
- The Python examples are syntactically valid, but they are illustrative snippets and rely on application-specific objects such as `fetch_asset`, `cdn_api`, `purge_counter`, and `ttfb_histogram`.
- CDN response and origin header names vary by provider. The post correctly treats the shown names as examples rather than universal standards.
- The Collector example forwards logs; deriving metrics from those logs would require an additional metrics-generating path or backend-side queries.
