# Validation Summary: Use the OpenTelemetry Filter Processor to Drop Low-Value Health Check Telemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector filter processor
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry HTTP semantic conventions
- Kubernetes health probes
- Collector internal telemetry metrics

## Sources Consulted
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector filter processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/metadata.yaml
- OpenTelemetry Collector filter processor generated telemetry code: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/internal/metadata/generated_telemetry.go
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry semantic conventions for HTTP spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry semantic conventions for HTTP metrics: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Validation command: `otelcol-contrib version 0.153.0 validate --config=file:/config.yaml`

## Issues Found
- Fixed incorrect health-check volume arithmetic. The post said 100 pods checked every 10 seconds produce 864,000 spans per day per pod; the correct figure is 864,000 spans per day across the 100-pod cluster, or 8,640 per pod.
- Updated filter processor examples from deprecated `traces.span`, `metrics.datapoint`, and `logs.log_record` configuration to the current `trace_conditions`, `metric_conditions`, and `log_conditions` format documented for Collector 0.146.0 and later.
- Updated OTTL paths in current-format examples to use explicit context prefixes such as `span.attributes`, `datapoint.attributes`, `log.attributes`, and `log.body`.
- Updated URL matching to prefer the current `url.full` HTTP semantic convention while keeping `http.url` as a compatibility fallback for older instrumentation.
- Clarified `error_mode: ignore` behavior to match the filter processor documentation: evaluation errors are ignored, processing continues, and data is preserved unless another condition matches.
- Updated filter processor internal metric names from the older underscore suffix form to the current `.filtered` metric names, with a note about older Prometheus compatibility rendering.

## Review Notes
The complete Collector configuration from the post was validated successfully with the official `otel/opentelemetry-collector-contrib:latest` Docker image, which reported `otelcol-contrib version 0.153.0`. The filter processor remains alpha for traces, metrics, and logs, and its README notes that the legacy configuration style is still supported but deprecated.
