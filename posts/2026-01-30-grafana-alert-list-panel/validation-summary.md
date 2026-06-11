# Validation Summary: How to Create Grafana Alert List Panel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alert List panel
- Grafana Alerting
- Grafana dashboard JSON
- Grafana dashboard variables
- Prometheus label values variables
- OneUptime Grafana webhook integration

## Sources Consulted
- Grafana Alert list documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/alert-list/
- Grafana alert rule evaluation documentation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/
- Grafana No Data and Error states documentation: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/nodata-and-error-states/
- Grafana create and link alert rules to panels documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/link-alert-rules-to-panels/
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana variable syntax documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/variable-syntax/
- Grafana webhook contact point documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/
- Grafana Alert List panel source code: https://github.com/grafana/grafana/tree/main/public/app/plugins/panel/alertlist
- OneUptime Grafana integration documentation: https://oneuptime.com/docs/integrations/grafana

## Issues Found
- Corrected Alert List view mode descriptions. The post described a current-state mode and a state-changes mode, but current Grafana Alert List options expose List and Stat view modes. Updated the affected prose and examples to describe current alert states instead of recent state transitions.
- Corrected label filter syntax. Grafana documents Alert instance label filtering with PromQL-style label matchers such as `{severity="critical"}`, not plain `severity=critical` strings. Updated YAML and JSON examples accordingly.
- Corrected sort order values. In Grafana's JSON model, `sortOrder: 3` is Importance; `sortOrder: 1` is Alphabetical ascending. Updated examples that intended firing/important alerts first.
- Added the Recovering state where state lists and JSON filters enumerated alert states. Current Grafana alerting includes Recovering for alerts in the keep firing period.
- Corrected custom grouping JSON. `groupBy` is an array of label names, so `"groupBy": "oncall_team"` was changed to `"groupBy": ["oncall_team"]`.
- Removed stale `showInstances` examples and prose because the current Alert List panel editor does not expose that option.
- Corrected alert name filtering language from regex matching to text filtering, matching the current panel source description.
- Replaced the deprecated Prometheus variable `label_values()` classic query example with the current Label values query type fields.
- Corrected stat panel styling guidance to use Alert List stat style options and thresholds instead of generic color scheme wording.
- Updated troubleshooting wording to match the panel's current "No alerts matching filters" behavior and to avoid implying all Alert List queries only hit a Grafana alerting database.

## Review Notes
The dashboard JSON examples are illustrative panel/dashboard snippets and may still need environment-specific folder UIDs, data source names, and import metadata in a real Grafana instance. The post does not pin a Grafana version; the validation was performed against current Grafana documentation and current Grafana Alert List source behavior as of 2026-06-11.
