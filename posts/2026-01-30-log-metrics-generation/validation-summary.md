# Validation Summary: How to Create Log Metrics Generation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Loki
- LogQL
- Loki recording rules and ruler
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector transform processor
- OpenTelemetry Collector count connector
- OTLP HTTP exporter
- Prometheus-compatible metrics and alerting rules
- Grafana Alloy / Fluent Bit

## Sources Consulted
- Grafana Loki metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki LogQL reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki recording rules documentation: https://grafana.com/docs/loki/latest/operations/recording-rules/
- Grafana Promtail EOL documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/promtail/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector count connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- Several LogQL metric queries parsed logs or unwrapped numeric fields without filtering pipeline errors. Loki documentation states metric queries cannot contain pipeline errors, and unwrap errors should be filtered after the unwrap stage. Added `| __error__=""` after parser stages and after `unwrap` in the recording rule and percentile examples.
- The post described response-time extraction as histogram generation, but the provided LogQL examples compute percentile series with `quantile_over_time`; they do not create histogram metrics. Renamed that section and adjusted related wording to "percentile metrics."
- The architecture diagram listed Promtail as a production collection option. Promtail is EOL as of March 2, 2026, according to Grafana documentation. Replaced it with Grafana Alloy while keeping Fluent Bit as the other option.
- The OpenTelemetry Collector exporter used the gRPC `otlp` exporter for OneUptime's HTTP OTLP endpoint and used legacy environment-variable expansion. Replaced it with `otlp_http/oneuptime`, added JSON encoding for OneUptime's endpoint, and changed the token interpolation to `${env:ONEUPTIME_TOKEN}`.

## Review Notes
The OpenTelemetry count connector is alpha, but the documented log-to-counter use case and configuration shape are consistent with current upstream documentation. The post now validates as a current technical guide, with the caveat that users still need to configure Loki ruler remote write and their destination backend separately for recording-rule output.
