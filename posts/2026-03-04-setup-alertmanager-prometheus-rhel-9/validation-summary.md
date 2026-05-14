# Validation Summary: How to Set Up Alertmanager for Prometheus on RHEL

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Prometheus
- Alertmanager
- PromQL alerting rules
- systemd
- firewalld
- Slack, email, and webhook Alertmanager receivers

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager overview documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus promtool command documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Alertmanager GitHub releases: https://github.com/prometheus/alertmanager/releases
- Prometheus downloads: https://prometheus.io/download/
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/configuring_firewalls_and_packet_filters/

## Issues Found
- Updated the Alertmanager version from `0.27.0` to `0.32.1`, the latest Alertmanager release available during validation, so the download command no longer points readers at an older release.
- Replaced deprecated Alertmanager route `match` blocks with `matchers` entries. Alertmanager documentation marks `match` as deprecated in favor of `matchers`, and the newer form is compatible with UTF-8 strict mode.
- Replaced deprecated inhibition `source_match` and `target_match` blocks with `source_matchers` and `target_matchers`. This avoids deprecated syntax and validates under Alertmanager UTF-8 strict mode.
- Corrected the critical route comment from "PagerDuty and Slack" to "Slack and email" because the configured receiver contains Slack and email configs, not a PagerDuty config.
- Changed the Prometheus `rule_files` example from `alert_rules.yml` to `/etc/prometheus/alert_rules.yml` because the post creates the rules file at that absolute path, and Prometheus rule file paths should not rely on the service working directory.

## Review Notes
- The Alertmanager configuration snippet was validated with `amtool check-config --enable-feature=utf8-strict-mode` from Alertmanager 0.32.1.
- The Prometheus alert rules snippet was validated with `promtool check rules` from Prometheus 3.11.3.
- The example alert expressions are syntactically valid. In production, disk alerts usually add filesystem filters such as `fstype` and `device` exclusions to avoid noisy pseudo-filesystem alerts, but the current example is technically valid.
