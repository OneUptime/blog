# Validation Summary: How to Fix the spanmetrics Processor Producing Inaccurate Timestamps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector spanmetrics processor
- OpenTelemetry Collector span metrics connector
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector Prometheus Remote Write exporter
- Kubernetes kubectl logs
- PromQL

## Sources Consulted
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry metrics data model: https://opentelemetry.io/docs/reference/specification/metrics/data-model/
- Prometheus Remote Write 1.0 specification: https://prometheus.io/docs/specs/prw/remote_write_spec/

## Issues Found
- The connector examples used the deprecated `spanmetrics` component ID. Updated current connector examples to `span_metrics`, while leaving the older processor example as `spanmetrics`.
- The post stated or implied that the span metrics connector default `metrics_flush_interval` is `15s`. Official documentation lists the default as `60s`; updated the comments accordingly.
- The delta temporality guidance did not mention that the Prometheus Remote Write exporter drops non-cumulative monotonic, histogram, and summary OTLP metrics. Added the Prometheus Remote Write caveat and kept delta temporality scoped to exporter/backend paths that support it.
- The Prometheus Remote Write exporter example used the deprecated `prometheusremotewrite` component ID. Updated it to `prometheus_remote_write`.
- The batch processor section claimed interval alignment with span metrics was the key fix. Adjusted it to state the more precise issue: excessive trace batching delays spans before aggregation.
- The exponential histogram section claimed exponential histograms produce fewer timestamp-related issues. Corrected it to say they can improve histogram efficiency but do not change flush timing.

## Review Notes
The post is technically relevant and contains actionable Collector configuration. The span metrics connector is still alpha, and the old `spanmetrics` connector component name currently works as a deprecated alias, so future Collector releases may require additional updates.
