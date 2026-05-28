# Validation Summary: How to Configure Assured Workloads for HIPAA Compliance in Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Assured Workloads
- HIPAA compliance on Google Cloud
- Google Cloud CLI
- Cloud KMS and CMEK
- Cloud Storage
- Cloud SQL for PostgreSQL
- BigQuery
- VPC firewall rules and VPC Service Controls
- Cloud Logging and Cloud Monitoring
- IAM audit logging and organization policies

## Sources Consulted
- Google Cloud Assured Workloads overview: https://docs.cloud.google.com/assured-workloads/docs/overview
- Google Cloud Assured Workloads control packages: https://docs.cloud.google.com/assured-workloads/docs/control-packages
- US Data Boundary for Healthcare and Life Sciences: https://docs.cloud.google.com/assured-workloads/docs/control-packages/us-data-boundary-healthcare-life-sciences
- `gcloud assured workloads create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/assured/workloads/create
- `gcloud storage buckets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/storage/buckets/update
- Cloud Storage public access prevention: https://docs.cloud.google.com/storage/docs/public-access-prevention
- `gcloud sql instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Cloud SQL for PostgreSQL CMEK documentation: https://docs.cloud.google.com/sql/docs/postgres/cmek
- Cloud KMS locations: https://docs.cloud.google.com/kms/docs/locations
- `gcloud kms keys create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/kms/keys/create
- BigQuery customer-managed encryption keys: https://docs.cloud.google.com/bigquery/docs/customer-managed-encryption
- `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- `gcloud logging metrics create` reference: https://docs.cloud.google.com/logging/docs/reference/tools/gcloud-logging
- Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- `gcloud resource-manager org-policies list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/list
- `gcloud access-context-manager policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/access-context-manager/policies/create

## Issues Found
- The Assured Workloads creation command used `--resource-settings` as a JSON array with `CONSUMER_FOLDER`, but current `gcloud assured workloads create` expects a comma-separated key/value map and only supports settings such as `consumer-project-id`. Changed it to `--resource-settings=consumer-project-id=hipaa-workloads`.
- The Assured Workloads billing account example omitted the required `billingAccounts/` resource prefix. Updated the command to use `billingAccounts/BILLING_ACCOUNT_ID`.
- The compliance regime value was written as `HIPAA`. Current `gcloud` documentation lists the accepted value as `hipaa`, so the command was updated to use lowercase.
- The Cloud Storage example comment said to disable public access prevention, but the `--public-access-prevention` flag enables enforcement. Corrected the comment to match the command.
- The Cloud SQL CMEK key was created in the `us` multi-region while the SQL instance is in `us-central1`. Cloud SQL CMEK requires the key ring location to match the instance region and does not accept a multi-region key for a regional instance. Added a `us-central1` SQL key ring and updated the Cloud SQL key path.
- The Cloud SQL private-IP example referenced a VPC before explaining that the VPC and private services access must exist. Added a note before the instance creation command.
- The post did not mention that CMEK-backed services need service agent access to the relevant Cloud KMS keys. Added a concise note to grant the Cloud KMS CryptoKey Encrypter/Decrypter role before using the keys.
- The Cloud Monitoring alert policy command used non-current flags: `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-duration`. Updated it to the current `--if='> 100'` and `--duration=300s` flags.
- The post overstated HIPAA requirements by saying HIPAA requires all access to PHI to be logged and requires encryption at rest and in transit. Adjusted the wording to reflect HIPAA audit controls and encryption as an addressable implementation specification while preserving the security guidance.
- The introductory Assured Workloads description implied the service provides all technical safeguards HIPAA requires. Revised it to say Assured Workloads helps implement technical safeguards for regulated workloads.

## Review Notes
The post is technically relevant and valid after the corrections. The examples still use placeholder project, organization, billing, workload, folder, notification channel, and service agent values that readers must replace in a real environment.
