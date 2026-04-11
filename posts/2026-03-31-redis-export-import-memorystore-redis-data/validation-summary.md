# Validation Summary: How to Export and Import Memorystore Redis Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud Storage (GCS)
- gcloud CLI (redis instances export/import)
- gsutil CLI
- Terraform (google_cloud_scheduler_job)
- Google Cloud Scheduler
- Google Cloud Functions v2

## Sources Consulted
- `gcloud redis instances export --help` (official CLI reference)
- `gcloud redis instances import --help` (official CLI reference)
- Google Cloud Memorystore for Redis documentation: exporting and importing data (https://cloud.google.com/memorystore/docs/redis/export-data, https://cloud.google.com/memorystore/docs/redis/import-data)
- Terraform google_cloud_scheduler_job resource documentation (https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job)

## Issues Found

1. **Incorrect tier restriction in Prerequisites**: The post stated "Basic tier does not support export." Both Basic and Standard HA tiers support export/import. Fixed to list both tiers.

2. **Misleading command in Granting Storage Access**: The first command (`gcloud redis instances describe ... --format="value(persistenceConfig.rdbSnapshotPeriod)"`) was labeled "Get the Memorystore service account" but actually retrieved the RDB snapshot period, not the service account. Removed this command since the next line already correctly constructs the service account email programmatically.

3. **Incorrect export command syntax (3 occurrences)**: All `gcloud redis instances export` commands used a non-existent `--gcs-bucket` flag. The GCS URI is a positional argument that must come before the instance name. Fixed all occurrences to: `gcloud redis instances export gs://bucket/file.rdb INSTANCE --region=REGION`.

4. **Incorrect import command syntax (2 occurrences)**: All `gcloud redis instances import` commands used the same non-existent `--gcs-bucket` flag. Fixed to: `gcloud redis instances import gs://bucket/file.rdb INSTANCE --region=REGION`.

5. **Export destination must be a full .rdb file path**: The export commands specified only a bucket (`gs://my-redis-backups`) without a file name. The export command requires a full path including the `.rdb` filename. Fixed all export destinations to include a `.rdb` file path.

## Review Notes
- The Terraform snippet references `google_cloudfunctions2_function.redis_export` which is not defined in the post. This is acceptable as it serves as a partial example showing the Cloud Scheduler configuration pattern, but readers will need to implement the Cloud Function separately.
- The `gsutil` commands are correct but `gsutil` is being superseded by `gcloud storage` commands. This is not an error but worth noting for future updates.
