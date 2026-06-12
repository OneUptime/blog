# Validation Summary: How to Debug Alertmanager Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Prometheus Alertmanager (v2 API)
- Prometheus (v1 API)
- `amtool` CLI
- Kubernetes (kubectl)
- Slack webhooks
- PagerDuty Events API v2
- YAML configuration
- Mermaid diagrams (for flowcharts)
- Bash scripting / curl

## Sources Consulted
- Prometheus Alertmanager official documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Alertmanager OpenAPI v2 spec: https://github.com/prometheus/alertmanager/blob/main/api/v2/openapi.yaml
- `amtool` CLI reference: https://github.com/prometheus/alertmanager/tree/main/cmd/amtool
- Alertmanager source code (metric names): https://github.com/prometheus/alertmanager
- Prometheus configuration documentation (alerting block): https://prometheus.io/docs/prometheus/latest/configuration/configuration/#alertmanager_config
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2/overview/
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- GitHub issue on env var expansion in Alertmanager config: https://github.com/prometheus/prometheus/issues/2357

## Issues Found
1. **Incorrect claim about YAML environment variable expansion** (Section 3, "Common configuration mistakes"). The original example claimed that single quotes in YAML break environment variable expansion while double quotes allow it. This is factually wrong:
   - YAML itself does not perform shell-style environment variable expansion regardless of quote style.
   - Alertmanager intentionally does not support environment variable substitution in its configuration file (a long-standing design decision by the Prometheus team).
   - Both `'${SLACK_WEBHOOK}'` and `"${SLACK_WEBHOOK}"` would be treated as literal strings.

   **Fix:** Replaced the misleading example with the correct guidance: Alertmanager does not expand env vars at all, and the recommended way to load secrets is to use the `_file` suffix (e.g., `api_url_file`), which is a documented Alertmanager feature for receiver configs like Slack.

## Review Notes
- The post uses `source_match` and `target_match` in the `inhibit_rules` example. These keys still work but were deprecated in Alertmanager 0.22+ in favor of `source_matchers` and `target_matchers` (which use the PromQL-style matcher syntax). The current syntax is not incorrect, but future readers using newer Alertmanager versions may want to migrate to the newer matcher syntax.
- Grep patterns for metrics like `alertmanager_alerts_received`, `alertmanager_notifications_failed`, and `alertmanager_cluster_messages_publish_failures` will correctly match the canonical `_total` counter metrics — these are valid as grep prefixes.
- All API endpoints (`/api/v2/alerts`, `/api/v2/silences`, `/api/v2/status`, `/-/healthy`, `/-/ready`, `/-/reload`, `/metrics`) and the v1 Prometheus endpoints (`/api/v1/alerts`, `/api/v1/alertmanagers`) are accurate and currently supported.
- Default ports (9093 for API, 9094 for cluster gossip) are correct.
- PagerDuty Events API v2 payload format (routing_key, event_action, payload fields) matches the current API spec.
- `amtool` subcommands and flags (`check-config`, `config routes test`, `alert add`, `silence query`, `--alertmanager.url`, `--annotation`) are valid.
- The `jq` filters against the v2 API responses (which return arrays at the top level) correctly use `.[]` rather than `.data.alerts[]` — this is consistent with the v2 OpenAPI shape.
