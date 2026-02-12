# How to Transfer Data Between S3 Buckets with DataSync

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DataSync, S3, Data Transfer

Description: Use AWS DataSync to transfer data between S3 buckets across accounts or regions, with filtering, scheduling, and integrity verification built in.

---

Copying data between S3 buckets sounds simple enough - just use `aws s3 sync`, right? That works fine for small datasets, but when you're dealing with millions of objects, cross-account transfers, or need guaranteed data integrity verification, AWS DataSync is the better tool. It handles parallelization, automatic retries, and verification at scale, and you don't need to deploy any agents for S3-to-S3 transfers.

Let's walk through the complete setup for transferring data between S3 buckets, whether they're in the same account, different accounts, or different regions.

## When to Use DataSync vs. S3 Replication

Before we dive in, let's clear up a common question. S3 Replication (CRR/SRR) is great for continuous, real-time replication of new objects. DataSync is better when you need to:

- Do a one-time bulk migration
- Transfer existing objects (S3 Replication only handles new objects by default)
- Apply filters to selectively transfer specific files
- Verify data integrity after transfer
- Run scheduled batch transfers
- Transfer between accounts without setting up cross-account replication rules

## Step 1: Set Up IAM Roles

DataSync needs permissions to read from the source bucket and write to the destination. For same-account transfers:

```bash
# Create the DataSync role
aws iam create-role \
  --role-name DataSyncS3ToS3Role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "datasync.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

# Policy for the source bucket (read access)
aws iam put-role-policy \
  --role-name DataSyncS3ToS3Role \
  --policy-name SourceBucketRead \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:GetObject",
          "s3:GetObjectTagging",
          "s3:ListBucketMultipartUploads"
        ],
        "Resource": [
          "arn:aws:s3:::source-bucket",
          "arn:aws:s3:::source-bucket/*"
        ]
      }
    ]
  }'

# Policy for the destination bucket (write access)
aws iam put-role-policy \
  --role-name DataSyncS3ToS3Role \
  --policy-name DestBucketWrite \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:AbortMultipartUpload",
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:ListMultipartUploadParts",
          "s3:PutObject",
          "s3:GetObjectTagging",
          "s3:PutObjectTagging"
        ],
        "Resource": [
          "arn:aws:s3:::destination-bucket",
          "arn:aws:s3:::destination-bucket/*"
        ]
      }
    ]
  }'
```

## Step 2: Cross-Account Setup

If your source and destination are in different AWS accounts, you need additional bucket policies. On the source bucket (Account A), add a policy allowing the DataSync role from Account B:

```bash
# Run this in Account A - add bucket policy to source bucket
aws s3api put-bucket-policy \
  --bucket source-bucket \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "AllowDataSyncCrossAccount",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT_B_ID:role/DataSyncS3ToS3Role"
      },
      "Action": [
        "s3:GetBucketLocation",
        "s3:ListBucket",
        "s3:GetObject",
        "s3:GetObjectTagging"
      ],
      "Resource": [
        "arn:aws:s3:::source-bucket",
        "arn:aws:s3:::source-bucket/*"
      ]
    }]
  }'
```

## Step 3: Create Source and Destination Locations

Set up both S3 locations in DataSync:

```bash
# Create the source S3 location
aws datasync create-location-s3 \
  --s3-bucket-arn "arn:aws:s3:::source-bucket" \
  --s3-storage-class "STANDARD" \
  --subdirectory "/data/2025" \
  --s3-config '{
    "BucketAccessRoleArn": "arn:aws:iam::123456789012:role/DataSyncS3ToS3Role"
  }'

# Create the destination S3 location
aws datasync create-location-s3 \
  --s3-bucket-arn "arn:aws:s3:::destination-bucket" \
  --s3-storage-class "INTELLIGENT_TIERING" \
  --subdirectory "/migrated/2025" \
  --s3-config '{
    "BucketAccessRoleArn": "arn:aws:iam::123456789012:role/DataSyncS3ToS3Role"
  }'
```

Notice that we can set different storage classes for the destination. This is useful when migrating data that should use Intelligent Tiering or Infrequent Access at the destination.

Available storage classes:
- `STANDARD`
- `STANDARD_IA`
- `ONEZONE_IA`
- `INTELLIGENT_TIERING`
- `GLACIER_INSTANT_RETRIEVAL`
- `GLACIER`
- `DEEP_ARCHIVE`

## Step 4: Create the Transfer Task

Now create a task that connects the source and destination:

