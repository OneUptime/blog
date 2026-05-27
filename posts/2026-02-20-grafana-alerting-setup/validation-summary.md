# Validation Summary: How to Set Up Grafana Alerting with Contact Points and Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alerting
- Grafana contact points
- Grafana notification policies
- Grafana-managed alert rules
- Grafana alert rule templates
- Grafana silences and mute timings
- Prometheus / PromQL
- Slack, PagerDuty, and email notification integrations

## Sources Consulted
- Grafana Alerting overview: https://grafana.com/docs/grafana/latest/alerting/
- Grafana contact points: https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/contact-points/
- Grafana contact point provisioning and supported settings: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Alerting file provisioning: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana notification policies: https://grafana.com/docs/grafana/latest/alerting/notifications/
- Grafana-managed alert rules: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana alert annotation template reference: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana notification template reference: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/
- Grafana silences: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-silence/
- Grafana mute timings and active time intervals: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/mute-timings/
- Grafana PagerDuty integration: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/pager-duty/
- Grafana email integration: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-email/

## Issues Found
- Contact point snippets used a simplified shape with `name`, `type`, and `settings` at the top level. Updated them to Grafana file-provisioning format with `apiVersion`, `contactPoints`, and `receivers`.
- PagerDuty snippet included unsupported `severity` and `details` settings. Replaced them with the supported `autoResolve` setting and `integrationKey`.
- Notification policy examples used `contact_point` and a top-level `policies` key. Updated the examples to use Grafana provisioning route fields `receiver` and `routes`.
- Alert annotation examples referenced `{{ $values.C }}` directly. Updated them to `{{ $values.C.Value }}`, which is the documented way to print an expression value by Ref ID.
- The mute timing snippet had duplicate top-level `name` and `time_intervals` keys in one YAML block. Rewrote it as a valid Grafana `muteTimes` provisioning list.
- Updated Grafana UI navigation paths for contact points and silences to match the current Alerting documentation.

## Review Notes
The alert rule examples remain intentionally simplified YAML rather than complete exported Grafana rule provisioning files. They are technically consistent with Grafana's query, expression, threshold, label, and annotation concepts, but a production provisioning file would require Grafana's full exported rule schema.
