# Validation Summary: How to Implement Alert Templates

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Prometheus Alertmanager
- Alertmanager notification templates
- Go templates
- Slack notifications
- PagerDuty Events API v2 notifications
- Email notifications
- YAML and JSON configuration
- `amtool`

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Prometheus Alertmanager GitHub README and `amtool` examples: https://github.com/prometheus/alertmanager
- Alertmanager template package documentation: https://pkg.go.dev/github.com/prometheus/alertmanager/template
- Slack message attachments documentation: https://docs.slack.dev/legacy/legacy-messaging/legacy-interactive-message-field-guide
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2-overview
- Go `text/template` documentation: https://pkg.go.dev/text/template

## Issues Found
- Alertmanager does not provide a `default` template function. Replaced `| default "..."` examples with Go template `or` fallback expressions, which are supported by Go templates and work with Alertmanager's function set.
- The initial Slack receiver example omitted both `api_url` and a global `slack_api_url`, making the receiver incomplete. Added `api_url` to the example.
- The advanced Slack example used a `blocks` field and Slack Block Kit JSON, but Alertmanager's Slack receiver schema sends attachment-style notifications and does not expose a `blocks` configuration field. Replaced that section with supported `fields` and `actions` configuration.
- The PagerDuty examples used `service_key`. Updated them to `routing_key`, which matches Alertmanager's current PagerDuty Events API v2 configuration and PagerDuty's routing key terminology.
- The complete configuration used deprecated route `match` fields. Replaced them with `matchers`.
- The inhibition rule used deprecated `source_match` and `target_match` fields. Replaced them with `source_matchers` and `target_matchers`.
- The `amtool` testing command used the non-current `amtool template test` form and inline data. Replaced it with `amtool template render` using `--template.glob`, `--template.text`, and `--template.data`.
- The template test data example was YAML, but `amtool --template.data` expects a JSON file matching Alertmanager's template `Data` structure. Converted the sample to JSON.
- Updated further-reading links so the Slack link matches attachment-style Slack notifications and the PagerDuty link points to the current Events API v2 overview.

## Review Notes
- I could not run `amtool check-config` or `amtool template render` locally because neither `amtool` nor a Go toolchain is installed in the workspace. The review was completed by static validation against current official Alertmanager, Slack, PagerDuty, and Go documentation.
