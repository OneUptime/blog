# Validation Summary: How to Troubleshoot Data Mismatch Between Tempo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector span metrics connector
- OpenTelemetry Collector filter, batch, tail sampling, and debug components
- Grafana Tempo and TraceQL
- Prometheus Remote Write
- PromQL

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector architecture documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector spanmetrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Grafana Tempo TraceQL metrics functions documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-queries/functions/
- Grafana Cloud trace-based alerting span metrics reference: https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/examples/trace-based-alerts/

## Issues Found
- The filter processor example used `status.code == STATUS_CODE_ERROR`, which would drop error spans instead of keeping only error spans. Changed it to the current OTTL path `span.status.code != STATUS_CODE_ERROR` so non-error spans are dropped.
- The filter processor configuration used older `traces.span` style syntax. Updated the examples to current `trace_conditions` syntax and added `error_mode: ignore`, matching current filter processor documentation.
- The Collector examples used deprecated component IDs `spanmetrics` and `prometheusremotewrite`. Updated them to `span_metrics` and `prometheus_remote_write`.
- The PromQL example used the older Tempo metrics-generator style metric name `traces_spanmetrics_calls_total`. Updated it to `traces_span_metrics_calls_total`, the Prometheus metric name used for the OpenTelemetry span metrics connector.
- The Tempo verification query used `{resource.service.name = "my-service"} | count()`, which is a TraceQL aggregation/filter pattern rather than the appropriate TraceQL metrics count-over-time query. Updated it to `{ resource.service.name = "my-service" } | count_over_time()`.
- The post described span metrics as trace counts in several places. Updated those references to span counts, since the span metrics connector computes request counts from spans.
- The batch processor example referenced `batch/fast` and `batch/slow` only in comments. Added the corresponding processor definitions with `timeout` values so the snippet is syntactically meaningful.

## Review Notes
The guide is technically valid after correction. One caveat remains: if Tempo intentionally receives only filtered or sampled spans while Prometheus receives all span metrics, the two systems should not be expected to have equal counts. The post now reflects that the equality check applies only when the compared data sets are not filtered or sampled differently.
