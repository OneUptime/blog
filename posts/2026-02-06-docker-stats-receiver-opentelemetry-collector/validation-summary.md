# Validation Summary: How to Configure the Docker Stats Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Docker Stats receiver
- Docker Engine API and Docker socket access
- OpenTelemetry Collector processors and exporters
- Prometheus alerting rules
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib Docker Stats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/README.md
- OpenTelemetry Collector Contrib Docker Stats receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/documentation.md
- OpenTelemetry Collector Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Resource Detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Metrics Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- Replaced the removed `logging` exporter example with the current `debug` exporter and `verbosity` option.
- Clarified that some Docker Stats receiver metrics are optional and must be enabled through `metrics`.
- Corrected CPU metric names and descriptions: system mode metrics are `container.cpu.usage.kernelmode` / `container.cpu.usage.usermode`, and throttling metrics use the `container.cpu.throttling_data.*` prefix.
- Corrected `excluded_images` examples to use Docker Stats receiver regex syntax with leading and trailing `/`.
- Replaced deprecated Collector component type aliases: `resourcedetection` to `resource_detection`, and `metricstransform` to `metrics_transform`.
- Updated filter processor examples from deprecated legacy include/exclude syntax to current OTTL `metric_conditions` syntax.
- Quoted `api_version` because the Docker Stats receiver expects Docker API versions as strings, not floats.
- Updated Collector internal telemetry configuration from ignored `service.telemetry.metrics.address` to the current `readers` Prometheus pull configuration.
- Corrected the CPU throttling Prometheus alert to use `container.cpu.throttling_data.*` metric names.
- Updated the OneUptime export example to use the documented `otlp_http` exporter, `https://oneuptime.com/otlp`, JSON encoding, and the `x-oneuptime-token` header.
- Reworded the OneUptime dashboard sentence to avoid claiming automatic dashboard and alert creation without documentation support.

## Review Notes
The Docker Stats receiver is still marked alpha/development for its metrics in upstream documentation, and several metrics are optional or platform/cgroup-specific. Future edits should avoid presenting the full metric list as always emitted by default.
