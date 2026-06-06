# Validation Summary: How to Choose Between Core and Contrib OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Core distribution
- OpenTelemetry Collector Contrib distribution
- OpenTelemetry Collector Builder (OCB)
- Collector YAML configuration
- Collector receivers, processors, exporters, extensions, and connectors

## Sources Consulted
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector Core distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Contrib distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector component stability definitions: https://github.com/open-telemetry/opentelemetry-collector/blob/main/docs/component-stability.md
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector custom Collector / OCB documentation: https://opentelemetry.io/docs/collector/custom-collector/
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib Loki exporter deprecation/removal issue: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/33916

## Issues Found
- The post said OpenTelemetry maintains two official Collector distributions. The official docs now list multiple pre-built distributions, including Core, Contrib, Kubernetes, OTLP, and eBPF profiling. Updated the framing to focus on Core and Contrib as the main general-purpose choice.
- The Core distribution inventory was outdated. It omitted current Core components such as hostmetrics, Prometheus, Kafka, Jaeger, Zipkin, file, Prometheus remote write, health_check, pprof, attributes, resource, filter, span, and probabilistic_sampler, and it listed the removed/deprecated ballast extension. Updated the Core component list.
- The post described Core as directly maintained fundamental components with strict stability guarantees. Current Core includes some contrib repository components, and component stability varies by component. Updated the wording and comparison table.
- The post implied Core is effectively OTLP-only and that Prometheus/Kafka ingestion requires Contrib. Current Core includes Prometheus and Kafka components. Updated the usage guidance and migration examples.
- The Contrib examples listed the Loki exporter. The Loki exporter was deprecated and removed upstream in favor of native OTLP ingestion by Loki. Replaced it with the Splunk HEC exporter in the examples.
- The filter processor configuration used the deprecated `traces.span` shape. Updated it to the current `trace_conditions` OTTL format with `span.attributes[...]`.
- The side-by-side comparison used precise binary and idle-memory numbers without version/platform context. Replaced those with relative guidance because current sizes vary by release and platform.
- The migration section said configuration files always stay the same when switching distributions. Updated it to clarify that the target binary must include every configured component.
- The stability level descriptions were slightly over-specific to Contrib. Updated the wording to apply to Collector components generally and softened the Development definition to match the official stability guidance.

## Review Notes
The configuration snippets are illustrative and still depend on environment-specific details such as backend DNS, Kubernetes RBAC/service discovery permissions, log timestamp format, and whether the backend accepts OTLP gRPC with the configured TLS settings.
