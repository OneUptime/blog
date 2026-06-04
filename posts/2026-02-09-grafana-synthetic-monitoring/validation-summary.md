# Validation Summary: How to use Grafana Synthetic Monitoring for uptime checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Cloud Synthetic Monitoring
- Synthetic Monitoring Agent and private probes
- Grafana Synthetic Monitoring REST API
- k6 scripted checks
- Prometheus / PromQL
- Loki / LogQL
- HTTP, DNS, TCP/TLS, and ICMP ping checks

## Sources Consulted
- Grafana Cloud Synthetic Monitoring introduction: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/introduction/
- Grafana Cloud Synthetic Monitoring REST API: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/api-reference/
- Synthetic Monitoring OpenAPI specification: https://synthetic-monitoring-api.grafana.net/api/v1/openapi
- Set up Synthetic Monitoring in a local Grafana instance: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/set-up/grafana-oss-enterprise/
- Set up private probes: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/set-up/set-up-private-probes/
- HTTP/HTTPS check documentation: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/create-checks/checks/http/
- DNS check documentation: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/create-checks/checks/dns/
- TCP check documentation: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/create-checks/checks/tcp/
- Ping check documentation: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/create-checks/checks/ping/
- k6 scripted check documentation: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/get-started/create-a-k6-scripted-check/
- Check metrics documentation: https://grafana.com/docs/grafana-cloud/testing/synthetic-monitoring/analyze-results/check-metrics/
- Synthetic Monitoring Agent protobuf definitions: https://github.com/grafana/synthetic-monitoring-agent/blob/main/pkg/pb/synthetic_monitoring/checks.proto

## Issues Found
- The setup section described an unsupported local Prometheus/Loki YAML configuration for the Synthetic Monitoring Agent. Replaced it with the documented local Grafana plugin install and private probe Docker command using `--api-server-address` and `--api-token`.
- The REST API examples used plural `/api/v1/checks` and `/api/v1/probes` endpoints. Updated them to the documented singular `/api/v1/check` and `/api/v1/probe` endpoints.
- Several REST API snippets used string values for protobuf enum fields such as HTTP method, DNS record type, DNS protocol, and IP version. Updated those examples to the numeric enum values exposed by the current OpenAPI schema.
- The response validation example included an unsupported `validationRegex` field. Removed it and kept the supported body match validation fields.
- The multi-step check section called the k6 HTTP script "Playwright-based scripting." Updated it to describe the example as a k6 scripted check.
- The TCP/TLS section claimed the check validates that certificates are "not expiring soon." Updated the text to distinguish current certificate validation from expiry metrics that should be alerted on separately.
- The ping example omitted `packetCount`, which is part of the current ping settings schema. Added it.
- The alert and dashboard examples used nonexistent `probe_success_total` and `probe_all_total` metrics. Updated them to use `probe_success` with `avg_over_time`, matching the documented common metrics.
- The dependency section claimed checks only run when dependencies are available. Updated it to describe alert dependency logic instead.
- The API rate-limit section used unsupported `responseHeaders` configuration and a nonexistent `probe_http_header_value` metric. Replaced it with supported header regex validation and clarified that numeric quota alerting requires emitting a metric from the app or a k6 scripted check.

## Review Notes
The REST API examples use milliseconds for `frequency` and `timeout`, matching the current OpenAPI schema. The Grafana UI documentation presents these values in seconds, so future edits should keep the API/UI distinction explicit.