```bash
# Create the DataSync task
aws datasync create-task \
  --source-location-arn "arn:aws:datasync:us-east-1:123456789012:location/loc-source123" \
  --destination-location-arn "arn:aws:datasync:us-east-1:123456789012:location/loc-dest456" \
  --name "s3-to-s3-annual-archive" \
  --options '{
    "VerifyMode": "ONLY_FILES_TRANSFERRED",
    "OverwriteMode": "ALWAYS",
    "PreserveDeletedFiles": "REMOVE",
    "TransferMode": "CHANGED",
    "ObjectTags": "PRESERVE",
    "LogLevel": "TRANSFER",
    "BytesPerSecond": -1
  }' \
  --cloud-watch-log-group-arn "arn:aws:logs:us-east-1:123456789012:log-group:/aws/datasync:*"
```

Setting `PreserveDeletedFiles` to `REMOVE` means if a file is deleted from the source, it gets removed from the destination too. This creates a true sync. Use `PRESERVE` if you want the destination to be append-only.

## Step 5: Add Filters for Selective Transfer

If you only want to copy certain files:

```bash
# Update the task with filters
aws datasync update-task \
  --task-arn "arn:aws:datasync:us-east-1:123456789012:task/task-0123456789abcdef0" \
  --includes '[
    {"FilterType": "SIMPLE_PATTERN", "Value": "/logs/2025/*|/reports/2025/*"}
  ]' \
  --excludes '[
    {"FilterType": "SIMPLE_PATTERN", "Value": "*.tmp|*.log.gz"}
  ]'
```

Filters support glob patterns with `*` and `|` for multiple patterns. The path patterns are relative to the subdirectory you specified in the location.

## Step 6: Execute and Monitor

Run the transfer:

```bash
# Start the task
EXEC_ARN=$(aws datasync start-task-execution \
  --task-arn "arn:aws:datasync:us-east-1:123456789012:task/task-0123456789abcdef0" \
  --query 'TaskExecutionArn' \
  --output text)

# Poll for status
aws datasync describe-task-execution \
  --task-execution-arn "$EXEC_ARN" \
  --query '{
    Status: Status,
    BytesTransferred: BytesTransferred,
    FilesTransferred: FilesTransferred,
    Throughput: Result.TotalDuration
  }'
```

For large transfers, you can watch the progress update over time:

```bash
# Quick status check script
while true; do
  STATUS=$(aws datasync describe-task-execution \
    --task-execution-arn "$EXEC_ARN" \
    --query 'Status' --output text)

  echo "$(date): Status = $STATUS"

  if [ "$STATUS" = "SUCCESS" ] || [ "$STATUS" = "ERROR" ]; then
    break
  fi

  sleep 60
done
```

## Step 7: Schedule Regular Transfers

Set up a recurring schedule for ongoing sync:

```bash
# Create an EventBridge rule for weekly transfers
aws events put-rule \
  --name "WeeklyS3Sync" \
  --schedule-expression "cron(0 3 ? * SUN *)" \
  --state ENABLED \
  --description "Weekly S3-to-S3 sync via DataSync"

# Create the IAM role for EventBridge to invoke DataSync
aws iam create-role \
  --role-name EventBridgeDataSyncRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "events.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

aws iam put-role-policy \
  --role-name EventBridgeDataSyncRole \
  --policy-name InvokeDataSync \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "datasync:StartTaskExecution",
      "Resource": "arn:aws:datasync:us-east-1:123456789012:task/task-0123456789abcdef0"
    }]
  }'

# Add the DataSync task as the EventBridge target
aws events put-targets \
  --rule "WeeklyS3Sync" \
  --targets '[{
    "Id": "datasync-weekly",
    "Arn": "arn:aws:datasync:us-east-1:123456789012:task/task-0123456789abcdef0",
    "RoleArn": "arn:aws:iam::123456789012:role/EventBridgeDataSyncRole"
  }]'
```

## Cross-Region Considerations

When transferring between S3 buckets in different regions, keep in mind:

- **Data transfer costs**: Cross-region transfer incurs AWS data transfer charges ($0.01-0.02 per GB depending on regions).
- **Latency**: The transfer will naturally take longer due to geographic distance.
- **Location**: Create the DataSync task in the same region as the destination bucket for best performance.

```bash
# Create the task in the destination region
# Source location can reference a bucket in another region
aws datasync create-location-s3 \
  --region us-west-2 \
  --s3-bucket-arn "arn:aws:s3:::source-bucket-east" \
  --s3-config '{
    "BucketAccessRoleArn": "arn:aws:iam::123456789012:role/DataSyncS3ToS3Role"
  }'
```

## Performance Tips

DataSync for S3-to-S3 transfers automatically optimizes parallelism and chunk sizes. But here are a few things you can do to help:

1. **Avoid tiny files**: Lots of very small files (under 1 KB) slow down any transfer tool because the overhead per object becomes significant.
2. **Use CHANGED mode**: After the initial full copy, subsequent runs only transfer modified objects - much faster.
3. **Don't throttle unless needed**: Leave BytesPerSecond at -1 to let DataSync use maximum throughput.

DataSync takes the pain out of S3-to-S3 transfers, especially at scale. Set it up once, and it reliably handles the rest.
