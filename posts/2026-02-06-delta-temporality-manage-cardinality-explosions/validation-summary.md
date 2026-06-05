# Validation Summary: How to Use Delta Temporality in OpenTelemetry to Manage Cardinality Explosions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry metrics temporality
- OpenTelemetry Python SDK and OTLP metrics exporter
- OpenTelemetry Go SDK and OTLP metrics exporter
- OpenTelemetry Java SDK and OTLP metrics exporter
- OpenTelemetry Collector processors
- Kubernetes environment variable configuration
- Prometheus remote write compatibility

## Sources Consulted
- OpenTelemetry OTLP Metrics Exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Python SDK metrics export documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/metrics.export.html
- OpenTelemetry Go OTLP metric gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry Java SDK exporter documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector cumulative-to-delta processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/cumulativetodeltaprocessor
- OpenTelemetry Collector delta-to-cumulative processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/deltatocumulativeprocessor
- OpenTelemetry Collector groupbyattrs processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/

## Issues Found
- Corrected overbroad claims that delta temporality directly reduces cardinality or makes cumulative series persist indefinitely. Delta temporality can reduce active aggregation/conversion state and lets inactive series age out according to backend staleness and retention behavior.
- Fixed the Python `preferred_temporality` example to use instrument classes such as `Counter` and `Histogram` instead of string keys, matching the Python SDK API.
- Removed an unused Go import that would prevent the Go example from compiling.
- Corrected Collector `cumulativetodelta` configuration from invalid top-level `metrics` and `max_stale` fields to the current `include.metrics`, `match_type`, and `max_staleness` fields.
- Corrected Collector `deltatocumulative` configuration. The processor converts all delta samples it receives and supports `max_stale` and `max_streams`, not a metrics include list or `max_staleness`.
- Reworded the Collector conversion section to refer to temporality conversion processors instead of the metrics transform processor.
- Replaced unsupported exact cumulativetodelta self-metric names with a general instruction to monitor Collector self-telemetry for processor state and memory usage.
- Corrected the `groupbyattrs` example and wording. The processor re-associates datapoints under resources and can compact payloads; it does not aggregate metric values across container restarts.
- Replaced vendor-specific placeholder OTLP endpoints with a generic delta-native OTLP backend example to avoid implying incorrect Datadog or CloudWatch endpoint configuration.
- Adjusted the transform processor troubleshooting example to set the marker at `datapoint` context, where metric point attributes are available.

## Review Notes
The `deltatocumulative` processor is currently listed as alpha in the official Collector processor list, while `cumulativetodelta` is beta. The post still presents an illustrative cost/cardinality scenario; exact savings depend on backend retention, attribute choices, aggregation, and filtering.
