# Validation Summary: How to Configure Backup Monitoring and Alerting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- Alertmanager
- Prometheus Python client
- Prometheus Pushgateway
- Restic
- Velero
- Kubernetes kubectl
- Grafana dashboards
- AWS Backup
- AWS CloudWatch
- Amazon RDS snapshots
- PagerDuty
- Slack webhooks
- Bash and curl

## Sources Consulted
- Prometheus Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Python client HTTP exporting and Counter docs: https://prometheus.github.io/client_python/exporting/http/ and https://prometheus.github.io/client_python/instrumenting/counter/
- Prometheus Pushgateway README: https://github.com/prometheus/pushgateway
- Restic documentation: https://restic.readthedocs.io/en/stable/
- Velero Backup API type docs: https://velero.io/docs/v1.17/api-types/backup/
- AWS Backup CloudWatch metrics docs: https://docs.aws.amazon.com/aws-backup/latest/devguide/cloudwatch.html
- Boto3 AWS Backup client docs: https://docs.aws.amazon.com/boto3/latest/reference/services/backup.html
- Grafana dashboard JSON model docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The Velero exporter only treated `Failed` backups as failed. Velero also has a `PartiallyFailed` backup phase, so the snippet could miss backups that completed with errors. Updated the condition to count both `Failed` and `PartiallyFailed`.
- The Alertmanager route examples used the older `match` syntax. Updated them to current `matchers` syntax.
- The PagerDuty receiver used `service_key` while the global URL pointed at the PagerDuty Events API v2 endpoint. Updated the example to use `routing_key`, which is the key field for Events API v2 integrations.
- The AWS CloudWatch alarm example did not specify a metric dimension. AWS Backup job metrics are reported with dimensions such as backup vault name and resource type. Added a `BackupVaultName` dimension so the alarm targets an actual AWS Backup metric series.

## Review Notes
- Python and JSON snippets were checked locally for syntax. YAML snippets were parsed successfully with PyYAML.
- The example remains intentionally generic; users still need to replace placeholder values such as Slack webhooks, PagerDuty routing keys, SNS topics, and backup vault names.
