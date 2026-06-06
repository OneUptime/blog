# Validation Summary: How to Create a Cost Monitoring Dashboard That Tracks Telemetry Volume per

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Count Connector
- OpenTelemetry Collector Transform Processor
- OpenTelemetry Collector Tail Sampling Processor
- Prometheus Remote Write Exporter
- Prometheus Remote Write Receiver
- PromQL
- Grafana dashboards

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connector registry: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector Contrib Count Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/countconnector
- OpenTelemetry Collector Contrib Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector Contrib Prometheus Remote Write Exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- OpenTelemetry Collector Contrib Tail Sampling Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- Prometheus HTTP API Remote Write Receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The count connector example used `traces:` for a custom span count. The Count Connector documents custom span metrics under `spans:`, so I changed `traces:` to `spans:`.
- The count connector example used `metrics:` for a custom data-point count. The Count Connector counts metric data points under `datapoints:`, so I changed the section name to `datapoints:`.
- The span counter had a `status.code != STATUS_CODE_UNSET` condition, which would exclude normal unset-status spans while the text described counting span volume. I removed the filter so the metric counts all spans.
- The Prometheus Remote Write exporter used `prometheusremotewrite`, which the current exporter documentation marks as a deprecated alias. I changed it to the current `prometheus_remote_write` component name and updated the pipeline reference.
- The example wrote to Prometheus at `/api/v1/write` without noting that Prometheus must enable its remote write receiver. I added a short configuration comment referencing `--web.enable-remote-write-receiver`.
- The metrics pipeline did not export application metrics to the count connector, so the data-point count metric would not be generated from incoming metrics. I added `count` to the metrics pipeline exporters.
- The span operation drill-down query grouped by `span_name`, but the original count metric only added `service.name`. I added a transform processor that copies `span.name` into a span attribute and included that attribute in the span count metric.
- The "Top 5" PromQL query added three vectors together, which can drop services that are missing one of the three signal metrics due to PromQL vector matching. I changed it to sum `increase()` over the three metric names with a `__name__` regex.
- The prose referenced the deprecated `routing` processor. I changed it to the current `routing` connector.

## Review Notes
The Count Connector is currently alpha for traces, metrics, and logs in OpenTelemetry Collector Contrib. Adding `span.name` as a count attribute enables the operation drill-down query but can increase metric cardinality; production dashboards should choose low-cardinality operation names where possible.
