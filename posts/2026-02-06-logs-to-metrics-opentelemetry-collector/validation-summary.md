# Validation Summary: How to Use Logs-to-Metrics Pipelines in the OpenTelemetry Collector to Generate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector count connector
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector filter processor
- Prometheus exporter and alert rules
- Grafana Loki OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- OpenTelemetry Collector Loki exporter deprecation issue: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/33916

## Issues Found
- The authentication failure count used two separate count connector conditions, but count connector conditions are ORed. Combined the severity and event-name checks into one OTTL expression so both must match.
- The example used the deprecated/removed Loki exporter endpoint. Replaced it with the current `otlphttp/loki` exporter pointing at Loki's OTLP endpoint.
- The metrics pipeline included a no-op resource processor action that copied `service.name` from itself. Removed it and kept Prometheus `resource_to_telemetry_conversion` for resource labels.
- The rate-limit alert filtered on `customer_tier`, but the generated metric did not include `customer.tier` as a count connector attribute. Added that attribute to the `ratelimit.hits` metric configuration.
- The rate-limit alert annotation referenced `http_route`, but the query aggregated without preserving that label. Added `by (http_route)` to the expression.
- The transform section implied the count connector could extract arbitrary numeric metric values from logs. Reworded it to describe normalization and bucket-label creation before counting, and updated the example accordingly.
- The filter processor example used the deprecated legacy `logs.include.match_type: expr` form. Updated it to the current `log_conditions` format.
- The cardinality note said the filter processor could strip attributes. Clarified that filtering drops logs, while transform or attributes processors delete attributes.

## Review Notes
Validated the main Collector configuration with `otel/opentelemetry-collector-contrib:latest validate`, validated the transform/filter snippet by wrapping it in a minimal logs pipeline, and checked the Prometheus alert rules with `promtool check rules`.
