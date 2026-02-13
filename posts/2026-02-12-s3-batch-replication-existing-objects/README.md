# How to Use S3 Batch Replication for Existing Objects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Replication, Data Management

Description: Step-by-step guide to using S3 Batch Replication to replicate existing objects that were uploaded before replication rules were configured or that previously failed to replicate.

---

When you enable S3 replication on a bucket, it only applies to new objects. Everything that was already in the bucket doesn't get replicated. This is a problem when you're setting up disaster recovery for a bucket with terabytes of existing data, or when you need to bring a new region's replica up to date.

S3 Batch Replication solves this. It retroactively replicates existing objects, failed replications, and objects that were uploaded before your replication rules existed.

## When You Need Batch Replication

There are a few common scenarios:

- You just enabled cross-region replication and need to sync existing data
- Some objects failed to replicate and you want to retry them
- You added a new destination to your replication rules
- You're migrating to a multi-region architecture and need both regions in sync

## Prerequisites

Before running batch replication, you need an active replication configuration on the source bucket.

Make sure replication is configured.

```bash
# Check existing replication configuration
aws s3api get-bucket-replication --bucket source-bucket

# If not configured, set it up
aws s3api put-bucket-replication \
  --bucket source-bucket \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789012:role/S3ReplicationRole",
    "Rules": [
      {
        "ID": "ReplicateAll",
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {},
        "Destination": {
          "Bucket": "arn:aws:s3:::destination-bucket",
          "StorageClass": "STANDARD"
        },
        "DeleteMarkerReplication": {
          "Status": "Enabled"
        }
      }
    ]
  }'
```

Both buckets need versioning enabled.

```bash
# Enable versioning on both buckets
aws s3api put-bucket-versioning \
  --bucket source-bucket \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-versioning \
  --bucket destination-bucket \
  --versioning-configuration Status=Enabled
```

## Creating a Batch Replication Job

The easiest way to create a batch replication job is through the AWS CLI.

```bash
# Create a batch replication job for all existing objects
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{
    "S3ReplicateObject": {}
  }' \
  --manifest-generator '{
    "S3JobManifestGenerator": {
      "ExpectedBucketOwner": "123456789012",
      "SourceS3BucketArn": "arn:aws:s3:::source-bucket",
      "EnableManifestOutput": true,
      "ManifestOutputLocation": {
        "ExpectedManifestBucketOwner": "123456789012",
        "Bucket": "arn:aws:s3:::manifest-output-bucket",
        "ManifestPrefix": "batch-replication-manifests/",
        "ManifestFormat": "S3InventoryReport_CSV_20211130",
        "ManifestEncryption": {
          "SSES3": {}
        }
      },
      "Filter": {
        "EligibleForReplication": true,
        "ObjectReplicationStatuses": [
          "NONE",
          "FAILED",
          "REPLICA"
        ]
      }
    }
  }' \
  --report '{
    "Bucket": "arn:aws:s3:::manifest-output-bucket",
    "Prefix": "batch-replication-reports/",
    "Format": "Report_CSV_20180820",
    "Enabled": true,
    "ReportScope": "AllTasks"
  }' \
  --priority 1 \
  --role-arn arn:aws:iam::123456789012:role/S3BatchReplicationRole \
  --no-confirmation-required
```

Let's break down the key parts:

- **S3ReplicateObject**: The operation that tells Batch Operations to replicate objects
- **S3JobManifestGenerator**: Automatically generates a manifest of objects to replicate (no need to create one manually)
- **ObjectReplicationStatuses**: Filter for which objects to include:
  - `NONE` - Objects that were never replicated
  - `FAILED` - Objects that failed to replicate
  - `REPLICA` - Objects that are themselves replicas (for cascading replication)

## Filtering What Gets Replicated

You might not want to replicate everything. Use filters to target specific objects.

Replicate only objects under a specific prefix.

```bash
# Only replicate objects in the 'critical/' prefix
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{"S3ReplicateObject": {}}' \
  --manifest-generator '{
    "S3JobManifestGenerator": {
      "ExpectedBucketOwner": "123456789012",
      "SourceS3BucketArn": "arn:aws:s3:::source-bucket",
      "EnableManifestOutput": true,
      "ManifestOutputLocation": {
        "ExpectedManifestBucketOwner": "123456789012",
        "Bucket": "arn:aws:s3:::manifest-output-bucket",
        "ManifestPrefix": "batch-rep-critical/",
        "ManifestFormat": "S3InventoryReport_CSV_20211130",
        "ManifestEncryption": { "SSES3": {} }
      },
      "Filter": {
        "EligibleForReplication": true,
        "ObjectReplicationStatuses": ["NONE", "FAILED"],
        "KeyNameConstraint": {
          "MatchAnyPrefix": ["critical/"]
        }
      }
    }
  }' \
  --report '{
    "Bucket": "arn:aws:s3:::manifest-output-bucket",
    "Prefix": "batch-rep-reports/",
    "Format": "Report_CSV_20180820",
    "Enabled": true,
    "ReportScope": "FailedTasksOnly"
  }' \
  --priority 10 \
  --role-arn arn:aws:iam::123456789012:role/S3BatchReplicationRole \
  --no-confirmation-required
```

