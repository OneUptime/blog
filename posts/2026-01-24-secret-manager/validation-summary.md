# Validation Summary: How to Handle Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud CLI
- Python Google Cloud client libraries
- Cloud Run
- Google Kubernetes Engine
- Secrets Store CSI Driver / GKE Secret Manager add-on
- Cloud IAM
- Cloud Audit Logs
- Cloud Monitoring

## Sources Consulted
- Google Cloud Secret Manager create secrets documentation: https://docs.cloud.google.com/secret-manager/docs/creating-and-accessing-secrets
- Google Cloud Secret Manager add secret version documentation: https://docs.cloud.google.com/secret-manager/docs/add-secret-version
- Google Cloud Secret Manager rotation schedules documentation: https://docs.cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager audit logging documentation: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud Secret Manager best practices: https://docs.cloud.google.com/secret-manager/docs/best-practices
- Cloud Run secrets configuration documentation: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- GKE Secret Manager add-on documentation: https://docs.cloud.google.com/secret-manager/docs/secret-manager-managed-csi-component
- Cloud Logging log-based alerting documentation: https://docs.cloud.google.com/logging/docs/alerting/log-based-alerts
- Cloud Monitoring Python AlertPolicy Condition reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy.Condition

## Issues Found
- The Cloud Run deploy command used repeated `--set-secrets` flags. Updated it to use the documented `--update-secrets` form with comma-separated secret mappings so both the environment variable and mounted file are applied in one deploy command.
- The Cloud Run YAML referenced Secret Manager secrets without the `run.googleapis.com/secrets` annotation used by the Cloud Run v1 YAML format. Added the annotation that maps lookup names to Secret Manager resources.
- The GKE example mixed the managed Secret Manager add-on wording with the open source CSI driver/provider names. Updated the manifest to use `secrets-store-gke.csi.k8s.io` and `provider: gke`, matching the managed GKE add-on documentation.
- The GKE pod example included an environment variable sourced from a Kubernetes Secret that was not created by the shown Secret Manager add-on configuration. Removed that block so the example accurately shows mounted Secret Manager files.
- The IAM condition comment claimed direct IP-range restriction, but the expression checks an Access Context Manager access level. Updated the comment to describe the condition accurately.
- The audit section omitted the need to enable Data Access audit logs to capture `AccessSecretVersion` events. Added a short note before the log queries.
- The Cloud Monitoring alert example used a metric threshold condition with raw audit-log fields, which is not a valid metric filter. Replaced it with a log-based alert condition using `condition_matched_log` and changed the sample to accept an existing notification channel resource name.

## Review Notes
The examples remain intentionally simplified. The log-based alert sample now alerts on matching secret access log entries; rate-based thresholding would require a logs-based metric or a SQL/MQL-style alerting approach instead of a simple log-match condition.
