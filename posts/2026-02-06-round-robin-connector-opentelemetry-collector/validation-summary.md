# Validation Summary: How to Configure the Round Robin Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- Round-Robin Connector
- OTLP receiver and exporter
- Prometheus receiver and remote write exporter
- Batch and memory limiter processors
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Round-Robin Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/roundrobinconnector/README.md
- OpenTelemetry Collector Round-Robin Connector metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/roundrobinconnector/metadata.yaml
- OpenTelemetry Collector Round-Robin Connector implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/roundrobinconnector/connector.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used the deprecated `roundrobin` component type. Updated all examples to use the current `round_robin` component type.
- The post described and configured a `table` setting for the Round-Robin Connector. The official connector config has no settings, so all `table` examples were removed and replaced with the supported pattern: upstream pipelines export to `round_robin`, and downstream pipelines receive from `round_robin`.
- The post claimed weighted distribution could be created by repeating pipelines in the `table`. Weighted distribution is not supported by the Round-Robin Connector, so the section was corrected to describe even distribution and to point readers toward routing-capable components for weighted or condition-based routing.
- The metrics example used filter processors to route metric types after a round-robin split, which could drop data and did not match how the connector routes. Reworked it into two parallel metric pipelines that evenly split metric batches.
- The traces examples referenced the `batch` processor without defining it. Added `processors: batch:` to the relevant examples.
- The monitoring example used the deprecated/ignored `service.telemetry.metrics.address` setting and mixed pipeline exporters with internal telemetry configuration. Updated it to the current `service.telemetry.metrics.readers.pull.exporter.prometheus` configuration and set `without_type_suffix` and `without_units` so the listed metric names match the exported names.
- Troubleshooting guidance referenced invalid `table` configuration. Updated it to focus on downstream pipelines receiving from the connector and the current `round_robin` type.

## Review Notes
The Round-Robin Connector is currently listed as beta for traces-to-traces, metrics-to-metrics, and logs-to-logs in the contrib and Kubernetes Collector distributions. The old `roundrobin` type still works as a deprecated alias at the time of review but should not be used in new examples.
