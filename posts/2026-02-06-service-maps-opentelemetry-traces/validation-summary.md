# Validation Summary: How to Build Service Maps from OpenTelemetry Trace Data

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry traces and resources
- OpenTelemetry JavaScript SDK for Node.js
- OpenTelemetry Collector connectors
- OpenTelemetry service graph connector
- OpenTelemetry semantic conventions
- Python span processing
- D3.js force-directed graph rendering

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector service graph connector README/API docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/servicegraphconnector
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry resource concepts documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/

## Issues Found
- The post incorrectly described the `spanmetrics` connector as the component that extracts service-to-service dependency edges. Replaced it with the current `service_graph` connector, which is the Collector connector designed to generate service graph metrics from paired spans.
- The Collector configuration used the deprecated `spanmetrics` component name and span metrics configuration fields. Updated the example to use `service_graph`, `latency_histogram_buckets`, string-based `dimensions`, and `store` settings.
- The metrics section listed span metrics names such as `traces_spanmetrics_latency` and `traces_spanmetrics_calls_total`. Updated it to the service graph metrics emitted by the service graph connector, including request count, failed request count, and client/server latency histograms.
- The Node.js example used `new Resource(...)`; current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`. Updated the import and resource initialization.
- The Node.js example and explanatory text used deprecated `deployment.environment`. Updated it to the stable `deployment.environment.name` semantic convention.
- The Collector dimensions used older HTTP semantic convention attributes `http.method` and `http.status_code`. Updated them to `http.request.method` and `http.response.status_code`.
- The raw-span Python example looked for `http.url`, which is no longer the preferred stable URL attribute. Updated it to use `url.full` and fall back to `server.address`.
- The D3 example referenced `width` and `height` without defining them. Added `container.clientWidth` and `container.clientHeight`.
- The instrumentation pitfalls implied `peer.service` is always required for downstream service identification. Reworded it to distinguish fully instrumented client/server span pairing from virtual nodes for uninstrumented downstream systems.

## Review Notes
The post is now aligned with the current OpenTelemetry Collector service graph connector and JavaScript resource documentation. The D3 renderer remains intentionally illustrative rather than a complete renderer because it does not create SVG elements or bind the helper functions to visual marks.
