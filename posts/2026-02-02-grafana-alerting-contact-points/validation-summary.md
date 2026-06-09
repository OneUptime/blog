# Validation Summary: How to Build Grafana Alerting Contact Points

## Status
validated

## Post Type
Tutorial / Hands-on Guide

## Technologies Covered
- Grafana Alerting (Grafana 9.0+ Unified Alerting)
- Grafana provisioning YAML (contact points, notification policies, mute timings, alert rules)
- Grafana alerting integrations: Email (SMTP), Slack (webhook + bot token), PagerDuty, Webhook, Microsoft Teams, OpsGenie, Discord
- Grafana Go-style notification templating
- Grafana HTTP API (`/api/alertmanager/grafana/config/api/v1/receivers/test`)
- Python / Flask (custom webhook handler example)
- Mermaid diagrams (illustrative)

## Sources Consulted
- Grafana docs — Use configuration files to provision alerting resources: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana docs — Configure contact points: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- Grafana docs — Configure Grafana (SMTP / `startTLS_policy`): https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana docs — Alerting Provisioning HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/alerting_provisioning/
- Grafana Labs blog — Test contact points (Grafana 8.2+): https://grafana.com/blog/new-in-grafana-8-2-test-contact-points-for-alerts-before-they-fire/
- Grafana alerting webhook receiver package: https://pkg.go.dev/github.com/grafana/alerting/receivers/webhook

## Issues Found

1. **Email contact point — misleading `singleEmail` comment.** The original comment said `singleEmail: false` enables "HTML formatting for better readability." That is incorrect — `singleEmail` controls whether one email is sent to all recipients (true) versus individual emails per recipient (false); it has nothing to do with HTML formatting. Comment rewritten to accurately describe the setting.

2. **Slack bot token — misleading `mentionChannel` comment.** The comment described `mentionChannel: "here"` as enabling "Thread replies for follow-up notifications." `mentionChannel` actually controls whether the message includes a `@here` or `@channel` mention; valid values are `"here"` or `"channel"`. Comment corrected.

3. **Webhook contact point — misplaced comment on `maxAlerts`.** The comment `# Custom headers for your API` was placed above `maxAlerts: 10`, but `maxAlerts` has nothing to do with custom headers — it caps the number of alerts included in a single webhook payload. Comment rewritten to describe `maxAlerts` accurately.

4. **Discord — misleading `use_discord_username` comment.** The comment described it as controlling "Whether to use Discord embeds." It actually instructs Grafana to use the username configured on the Discord webhook itself rather than Grafana's default sender name. Comment corrected.

5. **Microsoft Teams — incorrect casing on `sectionTitle`.** The Grafana provisioning schema uses the lowercase field name `sectiontitle`, not the camelCase `sectionTitle`. Changed to `sectiontitle` to match the documented field.

## Review Notes

- The blog targets Grafana 9.0+; the webhook auth fields `authorization_scheme` / `authorization_credentials` shown in the post are the correct modern equivalents and are mutually exclusive with the older `username` / `password` basic-auth fields (worth noting but not a defect).
- The grafana.ini snippet uses Grafana's documented triple-quoted-string syntax for passwords with special characters — correct.
- `startTLS_policy` value `MandatoryStartTLS` is among the valid options (`OpportunisticStartTLS`, `MandatoryStartTLS`, `NoStartTLS`, or empty).
- The `muteTimes` top-level key in provisioning YAML is camelCase as written, while nested fields (`time_intervals`, `start_time`, etc.) are snake_case — that mixed casing in Grafana's schema is intentional and the post matches it.
- The `Authorization: Bearer your-api-key` style in the API test example is the documented way to authenticate; Grafana service-account tokens fit this scheme.
- The `monday:friday` range syntax in mute timings and the `"1:7"` day-of-month range are valid Alertmanager-style range expressions.
- The notification template snippets are illustrative Go-template code; they are tagged ```go for syntax highlighting, which is a common convention even though Grafana templates use the Go `text/template` engine with Alertmanager helpers (`toUpper`, `len`, `default`, etc.).
- The webhook payload example includes `dashboardURL`, `panelURL`, and `values` fields, which are Grafana-specific extensions on top of the standard Alertmanager webhook schema — accurate.
- The Python webhook handler is a minimal illustrative example using Flask; the `from datetime import datetime` import is unused, but that is a stylistic nit, not a technical error, and was left as-is per the "only fix technical errors" guidance.
