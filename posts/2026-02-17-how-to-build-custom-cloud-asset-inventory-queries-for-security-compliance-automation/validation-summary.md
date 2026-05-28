# Validation Summary: How to Build Custom Cloud Asset Inventory Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Asset Inventory
- Google Cloud CLI
- BigQuery
- Cloud Functions / Cloud Run functions
- Cloud Scheduler
- Pub/Sub
- Python Google Cloud client libraries

## Sources Consulted
- Google Cloud CLI reference for `gcloud asset export`: https://docs.cloud.google.com/sdk/gcloud/reference/asset/export
- Cloud Asset Inventory BigQuery export documentation and schemas: https://docs.cloud.google.com/asset-inventory/docs/export-bigquery
- Cloud Asset Inventory search query syntax: https://docs.cloud.google.com/asset-inventory/docs/search-query-syntax
- Cloud Asset Inventory `searchAllResources` REST reference: https://docs.cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllResources
- Cloud Asset Inventory `searchAllIamPolicies` REST reference: https://docs.cloud.google.com/asset-inventory/docs/reference/rest/v1/TopLevel/searchAllIamPolicies
- Python Cloud Asset Inventory `BigQueryDestination` reference: https://docs.cloud.google.com/python/docs/reference/cloudasset/latest/google.cloud.asset_v1.types.BigQueryDestination
- Cloud Run functions runtime support: https://cloud.google.com/functions/docs/runtime-support

## Issues Found
- The `gcloud asset export` examples used invalid `--output-bigquery-dataset` and `--output-bigquery-table` flags. Updated them to the current `--bigquery-table=projects/.../datasets/.../tables/...` form.
- The post did not account for `--per-asset-type` table prefixing. Updated the explanation and BigQuery table names to use the exported prefix, such as `all_resources_storage_googleapis_com_Bucket`.
- Several `search-all-resources` examples queried nested `additionalAttributes` fields directly, which is not supported as a field query. Reworded those examples and changed the queries to supported searches.
- The required-label query used `labels:environment`, which can match either label keys or values. Changed it to `NOT labels.environment:*` to check specifically for the `environment` label key.
- The Cloud Storage encryption example called buckets "unencrypted" even though Cloud Storage is encrypted by default. Reworded it as a CMEK-specific check.
- The OS Login query implied it detected all OS Login configuration. Reworded it to clarify that it only checks instance-level metadata.
- The firewall query missed rules with no explicit ports, which allow all ports. Updated it to include empty `ports` arrays.
- The service account key query referenced a non-existent `serviceAccountId` field and the scanner used an unrelated email-domain filter. Updated both to check `ServiceAccountKey` rows with `keyType = 'USER_MANAGED'` and match key names to service account emails.
- IAM policy BigQuery queries used a non-existent `resource` column. Updated them to use `name` and `asset_type` according to the documented IAM policy export schema.

## Review Notes
- `gcloud` is not installed in the local review environment, so CLI verification was done against the official Google Cloud CLI documentation instead of local `--help` output.
- The sample checks are still illustrative and require the exported BigQuery dataset, tables, IAM permissions, Pub/Sub topic, service accounts, and Cloud Scheduler authentication to be configured in the reader's project.
