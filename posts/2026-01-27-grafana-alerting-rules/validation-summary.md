# Validation Summary: How to Implement Grafana Alerting Rules

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Alerting
- Grafana alert rules and expressions
- Grafana notification policies
- Grafana contact points
- Grafana silences and mute timings
- Grafana alert state history
- Prometheus / PromQL
- Loki / LogQL
- PagerDuty, Slack, email, Microsoft Teams, and webhook notification integrations

## Sources Consulted
- Grafana Alerting fundamentals: https://grafana.com/docs/grafana/latest/alerting/fundamentals/
- Grafana alert rule queries and conditions: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/queries-conditions/
- Grafana annotation and label template reference: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/reference/
- Grafana notification policies: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-notification-policy/
- Grafana contact points: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- Grafana alerting file provisioning: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana alerting provisioning HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/
- Grafana silences: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-silence/
- Grafana mute timings and active time intervals: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/mute-timings/
- Grafana alert state history configuration: https://grafana.com/docs/grafana/latest/alerting/set-up/configure-alert-state-history/
- Grafana alerting meta monitoring: https://grafana.com/docs/grafana/latest/alerting/set-up/meta-monitoring

## Issues Found
- The post described "Alert Groups" as a key alerting component. Changed this to "Alert Instances" because Grafana alert rules can create one alert instance per matching time series or dimension; grouping is handled in notification routing.
- The navigation path used the older "Alerting" menu wording. Updated it to "Alerts & IRM > Alerting > Alert rules > New alert rule" to match current Grafana documentation.
- Several YAML blocks looked like Grafana provisioning files but used non-provisioning keys such as `notification_policies`, `contact_points`, and `mute_timings`. Updated those examples to use documented provisioning keys such as `policies`, `contactPoints`, `receivers`, and `muteTimes`, and clarified that the alert-rule examples are simplified UI-oriented YAML rather than directly importable provisioning files.
- Annotation template examples used `$values.A` directly. Updated value references to use the documented `$values.<RefID>.Value` form.
- The math expression example claimed it used 0 if no requests, but the expression did not implement that behavior. Removed the inaccurate comment.
- The multi-condition section did not mention that classic conditions are legacy and produce a single alert instance. Added that caveat and recommended reduce, math, and threshold expressions for new multi-dimensional alerts.
- The state history section listed an unsupported `/api/v1/rules/history` API example. Replaced it with documented Prometheus and Loki state-history queries and the required `alertingCentralAlertHistory` feature toggle for the Grafana history UI with Loki.
- The state list omitted the `Recovering` state and used `NoData` instead of the documented `No Data` state name. Updated both.
- The state-history configuration block was marked as YAML even though it is `grafana.ini` TOML/INI syntax. Changed the code fence to `toml`.
- The complete example claimed to be a complete alert configuration file, but valid Grafana alert-rule provisioning requires exported query `model` JSON and concrete `datasourceUid` values. Reworded it as a conceptual example and corrected the notification policy/contact point portions.

## Review Notes
The alert-rule query examples remain intentionally simplified because Grafana-managed alert rules include data-source-specific query model JSON when provisioned from files or APIs. For production provisioning, users should export a rule from Grafana and adapt the generated schema.
