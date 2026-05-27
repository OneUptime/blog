# Validation Summary: How to Use Ansible to Set Up Uptime Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Prometheus
- Prometheus Blackbox Exporter
- Alertmanager
- systemd
- Slack incoming webhooks

## Sources Consulted
- Prometheus multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.53/configuration/alerting_rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.5/querying/api/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible playbook CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html
- systemd.exec manual for AmbientCapabilities: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The inventory variables included per-target `expected_status`, `interval`, and `timeout` fields, but the Prometheus and Blackbox Exporter templates did not consume them. Removed those unused fields from the examples so the shown variables match the shown implementation.
- The Prometheus configuration snippet defined scrape jobs but did not show the `alerting` and `rule_files` settings needed for Prometheus to load the uptime rules and send alerts to Alertmanager. Added minimal `alerting.alertmanagers` and `rule_files` entries.
- The Alertmanager route used the deprecated `match` field. Changed it to the current `matchers` syntax.
- The example `ansible-playbook` command used `--tags prometheus-config`, but no matching tags are defined in the shown playbook or role snippets. Changed it to run the playbook normally.

## Review Notes
- The Prometheus and Blackbox Exporter versions in the examples are older pinned versions. The snippets remain technically valid, but readers should check current release versions before deploying a new production stack.
- Local `promtool`, `ansible-playbook`, and `ansible-lint` binaries were not available in the review environment, so validation was performed against official documentation and by syntax review.
