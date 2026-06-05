# Validation Summary: How to Configure the Routing Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib routing connector
- OpenTelemetry Collector pipelines, receivers, processors, exporters, and connectors
- OpenTelemetry Transformation Language (OTTL)
- Resource processor
- Transform processor
- Probabilistic sampler processor
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Routing connector README in opentelemetry-collector-contrib: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/README.md
- Routing connector config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/routingconnector/config.go
- Resource processor README in opentelemetry-collector-contrib: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- Transform processor README in opentelemetry-collector-contrib: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Probabilistic sampler processor README in opentelemetry-collector-contrib: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/probabilisticsamplerprocessor/README.md

## Issues Found
- The routing connector examples used deprecated/incorrect processor-style fields such as `from_attribute`, `default_exporters`, table `value`, and table `exporters`. Updated the examples to the current routing connector schema using OTTL `condition`, `pipelines`, and `default_pipelines`.
- Several examples routed directly to exporter component IDs. The current connector routes to downstream pipelines, with the connector acting as an exporter in one pipeline and a receiver in another. Added downstream pipelines for each route.
- Multi-signal examples reused one generic route table for traces, metrics, and logs. Updated them to use signal-specific routing connectors and signal-specific target pipelines.
- The cost-optimized example set `telemetry.tier` on span attributes but routed with the default resource context. Added `context: span` to those route entries.
- The sampling example routed staging and development data directly to exporters, bypassing the sampling pipelines. Updated the routing table to target downstream sampled pipelines.
- The multiple routing stages example attempted to route directly from one connector to another connector ID. Added intermediate pipelines so cascading connectors are wired through valid Collector pipelines.
- The production example claimed failover but did not configure a failover connector. Narrowed the description to routing and monitoring.
- The production example only ensured `tenant.id` for traces. Moved the default `tenant.id` insertion into the resource processor used by all three signal pipelines.
- Environment variable examples used older unqualified syntax in several places. Updated them to `${env:...}` form where edited.
- Internal telemetry examples used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Updated them to the documented `readers` / Prometheus pull exporter configuration.
- The monitoring section listed `otelcol_connector_accepted_spans` and `otelcol_connector_refused_spans`, which are not listed in the current official internal telemetry metrics. Replaced them with receiver and exporter metrics documented by OpenTelemetry.
- Updated the best-practice wording from "default exporters" to "default pipelines" to match current routing connector terminology.

## Review Notes
All YAML snippets parse successfully as YAML. A local `otelcol` or `otelcol-contrib` binary was not available in the workspace, so full Collector runtime schema validation was not run.
