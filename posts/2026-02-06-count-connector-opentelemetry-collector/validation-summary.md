# Validation Summary: How to Configure the Count Connector in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector Count Connector
- OpenTelemetry Collector pipelines and connectors
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry semantic conventions
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Contrib Count Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector Contrib Count Connector configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/config.go
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions reference: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- Count connector conditions are ORed, but one example intended both the span kind and HTTP method checks to match. I combined those checks into one OTTL expression with `and`.
- The examples used `attributes["span.kind"] == "server"` as if span kind were a span attribute. I changed those checks to the OTTL span field comparison `kind == SPAN_KIND_SERVER` and removed `span.kind` from count attributes, since count connector attributes are telemetry, scope, or resource attributes.
- Several HTTP and database examples used older semantic convention attribute names. I updated them to current names such as `http.request.method`, `http.response.status_code`, `db.system.name`, and `db.operation.name`.
- The log severity examples attempted to use top-level `severity_text` directly as a count connector attribute. I added a transform processor that copies `severity_text` into `log.severity_text` before the logs reach the count connector.
- The status class transform used an invalid `Concat` call and did not convert the status code to a string before `Substring`. I corrected it to use `Concat([...], "")` and `String(...)`.
- The internal telemetry example used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. I replaced it with the current `service.telemetry.metrics.readers` Prometheus pull exporter configuration.
- The listed `otelcol_connector_*` internal metrics are not documented current Collector internal metrics. I replaced them with documented receiver and exporter data-flow metrics.

## Review Notes
The YAML snippets parse successfully. Standalone examples and temporary full configs for the partial snippets were validated with the official `otel/opentelemetry-collector-contrib:latest` image using `validate --config`.
