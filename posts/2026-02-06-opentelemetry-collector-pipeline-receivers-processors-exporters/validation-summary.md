# Validation Summary: How to Understand the OpenTelemetry Collector Pipeline Model

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporter
- Prometheus receiver and Prometheus remote write exporter
- Filelog receiver
- Kafka receiver
- Batch, resource, attributes, filter, tail sampling, and transform processors
- Debug, file, and load balancing exporters
- OpenTelemetry Transformation Language (OTTL)

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processor component registry: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector contrib OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector contrib Prometheus remote write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector contrib file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- OpenTelemetry Collector contrib load balancing exporter README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter

## Issues Found
- The filelog receiver example used separate `time_parser` and `severity_parser` operators after `json_parser`. Updated the example to use the documented embedded `timestamp` and `severity` blocks inside the JSON parser.
- The load balancing exporter example used `loadbalancing`, which is now a deprecated alias. Updated it to the current `load_balancing` component type.
- The debugging example used the deprecated/removed `logging` exporter. Updated it to the current `debug` exporter and adjusted the surrounding text.
- The Collector internal metrics example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to the current `service.telemetry.metrics.readers` Prometheus pull exporter syntax.

## Review Notes
The Collector binary was not installed in the local environment, so `otelcol validate` could not be run. The review was completed against current official OpenTelemetry documentation and component READMEs.
