# Validation Summary: How to use Grafana Oncall for incident management integration

## Status
validated

## Post Type
Technical tutorial / integration guide

## Technologies Covered
- Grafana OnCall OSS
- Grafana Cloud IRM
- Grafana Alerting
- Grafana OnCall app plugin
- Docker Compose
- Grafana OnCall HTTP API
- Jinja templates

## Sources Consulted
- Grafana OnCall OSS archival notice: https://grafana.com/docs/oncall/latest/set-up/open-source/
- Grafana OnCall setup docs: https://grafana.com/docs/oncall/latest/set-up/
- Grafana OnCall get started docs: https://grafana.com/docs/oncall/latest/set-up/get-started/
- Grafana OnCall HTTP API reference: https://grafana.com/docs/oncall/latest/oncall-api-reference/
- Integrations HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/integrations/
- Routes HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/routes/
- Schedules HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/schedules/
- OnCall shifts HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/on_call_shifts/
- Escalation chains HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/escalation_chains/
- Escalation policies HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/escalation_policies/
- Alert groups HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/alertgroups/
- Personal notification rules HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/personal_notification_rules/
- Resolution notes HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/resolution_notes/
- Outgoing webhooks HTTP API: https://grafana.com/docs/oncall/latest/oncall-api-reference/outgoing_webhooks/
- Grafana OnCall templates docs: https://grafana.com/docs/oncall/latest/configure/jinja2-templating/
- Grafana Alerting integration docs: https://grafana.com/docs/oncall/latest/configure/integrations/references/grafana-alerting/
- Integration management and Maintenance Mode docs: https://grafana.com/docs/oncall/latest/configure/integrations/integration-management/
- Phone and SMS notification docs: https://grafana.com/docs/oncall/latest/manage/notify/phone-calls-sms/

## Issues Found
- The post did not mention that Grafana OnCall OSS is archived as of March 24, 2026. Added the current archival/read-only status and clarified that Grafana Cloud IRM is the actively developed path.
- The self-hosted Docker Compose example was not the official OnCall OSS playground setup and omitted required services from the official stack. Replaced it with the official Docker Compose download and `.env` setup commands.
- The Grafana plugin configuration used an unsupported `grafana.ini` snippet. Removed it and kept the documented plugin setup flow through the Grafana UI.
- The integration API example used the wrong integration type, `grafana_alerting`, and a bearer-style API key header. Updated it to the documented `type: "grafana"` and OnCall API key header format.
- The Grafana contact point URL used the wrong integration path. Updated it to `/integrations/v1/grafana/INTEGRATION_TOKEN/`.
- The schedule example mixed schedule and shift fields in a shape not documented by the API. Replaced it with documented `schedules` and `on_call_shifts` API calls.
- The escalation chain example used a single nested `steps` payload and unsupported step field names. Replaced it with separate documented escalation chain and escalation policy API calls.
- Route examples were missing route positions and used bearer-style auth. Added positions and corrected API key headers.
- Notification method configuration used an unsupported `notification_channels` payload. Replaced it with documented personal notification rule calls.
- Incident acknowledge, resolve, and notes examples used nonexistent `/incidents/` endpoints. Replaced them with documented `alert_groups` and `resolution_notes` endpoints.
- Template, grouping, outgoing webhook, metrics, and maintenance examples used unsupported field names or endpoints. Updated them to documented template fields, outgoing webhook fields, alert group listing, and UI-based Maintenance Mode.
- SMS and phone call wording did not account for the post-archive OSS Cloud Connection change. Added a caveat that a supported phone or SMS provider must be configured.

## Review Notes
The article remains useful as a migration-era OnCall OSS guide, but future updates should consider reframing it around Grafana Cloud IRM for new deployments because Grafana OnCall OSS is archived and Cloud Connection-dependent push, SMS, and phone call behavior has changed.
