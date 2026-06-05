# Validation Summary: Route OpenTelemetry Alerts to OpsGenie with Severity-Based Escalation Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry metrics
- Prometheus alerting rules and PromQL
- Prometheus Alertmanager routing, inhibition, and OpsGenie receiver configuration
- Opsgenie alert priorities, responders, and escalation policies
- curl-based API requests

## Sources Consulted
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager overview: https://prometheus.io/docs/alerting/latest/alertmanager/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus client compatibility notes: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Opsgenie Escalation API documentation: https://docs.opsgenie.com/docs/escalation-api
- Atlassian Opsgenie escalation policy documentation: https://support.atlassian.com/opsgenie/docs/how-do-escalations-work-in-opsgenie/

## Issues Found
- The pipeline diagram said P2 alerts page after 5 minutes and P3 alerts create Slack tickets, but the Alertmanager/Opsgenie examples did not configure those behaviors. Updated the diagram to describe the actual Opsgenie alerting flow shown in the configuration.
- The PromQL examples used `http_server_errors_total`, `http_server_request_duration_count`, and `http_server_request_duration_bucket`, which do not match the current Prometheus names produced from the stable OpenTelemetry `http.server.request.duration` histogram with unit suffixes. Updated the examples to use `http_server_request_duration_seconds_count` and `http_server_request_duration_seconds_bucket`, with 5xx filtering via the normalized `http_response_status_code` label.
- The Alertmanager examples used deprecated `source_match`, `target_match_re`, and route `match` fields. Updated them to the current `source_matchers`, `target_matchers`, and route `matchers` syntax.
- The post created a named Opsgenie escalation policy but routed P1 alerts to a team responder, so that custom escalation policy was not explicitly selected. Updated the P1 Opsgenie receiver examples to use an `escalation` responder named `Critical Incident Escalation`.

## Review Notes
`amtool` was not available in the workspace, so native Alertmanager config validation could not be run locally. The corrected Alertmanager fields and Opsgenie escalation payload were checked against official documentation. Real deployments still need valid Opsgenie API keys, schedule/team IDs, and service labels emitted by the chosen OpenTelemetry instrumentation.
