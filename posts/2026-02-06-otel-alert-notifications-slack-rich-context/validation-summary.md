# Validation Summary: How to Send OpenTelemetry Alert Notifications to Slack Channels

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- Prometheus alerting rules and PromQL
- Prometheus Alertmanager
- Slack incoming webhooks
- Slack message formatting
- YAML
- curl

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack Block Kit blocks documentation: https://docs.slack.dev/reference/block-kit/blocks/

## Issues Found
- The post said Alertmanager supports Slack Block Kit in `slack_configs`, but Alertmanager's Slack receiver configuration exposes attachment-style fields such as `title`, `text`, `fields`, `color`, and `actions`, not a `blocks` configuration field. Changed the section heading and explanation to describe Slack attachments instead of Block Kit.
- The architecture diagram and channel setup implied one Slack webhook could route to multiple channels. Slack incoming webhook URLs are tied to the selected channel, so the diagram now says "Slack Webhooks" and the setup instructions now say to create a separate webhook for each target channel.
- The Alertmanager route examples used deprecated `match` syntax. Updated them to current `matchers` syntax.
- The route tree did not actually let critical or warning payment alerts continue to the team route because the severity routes stopped matching by default. Added `continue: true` to the severity routes so matching can proceed to the team route.
- The example Prometheus alert rule used a non-standard `http_server_errors_total` metric and `http_server_request_duration_count`. Updated it to calculate 5xx rate from the OpenTelemetry HTTP server request duration histogram count using the Prometheus-style `http_server_request_duration_seconds_count` metric and `http_response_status_code=~"5.."` label.
- The inhibition example used deprecated `source_match` and `target_match` syntax. Updated it to `source_matchers` and `target_matchers`.

## Review Notes
No local `amtool` or `promtool` binaries were available in the workspace, so configuration validation was performed against official documentation rather than local CLI checks. The Slack `channel` field is still shown because it is part of Alertmanager's Slack configuration schema, but Slack's current incoming webhook behavior uses the webhook's configured channel.
