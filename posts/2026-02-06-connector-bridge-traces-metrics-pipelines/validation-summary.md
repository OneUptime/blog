# Validation Summary: How to Use the Connector to Bridge Traces and Metrics Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- Span Metrics connector
- Count connector
- Routing connector
- OpenTelemetry Transformation Language (OTTL)
- Collector internal telemetry
- Collector processors

## Sources Consulted
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/extend/custom-component/connector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib Span Metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Count connector README and config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/countconnector
- OpenTelemetry Collector Contrib Routing connector README and config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector

## Issues Found
- The post used the deprecated `spanmetrics` connector type. Updated examples and explanatory text to use the current `span_metrics` connector type while preserving the post's meaning.
- The dimensions example used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`, which is the current span metrics connector setting for limiting aggregation cardinality.
- A comment claimed the span metrics connector example mapped a span attribute to a different metric dimension name, but the shown configuration only set a dimension by `name` and `default`. Updated the comment to describe the actual high-cardinality user dimension example.
- The count connector example incorrectly nested `spans` and `spanevents` under `traces`. Moved them directly under `connectors.count`, matching the connector's documented configuration schema.
- The count connector span event condition used an unqualified event name path. Updated it to `spanevent.name == "exception"`, matching documented path-context examples.
- The routing connector example used older `statement: 'route() ...'` style and an unconditional route entry. Updated it to the current documented `context` plus `condition` form and used `default_pipelines` for the fallback pipeline.
- The internal telemetry snippet used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `readers.pull.exporter.prometheus.host` and `port` configuration.

## Review Notes
- The span metrics connector is currently documented as alpha and has a pending default duration unit change from milliseconds to seconds behind a feature gate. The post's explicit bucket units remain valid.
- YAML syntax was checked for all seven YAML snippets in the post. A native `otelcol`/`otelcol-contrib` binary was not available on PATH, so full Collector config validation was not run.
