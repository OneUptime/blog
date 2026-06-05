# Validation Summary: How to Set Up OpenTelemetry with Elasticsearch for Full-Text Log Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Elasticsearch exporter
- OpenTelemetry Python SDK logging and tracing
- OTLP/gRPC
- Elasticsearch index templates and mappings
- Elasticsearch Query DSL
- Elasticsearch Index Lifecycle Management

## Sources Consulted
- OpenTelemetry Collector Contrib Elasticsearch exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry Collector Contrib Elasticsearch exporter source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/model.go
- OpenTelemetry Collector Contrib Resource Detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Elasticsearch index template docs: https://www.elastic.co/docs/manage-data/data-store/templates
- Elasticsearch mapping docs: https://www.elastic.co/docs/manage-data/data-store/mapping
- Elasticsearch ILM rollover action docs: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch ILM shrink action docs: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-shrink

## Issues Found
- The post used deprecated Elasticsearch exporter `mapping.mode: ecs`. Updated the Collector configuration to use `mapping.allowed_modes: [ecs]`, because current exporter docs state file-level `mapping.mode` is deprecated/ignored and default mapping selection is controlled by allowed modes, client metadata, or scope attributes.
- The post used non-ECS field names such as `trace_id`, `span_id`, `severity_text`, `severity_number`, `body`, and `resource.service.name` while configuring ECS mapping. Updated the index template and queries to use ECS exporter fields: `trace.id`, `span.id`, `log.level`, `event.severity`, `message`, and `service.name`.
- The resource detection processor was configured with the deprecated `resourcedetection` component alias and described as Kubernetes metadata detection while using `env`, `system`, and `docker` detectors. Updated it to `resource_detection` and corrected the comment to host/container metadata.
- The Python OTLP/gRPC exporters used `otel-collector:4317` without an explicit scheme or insecure setting. Updated the endpoints to `http://otel-collector:4317` with `insecure=True`, matching OTLP/gRPC exporter configuration rules for insecure local Collector connections.
- The Python logging setup created a `LoggerProvider` but did not set it as the global logger provider. Added `set_logger_provider(logger_provider)` to match current OpenTelemetry Python logging guidance.
- Elasticsearch request snippets were fenced as JSON even though they include Dev Tools-style `PUT`/`GET` request lines and comments. Changed those fences to `http`.
- The sample trace ID was not a valid OpenTelemetry trace ID length. Replaced it with a 32-character hexadecimal trace ID.
- The ILM section implied that creating a policy alone handles retention automatically. Added a note that the policy must be attached to a data stream or index template, and that alias-based rollover also needs `index.lifecycle.rollover_alias` and a bootstrapped write index.

## Review Notes
- The Elasticsearch exporter supports ECS mapping for logs and traces, but its docs warn ECS mapping behavior is still undergoing changes. Future reviews should re-check field names and mapping selection behavior against the exporter version used by readers.
- The Docker detector requires access to the Docker socket when used in real deployments; this is outside the post's immediate setup but worth noting in a future expansion.
