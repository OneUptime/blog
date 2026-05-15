# Validation Summary: How to Set Up Prometheus Alertmanager for Notifications on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Prometheus
- Alertmanager
- PromQL alerting rules
- systemd
- firewalld
- SMTP email notifications
- Slack webhook notifications

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus alerting based on metrics tutorial: https://prometheus.io/docs/tutorials/alerting_based_on_metrics/
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus getting started documentation for node CPU PromQL aggregation examples: https://prometheus.io/docs/prometheus/latest/getting_started/
- Prometheus download page for current Alertmanager release: https://prometheus.io/download/
- Alertmanager 0.32.1 `amtool check-config --help` and `alertmanager --help`
- Prometheus 3.10.0 `promtool check rules`

## Issues Found
- The install commands used Alertmanager 0.27.0, which is no longer the current release. Updated the commands to use Alertmanager 0.32.1.
- The Alertmanager route examples used the older `match` mapping syntax. Updated them to `matchers` strings, which are compatible with Alertmanager's UTF-8 matcher parser.
- The Alertmanager configuration was not validated before starting the service. Added `amtool check-config /etc/alertmanager/alertmanager.yml --enable-feature=utf8-strict-mode`.
- The systemd unit did not enable UTF-8 strict mode even though the configuration now uses compatible matcher syntax. Added `--enable-feature=utf8-strict-mode`.
- The `HighCpuUsage` PromQL expression aggregated across all labels, so the `instance` label referenced in the annotation would be missing. Changed the expression to `avg by (instance)` so alerts remain per instance.
- The post created an alert rule file but did not show that Prometheus must load it with `rule_files`, or that Prometheus must be configured to send alerts to Alertmanager. Added a minimal `prometheus.yml` snippet for `rule_files` and `alerting.alertmanagers`.

## Review Notes
The final Alertmanager configuration was validated with Alertmanager 0.32.1 `amtool check-config --enable-feature=utf8-strict-mode`, and the alert rules were validated with Prometheus 3.10.0 `promtool check rules`. In a production environment, the SMTP password and Slack webhook should be stored securely rather than directly in the configuration file.
