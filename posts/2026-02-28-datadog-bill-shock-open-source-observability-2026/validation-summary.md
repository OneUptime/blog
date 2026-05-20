# Validation Summary: Datadog Bill Shock Is Real: What Open Source Observability Looks Like in 2026

## Status
validated

## Post Type
Opinionated technical guide

## Technologies Covered
- Datadog
- OpenTelemetry Collector
- OTLP
- OneUptime
- Prometheus
- Grafana
- Loki
- Tempo
- Alertmanager
- Grafana Cloud
- SigNoz
- HyperDX
- Docker
- Kubernetes

## Sources Consulted
- Datadog official pricing list: https://www.datadoghq.com/pricing/list/
- Datadog billing and pricing documentation: https://docs.datadoghq.com/account_management/billing/pricing/
- Datadog OpenTelemetry Collector exporter setup: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector registry: https://opentelemetry.io/ecosystem/registry/?language=collector
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- Grafana Cloud documentation: https://grafana.com/docs/grafana-cloud/introduction/gs-metrics/
- Grafana Loki label documentation: https://grafana.com/docs/loki/latest/get-started/labels/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/

## Issues Found
- Datadog APM billing was described as purely per-span. Updated it to reflect current public units: APM host billing plus APM ingestion and indexed-span usage.
- The pricing table used service count and 100k RUM sessions with costs that did not match Datadog's current public list-price units. Updated the APM, synthetics, RUM, total, and annualized wording to align with published billing units.
- The post said costs scale linearly with infrastructure across the board. Updated this to distinguish host-based costs from usage-based logs, indexed spans, synthetics, and RUM sessions.
- The Datadog free-tier guidance said fewer than 10 hosts. Updated it to five or fewer infrastructure hosts to match the current free-tier limit.
- The OpenTelemetry Collector snippet omitted receivers and processors in the pipelines, used older environment-variable syntax, and used a OneUptime OTLP/gRPC-style endpoint rather than the documented OneUptime OTLP/HTTP exporter example. Replaced it with a complete Collector configuration using `receivers`, `processors`, `connectors`, `exporters`, and `service.pipelines`.

## Review Notes
The pricing examples are still illustrative because Datadog invoices depend on plan, retention, indexed event volume, usage, and negotiated discounts. The updated numbers now map to public list-price units rather than implying that services or raw session counts are the billing units for every product.
