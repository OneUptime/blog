# Validation Summary: How to Use Ansible to Install and Configure Alertmanager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Alertmanager
- Prometheus alerting
- YAML configuration
- systemd
- Slack notifications
- PagerDuty notifications

## Sources Consulted
- Prometheus Alertmanager concepts: https://prometheus.io/docs/alerting/latest/alertmanager/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager Alerts API: https://prometheus.io/docs/alerting/0.30/alerts_api/
- Prometheus Alertmanager releases: https://github.com/prometheus/alertmanager/releases
- Prometheus downloads page: https://prometheus.io/download/
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible unarchive module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html

## Issues Found
- The post used Alertmanager 0.26.0, which is outdated for a 2026 installation guide. Updated the default version to 0.32.1, the current stable release listed by the official Prometheus download and GitHub release pages on 2026-05-26.
- The route examples and template used deprecated `match` syntax. Updated them to `matchers` with quoted matcher expressions, matching the current Alertmanager configuration reference and the UTF-8 matcher guidance.
- The inhibition examples and template used deprecated `source_match` and `target_match` syntax. Updated them to `source_matchers` and `target_matchers`.
- The PagerDuty receiver used `service_key`, which is for the older PagerDuty Prometheus integration type. Updated the example to `routing_key`, which matches PagerDuty Events API v2 usage in the Alertmanager configuration reference.
- The default Slack and PagerDuty credentials were empty while the default routing tree referenced those receivers. This caused `amtool check-config` to fail. Replaced them with explicit placeholder values so the example configuration validates and still makes it clear users must provide real credentials.

## Review Notes
Validated a rendered configuration with the official Alertmanager 0.32.1 `amtool check-config` binary. The Ansible module usage, systemd service options, management health endpoint, and API v2 test alert command are consistent with the official documentation.
