# Validation Summary: How to Monitor Compliance Violations in GCP Assured Workloads

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud Assured Workloads
- Assured Workloads violation monitoring
- gcloud CLI
- Cloud Asset Inventory
- Cloud Storage CMEK
- Organization Policy Service
- Service Usage
- Cloud Logging log-based metrics
- Cloud Monitoring alerting policies
- Cloud Functions for Python
- Cloud Scheduler

## Sources Consulted
- Google Cloud Assured Workloads: Monitor an Assured Workloads folder for violations: https://docs.cloud.google.com/assured-workloads/docs/monitor-folder
- Assured Workloads REST API, violations.list: https://cloud.google.com/assured-workloads/docs/reference/rest/v1/organizations.locations.workloads.violations/list
- gcloud CLI reference for Assured Workloads violations: https://cloud.google.com/sdk/gcloud/reference/assured/workloads/violations
- gcloud CLI reference for `gcloud assured workloads violations acknowledge`: https://cloud.google.com/sdk/gcloud/reference/assured/workloads/violations/acknowledge
- Python client reference for `AssuredWorkloadsServiceClient.list_violations`: https://docs.cloud.google.com/python/docs/reference/assuredworkloads/latest/google.cloud.assuredworkloads_v1.services.assured_workloads_service.AssuredWorkloadsServiceClient
- Python client reference for `Violation` fields: https://docs.cloud.google.com/python/docs/reference/assuredworkloads/latest/google.cloud.assuredworkloads_v1.types.Violation
- Cloud Storage CMEK documentation: https://docs.cloud.google.com/storage/docs/encryption/using-customer-managed-keys
- gcloud CLI reference for `gcloud storage buckets update`: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- gcloud CLI reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- gcloud CLI reference for `gcloud resource-manager org-policies list`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/list
- gcloud CLI reference for `gcloud resource-manager org-policies delete`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/delete
- Cloud Logging gcloud reference: https://cloud.google.com/logging/docs/reference/tools/gcloud-logging

## Issues Found
- The Cloud Storage bucket CMEK check used `default_encryption_key` in `gcloud storage buckets list`, which is not the documented output field for checking a bucket's default KMS key. Replaced it with a loop that describes each bucket and checks the documented `default_kms_key` field.
- The organization policy delete command used `constraints/gcp.resourceLocations`. The documented `gcloud resource-manager org-policies delete` argument expects the constraint ID, such as `gcp.resourceLocations`, without the `constraints/` prefix. Updated the command.
- The Cloud Monitoring alerting policy command used stale `--condition-threshold-*` flags. Replaced them with the current documented `--if='> 0'` and `--duration=0s` flags.

## Review Notes
- `gcloud` was not installed in the local environment, so CLI validation was performed against official Google Cloud CLI reference pages.
- Assured Workloads violation monitoring focuses on organization policy and resource violations. The post's high-level examples are consistent with Google Cloud's documented violation categories and fields.
