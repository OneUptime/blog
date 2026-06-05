# Validation Summary: How to Test Sampling Rules and Filter Logic Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib tail sampling processor
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector debug and file exporters
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python SDK and OTLP gRPC exporter
- Docker
- GitHub Actions
- YAML
- Python

## Sources Consulted
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The filter processor example used the older `traces.span` and `traces.spanevent` configuration shape. Updated it to the current documented `trace_conditions` format with explicit `span.attributes[...]` OTTL paths.
- The filter example described dropping traces from service accounts but placed the condition under `spanevent`, which would apply to span events rather than spans. Updated the condition to use `span.attributes["user.type"]`.
- The filter test script used the older `http.method` attribute. Updated it to `http.request.method`, which matches the current HTTP semantic conventions.
- The post said tail-sampling policies are evaluated in order and use the first matching policy's decision. Updated this to clarify that top-level policies are additive and a trace is sampled if any policy samples it; ordering and rate allocation are specifically important for composite policies.
- The probabilistic sampling comments implied an exclusive "remaining successful fast traces" fallback. Updated the comments to avoid suggesting exclusivity that is not enforced by the shown top-level policy configuration.

## Review Notes
The examples are version-sensitive because the filter processor README notes that current documentation applies to version 0.146.0 and later, while older filter configuration is still supported but deprecated. Pinning the Collector image tag instead of using `latest` would make CI results more reproducible in a production version of this guide.
