# How to Migrate Amazon S3 Buckets to Google Cloud Storage Using the Storage Transfer Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, AWS S3, Migration, Storage Transfer Service

Description: Migrate your Amazon S3 buckets to Google Cloud Storage using the Storage Transfer Service with minimal downtime and data integrity verification.

---

Moving data from Amazon S3 to Google Cloud Storage is one of the most common migration tasks when transitioning to GCP. The Storage Transfer Service is Google's purpose-built tool for this job. It handles everything from one-time bulk transfers to ongoing synchronization, and it does not require you to set up intermediate infrastructure.

In this post, I will walk through the entire process from IAM setup on both sides to running the transfer and verifying data integrity.

## Planning the Migration

Before you start transferring data, there are a few things to figure out:

- How much data are you moving? This determines transfer time and cost.
- Do you need the transfer to be incremental? If data keeps landing in S3 during migration, you need sync jobs.
- What are your source bucket regions? Transfers between regions add latency and egress costs.
- Do you need to preserve S3 metadata? Storage Transfer Service maps S3 metadata to GCS metadata, but there are differences.

## Setting Up AWS Credentials

The Storage Transfer Service needs read access to your S3 buckets. Create a dedicated IAM user in AWS with minimal permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowListBucket",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket",
                "s3:GetBucketLocation"
            ],
            "Resource": "arn:aws:s3:::source-bucket-name"
        },
        {
            "Sid": "AllowGetObject",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Resource": "arn:aws:s3:::source-bucket-name/*"
        }
    ]
}
```

Generate access keys for this user and store them in Google Cloud Secret Manager:

```bash
# Store AWS credentials in Secret Manager
echo -n "AKIAIOSFODNN7EXAMPLE" | \
  gcloud secrets create aws-access-key-id \
    --data-file=- \
    --project=my-gcp-project

echo -n "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" | \
  gcloud secrets create aws-secret-access-key \
    --data-file=- \
    --project=my-gcp-project
```

## Creating the Destination Bucket

Set up the GCS destination bucket with the right configuration:

```hcl
# destination-bucket.tf
# Google Cloud Storage bucket for migrated S3 data

resource "google_storage_bucket" "migrated_data" {
  name          = "my-project-migrated-from-s3"
  project       = var.project_id
  location      = "US"  # Match or be close to your S3 region
  storage_class = "STANDARD"

  # Enable versioning during migration for safety
  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true

  # Lifecycle rules to match your S3 lifecycle policies
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}
```

## Running a One-Time Transfer

For a simple one-time migration, use the gcloud CLI:

```bash
# Create a one-time transfer job from S3 to GCS
gcloud transfer jobs create \
  s3://source-bucket-name \
  gs://my-project-migrated-from-s3 \
  --source-creds-file=aws-creds.json \
  --project=my-gcp-project \
  --name="s3-to-gcs-migration" \
  --description="One-time migration from AWS S3"
```

The credentials file format:

```json
{
    "accessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "secretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

## Setting Up Incremental Transfers with Terraform

For larger migrations that need to run over days or weeks, set up a scheduled transfer job:

```hcl
# transfer-job.tf
# Storage Transfer Service job for S3 to GCS migration

resource "google_storage_transfer_job" "s3_to_gcs" {
  description = "Incremental sync from S3 to GCS"
  project     = var.project_id

  transfer_spec {
    # Source: AWS S3 bucket
    aws_s3_data_source {
      bucket_name = "source-bucket-name"
      aws_access_key {
        access_key_id     = var.aws_access_key_id
        secret_access_key = var.aws_secret_access_key
      }
      # Optional: only transfer objects matching a prefix
      # path = "data/production/"
    }

    # Destination: GCS bucket
    gcs_data_sink {
      bucket_name = google_storage_bucket.migrated_data.name
      # Optional: add a prefix to transferred objects
      # path = "from-s3/"
    }

    # Transfer options
    transfer_options {
      # Only transfer new or changed objects
      overwrite_objects_already_existing_in_sink = false

      # Delete objects from source after successful transfer
      # Use with caution - only enable after verification
      delete_objects_from_source_after_transfer = false

      # Overwrite if different checksum
      overwrite_when = "DIFFERENT"
    }
  }

  # Schedule: run daily at 2 AM UTC until migration is complete
  schedule {
    schedule_start_date {
      year  = 2026
      month = 2
      day   = 17
    }
    schedule_end_date {
      year  = 2026
      month = 3
      day   = 17
    }
    start_time_of_day {
      hours   = 2
      minutes = 0
      seconds = 0
      nanos   = 0
    }
    repeat_interval = "86400s"  # Daily
  }

  # Only transfer objects modified after a certain date
  # Useful for catching up incrementally
  # transfer_spec {
  #   object_conditions {
  #     min_time_elapsed_since_last_modification = "3600s"
  #   }
  # }
}
```

## Monitoring Transfer Progress

Keep track of your transfer jobs with this monitoring setup:

```python
# monitor_transfer.py
# Monitors Storage Transfer Service job progress
from google.cloud import storage_transfer_v1
import json

def check_transfer_status(project_id, job_name):
    """Check the status of a transfer job and its operations."""
    client = storage_transfer_v1.StorageTransferServiceClient()

    # Get the job details
    job = client.get_transfer_job(
        request={
            "project_id": project_id,
            "job_name": job_name,
        }
    )

    print(f"Job: {job.name}")
    print(f"Status: {job.status}")
    print(f"Description: {job.description}")

    # List recent operations (transfer runs)
    operations = client.list_transfer_operations(
        request={
            "name": "transferOperations",
            "filter": json.dumps({
                "projectId": project_id,
                "jobNames": [job_name],
            })
        }
    )

    for op in operations:
        counters = op.counters
        print(f"\nOperation: {op.name}")
        print(f"  Status: {op.status}")
        print(f"  Objects found: {counters.objects_found_from_source}")
        print(f"  Objects copied: {counters.objects_copied_to_sink}")
        print(f"  Bytes found: {counters.bytes_found_from_source}")
        print(f"  Bytes copied: {counters.bytes_copied_to_sink}")

        if counters.objects_found_from_source > 0:
            progress = (
                counters.objects_copied_to_sink /
                counters.objects_found_from_source * 100
            )
            print(f"  Progress: {progress:.1f}%")

        if op.error_breakdowns:
            print(f"  Errors: {len(op.error_breakdowns)}")
            for error in op.error_breakdowns[:5]:
                print(f"    - {error}")


if __name__ == "__main__":
    check_transfer_status(
        "my-gcp-project",
        "transferJobs/s3-to-gcs-migration"
    )
```

## Verifying Data Integrity

After the transfer completes, verify that all objects were transferred correctly:

```python
# verify_transfer.py
# Verifies data integrity after S3 to GCS migration
import boto3
from google.cloud import storage
import hashlib

def compare_buckets(s3_bucket, gcs_bucket, prefix=""):
    """Compare objects between S3 and GCS to verify transfer."""
    # Initialize clients
    s3 = boto3.client('s3')
    gcs = storage.Client()
    gcs_bucket_obj = gcs.bucket(gcs_bucket)

    # List all S3 objects
    s3_objects = {}
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=s3_bucket, Prefix=prefix):
        for obj in page.get('Contents', []):
            s3_objects[obj['Key']] = {
                'size': obj['Size'],
                'etag': obj['ETag'].strip('"'),
            }

    # List all GCS objects
    gcs_objects = {}
    for blob in gcs_bucket_obj.list_blobs(prefix=prefix):
        gcs_objects[blob.name] = {
            'size': blob.size,
            'md5': blob.md5_hash,
        }

    # Compare
    missing_in_gcs = []
    size_mismatch = []
    verified = 0

    for key, s3_info in s3_objects.items():
        if key not in gcs_objects:
            missing_in_gcs.append(key)
        elif s3_info['size'] != gcs_objects[key]['size']:
            size_mismatch.append({
                'key': key,
                's3_size': s3_info['size'],
                'gcs_size': gcs_objects[key]['size'],
            })
        else:
            verified += 1

    extra_in_gcs = [
        k for k in gcs_objects if k not in s3_objects
    ]

    print(f"S3 objects: {len(s3_objects)}")
    print(f"GCS objects: {len(gcs_objects)}")
    print(f"Verified (matching size): {verified}")
    print(f"Missing in GCS: {len(missing_in_gcs)}")
    print(f"Size mismatches: {len(size_mismatch)}")
    print(f"Extra in GCS: {len(extra_in_gcs)}")

    if missing_in_gcs:
        print("\nMissing objects (first 10):")
        for key in missing_in_gcs[:10]:
            print(f"  - {key}")

    return {
        "verified": verified,
        "missing": len(missing_in_gcs),
        "mismatched": len(size_mismatch),
        "extra": len(extra_in_gcs),
    }


if __name__ == "__main__":
    results = compare_buckets("my-s3-bucket", "my-project-migrated-from-s3")
```

## Handling Large-Scale Migrations

For very large buckets (tens of terabytes or more), consider these optimizations:

```bash
# Use prefix-based parallelism for large buckets
# Split the transfer into multiple jobs by prefix
for PREFIX in a b c d e f 0 1 2 3 4 5 6 7 8 9; do
  gcloud transfer jobs create \
    s3://source-bucket/${PREFIX} \
    gs://destination-bucket/${PREFIX} \
    --source-creds-file=aws-creds.json \
    --name="s3-migration-prefix-${PREFIX}" \
    --project=my-gcp-project
done
```

## Updating Application References

After verifying the transfer, update your application to use GCS instead of S3. If you are using the S3 compatibility endpoint in GCS, the migration is even simpler:

```python
# Use GCS S3-compatible endpoint during transition
import boto3

# Point S3 client at GCS S3-compatible endpoint
s3_compatible = boto3.client(
    's3',
    endpoint_url='https://storage.googleapis.com',
    aws_access_key_id='GOOG_ACCESS_KEY',
    aws_secret_access_key='GOOG_SECRET',
)

# Existing S3 code works with minimal changes
response = s3_compatible.get_object(
    Bucket='my-gcs-bucket',
    Key='my-object-key'
)
```

## Wrapping Up

Migrating S3 buckets to GCS with the Storage Transfer Service is straightforward once you get the IAM and credentials set up correctly on both sides. The key is to run incremental transfers rather than trying to do everything in one shot, verify data integrity after each run, and have a clear cutover plan for updating application references. Start with a non-critical bucket to get comfortable with the process before tackling your production data.