Filter by creation date to replicate only objects created before a certain time.

```bash
# Only replicate objects created before replication was enabled
# Use the CreatedAfter and CreatedBefore filters
"Filter": {
  "EligibleForReplication": true,
  "ObjectReplicationStatuses": ["NONE"],
  "CreatedBefore": "2026-02-01T00:00:00Z"
}
```

## IAM Role for Batch Replication

The batch replication role needs permissions for both Batch Operations and S3 replication.

Trust policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "batchoperations.s3.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Permissions policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:InitiateReplication"
      ],
      "Resource": "arn:aws:s3:::source-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:PutInventoryConfiguration"
      ],
      "Resource": "arn:aws:s3:::source-bucket"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::manifest-output-bucket/*"
    }
  ]
}
```

## Monitoring Batch Replication Jobs

Check the status of your batch replication job.

```bash
# Describe the job
aws s3control describe-job \
  --account-id 123456789012 \
  --job-id JOB_ID_HERE

# List all batch operations jobs
aws s3control list-jobs \
  --account-id 123456789012 \
  --job-statuses Active Complete
```

The job description includes progress details like total objects, objects processed, and objects failed.

## Checking the Completion Report

After the job finishes, check the completion report for failures.

```bash
# Download the completion report
aws s3 cp s3://manifest-output-bucket/batch-replication-reports/ ./reports/ --recursive

# The report is a CSV with columns:
# Bucket, Key, VersionId, TaskStatus, ErrorCode, HTTPStatusCode, ResultMessage
```

Common failure reasons:

- **AccessDenied** - The replication role doesn't have permission on the destination
- **ObjectNotEligibleForReplication** - Object doesn't match any replication rule
- **InternalError** - Transient AWS error, retry the failed objects

## Retrying Failed Objects

If some objects failed, create a new batch job targeting only failed replications.

```bash
# Retry only failed replications
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{"S3ReplicateObject": {}}' \
  --manifest-generator '{
    "S3JobManifestGenerator": {
      "ExpectedBucketOwner": "123456789012",
      "SourceS3BucketArn": "arn:aws:s3:::source-bucket",
      "EnableManifestOutput": true,
      "ManifestOutputLocation": {
        "ExpectedManifestBucketOwner": "123456789012",
        "Bucket": "arn:aws:s3:::manifest-output-bucket",
        "ManifestPrefix": "retry-manifests/",
        "ManifestFormat": "S3InventoryReport_CSV_20211130",
        "ManifestEncryption": { "SSES3": {} }
      },
      "Filter": {
        "EligibleForReplication": true,
        "ObjectReplicationStatuses": ["FAILED"]
      }
    }
  }' \
  --report '{
    "Bucket": "arn:aws:s3:::manifest-output-bucket",
    "Prefix": "retry-reports/",
    "Format": "Report_CSV_20180820",
    "Enabled": true,
    "ReportScope": "FailedTasksOnly"
  }' \
  --priority 5 \
  --role-arn arn:aws:iam::123456789012:role/S3BatchReplicationRole \
  --no-confirmation-required
```

## Verifying Replication

After the batch job completes, verify that objects exist in the destination.

```python
import boto3

def verify_replication(source_bucket, dest_bucket, prefix=''):
    """Compare object counts between source and destination."""
    s3 = boto3.client('s3')

    def count_objects(bucket, prefix):
        paginator = s3.get_paginator('list_objects_v2')
        count = 0
        total_size = 0
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for obj in page.get('Contents', []):
                count += 1
                total_size += obj['Size']
        return count, total_size

    src_count, src_size = count_objects(source_bucket, prefix)
    dst_count, dst_size = count_objects(dest_bucket, prefix)

    print(f"Source: {src_count} objects, {src_size / (1024**3):.2f} GB")
    print(f"Destination: {dst_count} objects, {dst_size / (1024**3):.2f} GB")
    print(f"Match: {'Yes' if src_count == dst_count else 'No'}")


verify_replication('source-bucket', 'destination-bucket')
```

## Cost Considerations

Batch replication costs include:

- **Batch Operations job fee**: Per job + per object processed
- **Data transfer**: Cross-region transfer fees if replicating across regions
- **S3 requests**: PUT requests to the destination bucket
- **Storage**: The replicated data in the destination bucket

For large datasets, the data transfer costs dominate. A 10 TB cross-region replication would cost around $200 in transfer fees.

For ongoing replication monitoring, use [OneUptime](https://oneuptime.com) to track replication lag, failed objects, and storage growth across regions.

For guaranteed replication timing on new objects, see our guide on [S3 Replication Time Control (RTC)](https://oneuptime.com/blog/post/2026-02-12-s3-replication-time-control-rtc-compliance/view).
