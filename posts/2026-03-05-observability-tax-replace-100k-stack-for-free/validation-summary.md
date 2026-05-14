# Validation Summary: The Observability Tax: Replace Your $100K Monitoring Stack for $0

## Status
validated

## Post Type
Opinionated migration guide

## Technologies Covered
- OpenTelemetry Collector
- OneUptime
- Datadog
- Prometheus
- Grafana
- Jaeger
- Grafana Tempo
- OpenSearch
- Grafana Loki
- PagerDuty
- Atlassian Statuspage
- Sentry
- Pingdom
- Better Stack
- Incident.io
- Rootly
- Docker Compose
- Helm
- Kubernetes

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OneUptime OpenTelemetry telemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- Datadog OpenTelemetry Collector exporter setup: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- OneUptime Docker Compose installation documentation: https://oneuptime.com/docs/installation/docker-compose
- OneUptime monitoring product documentation: https://oneuptime.com/product/monitoring
- OneUptime on-call product documentation: https://oneuptime.com/on-call
- OneUptime exception tracking product documentation: https://oneuptime.com/product/exceptions
- OneUptime GitHub repository: https://github.com/OneUptime/oneuptime

## Issues Found
- The OpenTelemetry Collector example used `otlp/oneuptime` with `your-oneuptime-instance:4317`, but OneUptime's current documentation shows OTLP/HTTP ingestion at `https://oneuptime.com/otlp` or `http(s)://YOUR-ONEUPTIME-HOST/otlp`, with `encoding: json` and the `x-oneuptime-token` header. Updated the exporter to `otlphttp/oneuptime` with the documented endpoint shape and required headers.
- The Collector pipelines listed only exporters. OpenTelemetry Collector pipelines must include receivers, and referenced components must be defined in the corresponding sections. Added an `otlp` receiver definition and referenced it from the traces, metrics, and logs pipelines.
- The Datadog exporter example used `${DD_API_KEY}`. Datadog's current OpenTelemetry Collector documentation uses Collector environment expansion syntax `${env:DD_API_KEY}`. Updated the snippet accordingly.
- The migration section discusses logs, but the Collector snippet only covered traces and metrics. Added a logs pipeline using the same OTLP receiver and OneUptime/Datadog exporters so the example matches the described migration path.

## Review Notes
- The pricing and savings figures are business estimates based on the author's stated conversations, not values that can be fully validated from technical documentation.
- Datadog's current Collector setup recommends the batch processor and Datadog connector for production use and trace metrics. The post's snippet remains a minimal parallel-export example rather than a full production Collector configuration.
