# Validation Summary: How to Use Ansible to Deploy Loki for Log Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Grafana Loki
- Promtail
- Grafana datasource provisioning
- systemd
- LogQL
- S3 / filesystem storage

## Sources Consulted
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Promtail documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Loki 2.9.4 and Promtail 2.9.4 command-line validation using the official GitHub release binaries.

## Issues Found
- The post described Promtail as the log shipping agent without noting its lifecycle. Grafana documentation now marks Promtail as end-of-life as of March 2, 2026, so the introduction now identifies it as a legacy agent and points new deployments to Grafana Alloy.
- The Loki storage configuration used BoltDB Shipper with schema v12 for Loki 2.9.4. Grafana recommends TSDB with schema v13 for Loki 2.8 and newer, so the configuration, directory names, and architecture text were updated to TSDB.
- The retention configuration used legacy Table Manager and chunk store lookback settings with the Compactor. Retention is now configured through `compactor.retention_enabled` and `limits_config.retention_period`, with `max_query_lookback` set to match the retention period.
- The Promtail role extracted a zip file but did not install `unzip` on Promtail hosts. Added an `Install unzip` task to make Promtail-only deployments work.
- The Promtail template combined multiple file paths into one comma-separated `__path__` value. Updated it to render one static config per path, which matches Promtail's documented file target pattern.
- The Grafana play notified `Restart Grafana` without defining the handler, and referenced a datasource template without showing it. Added the missing handler and a minimal valid Loki datasource provisioning template.

## Review Notes
- The rendered Loki filesystem configuration was checked with the official Loki 2.9.4 binary using `-verify-config`.
- The rendered Promtail configuration was checked with the official Promtail 2.9.4 binary using `-check-syntax`.
- The article remains useful for existing Promtail environments, but future blog content should prefer Grafana Alloy for new log collection deployments.
