# How to Export and Import Memorystore Redis Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, GCP, Memorystore, Export, Import

Description: Learn how to export Memorystore for Redis data to Google Cloud Storage as an RDB snapshot and import it back to migrate or restore Redis datasets.

---

Memorystore supports exporting Redis data as an RDB file to Cloud Storage and importing RDB files from Cloud Storage. This enables data migration between instances, disaster recovery, and pre-seeding new environments.

## Prerequisites

- A Memorystore for Redis instance (Basic or Standard HA tier)
- A Cloud Storage bucket in the same region
- Memorystore service account must have Storage Object Admin on the bucket

## Granting Storage Access

```bash
# Construct the Memorystore service account email
REDIS_SA="service-$(gcloud projects describe my-project --format='value(projectNumber)')@cloud-redis.iam.gserviceaccount.com"

# Grant storage access
gsutil iam ch serviceAccount:$REDIS_SA:objectAdmin gs://my-redis-backups
```

## Exporting Redis Data

```bash
gcloud redis instances export gs://my-redis-backups/prod-cache.rdb prod-cache \
  --region=us-central1

# Monitor the export operation
gcloud redis operations list \
  --region=us-central1 \
  --filter="metadata.target:prod-cache"
```

This creates the RDB file at the specified Cloud Storage path.

## Importing Redis Data

```bash
# Import into a new or existing instance
gcloud redis instances import gs://my-redis-backups/prod-cache.rdb new-cache \
  --region=us-central1
```

Note: Import replaces ALL data in the target instance. Use with caution on production instances.

## Full Migration Workflow

```bash
# 1. Export from source
gcloud redis instances export gs://my-redis-migration/source-cache.rdb source-cache \
  --region=us-central1

# 2. Create new instance (if needed)
gcloud redis instances create target-cache \
  --region=us-east1 \
  --size=10 \
  --tier=STANDARD_HA \
  --redis-version=redis_7_0

# 3. Import to target
gcloud redis instances import gs://my-redis-migration/source-cache.rdb target-cache \
  --region=us-east1

# 4. Verify key count matches
gcloud redis instances describe target-cache --region=us-east1
```

## Terraform - Automated Export Schedule

Use Cloud Scheduler + Cloud Functions to automate periodic exports:

```hcl
resource "google_cloud_scheduler_job" "redis_backup" {
  name      = "redis-daily-export"
  region    = "us-central1"
  schedule  = "0 2 * * *"  # 2am daily
  time_zone = "UTC"

  http_target {
    uri         = google_cloudfunctions2_function.redis_export.url
    http_method = "POST"
  }
}
```

## Verifying the Export

```bash
# List exported files
gsutil ls -l gs://my-redis-backups/

# Check RDB file size
gsutil du -sh gs://my-redis-backups/prod-cache.rdb
```

## Summary

Memorystore export saves your Redis dataset as an RDB file to Cloud Storage, and import loads it into any Memorystore instance. Use exports for cross-region migration, disaster recovery, or pre-seeding new environments. Schedule periodic exports with Cloud Scheduler for ongoing backup. Grant the Memorystore service account Storage Object Admin on your bucket before starting.
