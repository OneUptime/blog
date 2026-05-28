# Validation Summary: How to Implement Emergency Break-Glass Access Procedures for Google Cloud

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts and service account keys
- Cloud Identity user accounts
- Secret Manager
- IAM deny policies
- Organization Policy Service
- Cloud Audit Logs and Cloud Logging log-based metrics
- Cloud Monitoring alerting policies
- Pub/Sub log routing sinks
- gcloud CLI

## Sources Consulted
- Google Cloud SDK: `gcloud projects create` - https://docs.cloud.google.com/sdk/gcloud/reference/projects/create
- Google Cloud SDK: `gcloud iam service-accounts create` - https://docs.cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud IAM: Create service accounts - https://docs.cloud.google.com/iam/docs/service-accounts-create
- Google Cloud IAM: Roles and permissions / basic roles - https://cloud.google.com/iam/docs/roles-overview
- Google Cloud IAM: Principal identifiers for deny policies - https://docs.cloud.google.com/iam/docs/principal-identifiers
- Google Cloud IAM: Deny policies overview - https://cloud.google.com/iam/docs/deny-overview
- Google Cloud SDK: `gcloud resource-manager org-policies` - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies
- Google Cloud SDK: `gcloud resource-manager org-policies enable-enforce` / resource flag pattern - https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/enable-enforce
- Cloud Audit Logs: Configure Data Access audit logs - https://cloud.google.com/logging/docs/audit/configure-data-access
- Cloud Logging: Logging query language - https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Cloud Logging: Log-based metrics overview - https://cloud.google.com/logging/docs/logs-based-metrics
- Cloud Logging: Configure counter metrics - https://cloud.google.com/logging/docs/logs-based-metrics/counter-metrics
- Google Cloud SDK: `gcloud logging metrics create` - https://cloud.google.com/logging/docs/reference/tools/gcloud-logging
- Google Cloud SDK: `gcloud monitoring policies create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring API: AlertPolicy and MetricThreshold fields - https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Logging: Route logs to supported destinations - https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK: `gcloud logging sinks create` - https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud SDK: `gcloud pubsub topics create` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud SDK: `gcloud pubsub topics add-iam-policy-binding` - https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/topics/add-iam-policy-binding

## Issues Found
- The IAM deny-policy service account exception used `principal://iam.googleapis.com/projects/break-glass-project/serviceAccounts/...`, which is not the documented deny-policy principal identifier format for a single service account. Updated it to `principal://iam.googleapis.com/projects/-/serviceAccounts/...`.
- The Monitoring alert creation command used unsupported flags: `--condition-threshold-value` and `--condition-threshold-comparison`. Replaced them with the documented `--if='> 0'` flag and added an aggregation suitable for evaluating a log-based counter metric.
- The Pub/Sub log-routing example created a sink to a topic that had not been created and omitted the sink writer identity permission. Added `gcloud pubsub topics create`, retrieved the sink `writerIdentity`, and granted `roles/pubsub.publisher` on the topic.
- The org-policy exemption wording was too broad. Clarified that the shown command disables enforcement of the `iam.disableServiceAccountKeyCreation` boolean constraint on the break-glass project specifically.

## Review Notes
The post intentionally uses service account keys for emergency access. This is technically valid, but Google Cloud generally recommends avoiding long-lived service account keys where possible; for a break-glass design, the compensating controls and rotation steps are important.
