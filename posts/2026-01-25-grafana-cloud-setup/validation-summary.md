# Validation Summary: How to Use Grafana Cloud

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana Cloud
- Grafana, Mimir, Loki, Tempo, and Grafana Alerting
- Prometheus remote_write and PromQL
- Grafana Agent
- Grafana Alloy and River configuration
- Promtail
- OpenTelemetry Collector and OpenTelemetry Python SDK
- Loki HTTP push API
- Grafana HTTP API
- Cloud Access Policies and service account tokens

## Sources Consulted
- Grafana Cloud free tier and pricing: https://grafana.com/pricing/
- Grafana Cloud Prometheus remote_write documentation: https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/
- Grafana Agent EOL notice: https://grafana.com/docs/agent/latest/
- Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy introduction: https://grafana.com/docs/grafana-cloud/send-data/alloy/introduction/
- Grafana Alloy `sys.env` reference: https://grafana.com/docs/grafana-cloud/send-data/alloy/reference/stdlib/sys/
- Grafana Cloud logs with Alloy documentation: https://grafana.com/docs/grafana-cloud/send-data/logs/collect-logs-with-alloy/
- Grafana Cloud OTLP endpoint documentation: https://grafana.com/docs/grafana-cloud/send-data/otlp/send-data-otlp/
- Grafana Cloud traces with Alloy documentation: https://grafana.com/docs/grafana-cloud/send-data/traces/set-up/traces-with-alloy/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana API key migration documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/migrate-api-keys/
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana Cloud metrics usage documentation: https://grafana.com/docs/grafana-cloud/cost-management-and-billing/understand-usage-cost/metrics/

## Issues Found
- The post described Grafana Agent as a current lightweight alternative to Prometheus. Grafana Agent reached EOL on November 1, 2025, so the wording now marks it as legacy and recommends Alloy for new installations.
- The post described Promtail as the standard log shipper for Loki. Promtail reached EOL on March 2, 2026, so the wording now marks it as legacy and recommends Alloy for new installations.
- The Alloy examples used `env("GRAFANA_CLOUD_API_KEY")`, which is not the documented River standard-library function. Updated both examples to use `sys.env("GRAFANA_CLOUD_API_KEY")`.
- The OpenTelemetry Collector example sent traces directly to a Tempo gRPC endpoint. Grafana Cloud now recommends the Grafana Cloud OTLP endpoint for OpenTelemetry data, so the collector example now uses the OTLP HTTP exporter and the OTLP gateway endpoint pattern.
- The OpenTelemetry Collector example used the deprecated `otlphttp` exporter component name. Updated it to the current `otlp_http` name.
- The Python OpenTelemetry example used the gRPC trace exporter with a direct Tempo endpoint. Updated it to the OTLP HTTP trace exporter and a Grafana Cloud OTLP `/v1/traces` endpoint pattern.
- The stack description referenced API keys as a normal stack credential. Grafana service accounts replace API keys for Grafana HTTP API access, and Cloud Access Policies are used for telemetry ingestion, so the wording now mentions service accounts and access policies.
- The dashboard export/import example posted the raw `GET /api/dashboards/uid/:uid` response back to `POST /api/dashboards/db`, which is not the payload shape that endpoint expects. Updated the example to use `jq` to wrap the dashboard JSON and clear the source dashboard ID before import.
- The retention planning bullets omitted trace retention. Updated the free and Pro tier bullets to include traces alongside metrics and logs.
- The notification configuration heading used the older "notification channels" terminology. Updated it to "contact points" to match Grafana Alerting terminology used in the steps.

## Review Notes
The endpoint hostnames in examples remain illustrative. Users must copy the exact region-specific metrics, logs, and OTLP endpoints and credentials from their own Grafana Cloud stack.
