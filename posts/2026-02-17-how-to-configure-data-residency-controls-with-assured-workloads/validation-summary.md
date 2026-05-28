# Validation Summary: How to Configure Data Residency Controls with Assured Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Assured Workloads
- Google Cloud Organization Policy
- Cloud Asset Inventory
- Cloud Storage
- BigQuery
- Cloud Spanner
- Cloud KMS
- Cloud Logging
- Cloud Monitoring
- Cloud SQL
- Google Cloud CLI

## Sources Consulted
- Google Cloud Assured Workloads data residency: https://docs.cloud.google.com/assured-workloads/docs/data-residency
- Google Cloud Assured Workloads locations: https://docs.cloud.google.com/assured-workloads/docs/locations
- Google Cloud Assured Workloads control package reference: https://docs.cloud.google.com/assured-workloads/docs/reference/rest/Shared.Types/ComplianceRegime
- Google Cloud CLI `gcloud assured workloads create`: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- Google Cloud resource location restriction policy: https://docs.cloud.google.com/organization-policy/restrict-locations
- Google Cloud CLI `gcloud resource-manager org-policies set-policy`: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Cloud Asset Inventory search query syntax: https://docs.cloud.google.com/asset-inventory/docs/search-query-syntax
- Cloud KMS locations: https://docs.cloud.google.com/kms/docs/locations
- Google Cloud CLI `gcloud logging metrics create`: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud SQL custom backup locations: https://docs.cloud.google.com/sql/docs/mysql/backup-recovery/backing-up

## Issues Found
- The post used the old `EU_REGIONS_AND_SUPPORT` and `FEDRAMP_MODERATE` Assured Workloads enum names. Updated the examples to the recommended `EU_DATA_BOUNDARY_AND_SUPPORT` and `US_DATA_BOUNDARY_AND_SUPPORT` control package enums.
- The EU Assured Workloads workload location used `eu`, but current Assured Workloads workload locations list the EU multi-region as `europe`. Updated the command to `--location=europe`.
- The `gcloud assured workloads create` examples used JSON-style `--resource-settings` for a consumer folder. The current CLI flag accepts a supported key-value map for optional provisioned resources, and the folder itself is created by the workload command. Removed the unsupported `--resource-settings` examples.
- The billing account placeholder omitted the required `billingAccounts/` resource prefix. Updated the examples to use `billingAccounts/BILLING_ACCOUNT_ID`.
- Some residency claims were too broad. Updated the language to state that resource-location enforcement applies to supported services and supported resource types, and clarified backup, replica, key, and processing scope.
- The Cloud Storage section implied EU multi-region buckets are always inappropriate. Updated it to clarify that regional buckets are necessary for country- or region-specific residency requirements, while EU multi-region can still satisfy EU-wide residency.
- The KMS section described global key behavior imprecisely. Updated it to match Cloud KMS documentation that global keys have no geographic residency requirements.
- The Cloud Monitoring alert command used non-existent flags: `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`. Replaced them with current `gcloud monitoring policies create` flags: `--duration` and `--if`.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud CLI reference instead of local `--help` output.
