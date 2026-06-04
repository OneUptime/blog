# Validation Summary: How to configure OpenTelemetry Collector pipelines for routing telemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector pipelines
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector debug exporter
- OpenTelemetry Collector spanmetrics connector
- OpenTelemetry Collector processors: batch, memory_limiter, resource, tail_sampling
- OTLP and OTLP/HTTP exporters
- Prometheus remote write
- Kubernetes kubectl commands

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector routing connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- OpenTelemetry Collector routing processor deprecation notice: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/routingprocessor
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post used the deprecated routing processor and routed directly to exporters. Updated the routing examples to use the routing connector, which is configured under `connectors` and routes to pipelines.
- Several examples placed processors after routing. The deprecated routing processor does not allow telemetry to continue through later processors as written, so the examples were changed to route into destination pipelines where batching, resource enrichment, and sampling run after the routing decision.
- The post used the deprecated/removed `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity`.
- The multi-tenant example defined `otlp/tenant-a` twice, so the tenant B exporter was invalid. Renamed the second exporter to `otlp/tenant-b`.
- The multi-tenant example attempted to extract tenant metadata with an attributes processor but did not enable receiver metadata. Updated the receiver with `include_metadata: true` and routed using the routing connector request context.
- The priority and cost examples used invalid attributes processor actions with `pattern` on insert operations. Replaced those classification patterns with routing connector OTTL conditions.
- The environment routing example used wildcard values such as `prod-*`, which are not routing connector equality matches. Replaced them with OTTL `IsMatch` conditions.
- The fan-out example used the deprecated spanmetrics processor fields. Replaced it with the spanmetrics connector and a metrics pipeline that receives from the connector.
- OneUptime OTLP examples used `oneuptime.com:443` and `x-oneuptime-api-key`. Updated them to use the documented OTLP/HTTP endpoint and `x-oneuptime-token` header.
- The monitoring metric example referenced `otelcol_processor_accepted_spans`, which is not the current internal processor metric name. Updated it to `otelcol_processor_incoming_items`.

## Review Notes
The fenced YAML snippets were parsed successfully after the fixes. I did not run `otelcol validate` because the Collector binary is not installed in this workspace.
