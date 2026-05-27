# Validation Summary: How to Monitor and Audit CMEK Usage Across a Google Cloud Organization

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Platform
- Customer-Managed Encryption Keys (CMEK)
- Cloud KMS
- Cloud Audit Logs
- Cloud Logging log sinks
- BigQuery log exports
- Cloud Asset Inventory
- Cloud Monitoring log-based alerting policies
- Terraform Google provider
- Python Google Cloud client libraries

## Sources Consulted
- Cloud KMS audit logging: https://cloud.google.com/kms/docs/audit-logging
- Enable Data Access audit logs: https://cloud.google.com/logging/docs/audit/configure-data-access
- Terraform `google_organization_iam_audit_config`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_organization_iam_audit_config
- `gcloud logging sinks create`: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging aggregated sinks and destination permissions: https://cloud.google.com/logging/docs/export/aggregated_sinks
- BigQuery `bq` CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery exported Cloud Logging tables: https://cloud.google.com/logging/docs/export/bigquery
- Cloud Asset Inventory `searchAllResources`: https://cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllResources
- Cloud Asset Inventory search guide: https://cloud.google.com/asset-inventory/docs/search-resources
- Cloud Asset Inventory legacy KMS fields: https://cloud.google.com/asset-inventory/docs/legacy-fields
- Python Cloud KMS client library: https://cloud.google.com/python/docs/reference/cloudkms/latest/google.cloud.kms_v1.services.key_management_service.KeyManagementServiceClient
- Python Resource Manager v3 `ProjectsClient.search_projects`: https://cloud.google.com/python/docs/reference/cloudresourcemanager/latest/google.cloud.resourcemanager_v3.services.projects.ProjectsClient
- Cloud Logging log-based alerting policies: https://cloud.google.com/logging/docs/alerting/log-based-alerts
- `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The IAM audit logging command used `gcloud organizations set-iam-policy` to read the current policy. Changed it to `gcloud organizations get-iam-policy`, which is the correct command for retrieving the policy before editing it.
- The audit log configuration included `ADMIN_WRITE`, but IAM audit configs only support configurable `ADMIN_READ`, `DATA_READ`, and `DATA_WRITE` log types; Admin Activity logs for admin writes are enabled by default. Removed `ADMIN_WRITE` and clarified the surrounding text.
- The BigQuery log sink queries referenced unsuffixed tables, but the sink command did not request partitioned tables. Added `--use-partitioned-tables` so the table names in the SQL examples match the exported log tables.
- The BigQuery dataset permission command used `bq add-iam-policy-binding`, which does not support datasets. Replaced it with the documented `gcloud projects add-iam-policy-binding` approach for granting the sink writer identity `roles/bigquery.dataEditor`.
- The Python rotation scan hard-coded a small set of KMS locations while claiming to scan organization keys. Updated it to list project locations from the KMS client and scan those locations.
- The Python rotation scan used naive UTC datetime handling. Updated it to use `datetime.now(timezone.utc)` with the timestamp returned by the client library.
- The Cloud Asset Inventory examples used the deprecated/incorrect `kmsKeyName` query field and a non-documented `additionalAttributes` parsing pattern. Replaced them with the current `kmsKeys` search field for both Cloud Storage buckets and BigQuery datasets.
- The Cloud Monitoring alert commands used metric-threshold flags that don't exist on `gcloud monitoring policies create` and attempted to pass log filters as metric filters. Replaced them with log-based alert policy JSON using `conditionMatchedLog` and `gcloud monitoring policies create --policy-from-file`.

## Review Notes
- The rotation script is still an illustrative scanner; production use should add pagination-aware reporting, explicit permission error handling, and possibly folder traversal expectations for projects inherited through nested folders.
- The Cloud Asset Inventory examples are useful for broad coverage checks, but service-specific APIs or exported Asset Inventory resource data can provide richer CMEK coverage details for some resource types.
