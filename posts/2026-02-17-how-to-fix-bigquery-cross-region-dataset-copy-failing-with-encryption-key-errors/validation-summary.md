# Validation Summary: How to Fix BigQuery Cross-Region Dataset Copy Failing with Encryption Key Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google BigQuery
- BigQuery Data Transfer Service
- Cloud KMS
- Customer-managed encryption keys (CMEK)
- Google Cloud CLI (`gcloud`)
- BigQuery CLI (`bq`)
- Google Cloud organization policies
- Cloud Audit Logs

## Sources Consulted
- BigQuery customer-managed Cloud KMS keys documentation: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- BigQuery manage datasets and dataset copy documentation: https://docs.cloud.google.com/bigquery/docs/managing-datasets
- BigQuery `bq` command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Cloud KMS locations documentation: https://docs.cloud.google.com/kms/docs/locations
- Cloud KMS CMEK organization policies documentation: https://docs.cloud.google.com/kms/docs/cmek-org-policy
- `gcloud kms keys create` reference: https://cloud.google.com/sdk/gcloud/reference/kms/keys/create
- Google Cloud organization policy constraints documentation: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints

## Issues Found
- The examples used `--location=eu` and KMS resource paths with `locations/eu` for an `EU` BigQuery destination. BigQuery's `EU` multi-region should use the matching Cloud KMS multi-region location `europe`, so the key ring creation, key creation, IAM binding, key version, and KMS resource path examples were updated to use `europe`.
- The post said the key location should match the dataset region. This was clarified to "dataset location" and now notes the documented multi-region mapping, such as BigQuery `US` to Cloud KMS `us` and BigQuery `EU` to Cloud KMS `europe`.
- The permissions step stated that BigQuery needs access to both source and destination keys, but the example only granted access to the destination key. A short note was added to repeat the binding for the source key if the BigQuery service account does not already have decrypt access.

## Review Notes
The `bq mk --transfer_config` example uses the documented `cross_region_copy` data source and supported `--destination_kms_key` flag. Dataset copy has documented limitations, including unsupported resources such as views, routines, and external tables; the post does not cover those limitations in detail but remains technically correct for the CMEK-specific troubleshooting path.
