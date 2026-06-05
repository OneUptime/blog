# Validation Summary: How to Compare OpenTelemetry vs Datadog for Observability

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python API
- OpenTelemetry Flask instrumentation
- OpenTelemetry Collector
- OpenTelemetry Collector OTLP receiver
- OpenTelemetry Collector batch processor
- OpenTelemetry Collector resource processor
- OpenTelemetry Collector OTLP HTTP exporter
- OpenTelemetry Collector Datadog exporter
- Datadog Agent
- Datadog Python tracing library (`ddtrace`)
- Datadog APM, logs, infrastructure monitoring, and custom metrics pricing
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- Datadog Python `ddtrace` API documentation: https://ddtrace.readthedocs.io/en/stable/api.html
- Datadog OpenTelemetry integration documentation: https://docs.datadoghq.com/integrations/otel/
- Datadog OpenTelemetry Collector setup documentation: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- Datadog pricing list: https://www.datadoghq.com/pricing/list/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The OneUptime OTLP HTTP exporter examples omitted the ingestion token header and JSON encoding required by OneUptime's documented Collector configuration. I added `encoding: json` and the `x-oneuptime-token` header placeholder to both OneUptime exporter snippets.
- The Datadog custom metrics pricing claim said `$5 per metric per month`, but Datadog's published pricing is `$5 per 100 custom metrics per month`. I corrected the prose and cost table.
- The estimated Datadog monthly total was presented as a fixed `$15,000 - $30,000` range for moderate usage. Because Datadog bills multiple dimensions including logs, indexed spans, and custom metric cardinality, I changed the row to state that the total depends heavily on those usage factors.
- The data portability section implied historical telemetry could be migrated between backends without losing fidelity. OTLP standardizes telemetry exchange, but backend historical storage and export are backend-specific, so I narrowed the claim to future telemetry routing and portable instrumentation/protocol.
- The Datadog exporter example used `${DD_API_KEY}` environment substitution. Current Collector documentation uses the `${env:DD_API_KEY}` syntax, so I updated the snippet.

## Review Notes
The Python tracing examples use current OpenTelemetry and Datadog APIs for manual spans and attributes/tags. They are illustrative snippets rather than complete runnable services because helper functions such as `validate_items`, `calculate_total`, `charge_card`, and `generate_id` are intentionally omitted.
