# How to Set Up S3 Batch Operations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, S3, Batch Operation, Bulk Processing, Lambda, Infrastructure as Code

Description: Learn how to set up S3 Batch Operations using OpenTofu to perform large-scale bulk actions on millions of S3 objects including copying, tagging, and running custom Lambda functions.

## Introduction

S3 Batch Operations executes operations on billions of objects in parallel-far faster than iterating through them individually. Common use cases include copying objects across regions, restoring archived objects, updating object tags, ACLs, and running custom Lambda functions against every object.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with S3 Batch Operations and IAM permissions, including `s3:CreateJob` and `iam:PassRole`
- A delivered S3 Inventory report manifest (`manifest.json` and its ETag)

## Step 1: Create IAM Role for Batch Operations

```hcl
# IAM role that S3 Batch Operations assumes to perform actions
data "aws_caller_identity" "current" {}

resource "aws_iam_role" "batch_ops" {
  name = "s3-batch-operations-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "batchoperations.s3.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "batch_ops" {
  name = "batch-operations-policy"
  role = aws_iam_role.batch_ops.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:PutObjectAcl",
          "s3:PutObjectTagging"
        ]
        Resource = "${var.destination_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion",
          "s3:GetObjectAcl",
          "s3:GetObjectTagging",
          "s3:ListBucket"
        ]
        Resource = [
          var.source_bucket_arn,
          "${var.source_bucket_arn}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion"]
        Resource = "${var.manifest_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = "s3:PutObject"
        Resource = "${var.report_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = "lambda:InvokeFunction"
        Resource = var.lambda_function_arn
      }
    ]
  })
}
```

## Step 2: Enable S3 Inventory for the Source Bucket

```hcl
# S3 Inventory generates a manifest for Batch Operations jobs
resource "aws_s3_bucket_policy" "inventory_destination" {
  bucket = var.inventory_bucket_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowS3InventoryDelivery"
        Effect    = "Allow"
        Principal = { Service = "s3.amazonaws.com" }
        Action    = "s3:PutObject"
        Resource  = "${var.inventory_bucket_arn}/inventory/${var.source_bucket_name}/*"
        Condition = {
          ArnLike = {
            "aws:SourceArn" = var.source_bucket_arn
          }
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
            "s3:x-amz-acl"      = "bucket-owner-full-control"
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_inventory" "source" {
  bucket = var.source_bucket_name
  name   = "full-inventory"

  included_object_versions = "Current"  # Or "All" for versioned buckets

  schedule {
    frequency = "Daily"
  }

  destination {
    bucket {
      format     = "CSV"
      bucket_arn = var.inventory_bucket_arn
      prefix     = "inventory/${var.source_bucket_name}"
    }
  }

  optional_fields = [
    "Size", "LastModifiedDate", "StorageClass",
    "ETag", "IsMultipartUploaded", "EncryptionStatus",
    "ObjectLockMode", "ObjectLockRetainUntilDate"
  ]

  depends_on = [aws_s3_bucket_policy.inventory_destination]
}
```

## Step 3: Create a Batch Operations Job

```hcl
# Create the batch job via AWS CLI after S3 has delivered the inventory manifest.json
resource "null_resource" "batch_copy_job" {
  triggers = {
    manifest_key    = var.manifest_key
    manifest_etag   = var.manifest_etag
    source_bucket   = var.source_bucket_arn
    dest_bucket     = var.destination_bucket_arn
  }

  provisioner "local-exec" {
    # For copy jobs, var.region must be the destination bucket's Region.
    command = <<-EOF
      aws s3control create-job \
        --account-id ${data.aws_caller_identity.current.account_id} \
        --manifest '{"Spec":{"Format":"S3InventoryReport_CSV_20161130"},"Location":{"ObjectArn":"${var.manifest_bucket_arn}/${var.manifest_key}","ETag":"${var.manifest_etag}"}}' \
        --operation '{"S3PutObjectCopy":{"TargetResource":"${var.destination_bucket_arn}","StorageClass":"STANDARD_IA"}}' \
        --report '{"Bucket":"${var.report_bucket_arn}","Format":"Report_CSV_20180820","Enabled":true,"Prefix":"batch-reports","ReportScope":"AllTasks"}' \
        --priority 10 \
        --role-arn ${aws_iam_role.batch_ops.arn} \
        --client-request-token ${substr(sha256(join(":", [var.manifest_key, var.manifest_etag, var.destination_bucket_arn])), 0, 64)} \
        --region ${var.region} \
        --no-confirmation-required
    EOF
  }
}
```

## Step 4: Lambda-Based Custom Batch Operation

Give the Lambda function's execution role `s3:PutObjectTagging` permission for the objects it updates. If your manifest includes version IDs, include `s3:PutObjectVersionTagging` as well.

```python
# Lambda function for custom S3 Batch Operations processing
from urllib import parse
import boto3

s3 = boto3.client('s3')

def handler(event, context):
    """Process each object in the batch job."""
    invocation_id = event['invocationId']
    tasks = event['tasks']
    results = []

    for task in tasks:
        task_id = task['taskId']
        bucket = task['s3BucketArn'].split(':')[-1]
        key = parse.unquote_plus(task['s3Key'], encoding='utf-8')
        version_id = task.get('s3VersionId')

        try:
            # Custom processing: tag objects for lifecycle transition
            tagging_request = {
                'Bucket': bucket,
                'Key': key,
                'Tagging': {
                    'TagSet': [
                        {'Key': 'processed', 'Value': 'true'},
                        {'Key': 'processedDate', 'Value': '2026-03-20'}
                    ]
                }
            }
            if version_id not in (None, '', 'null'):
                tagging_request['VersionId'] = version_id

            s3.put_object_tagging(**tagging_request)
            results.append({
                'taskId': task_id,
                'resultCode': 'Succeeded',
                'resultString': 'Tags applied'
            })
        except Exception as e:
            results.append({
                'taskId': task_id,
                'resultCode': 'PermanentFailure',
                'resultString': str(e)
            })

    return {
        'invocationSchemaVersion': event['invocationSchemaVersion'],
        'treatMissingKeysAs': 'PermanentFailure',
        'invocationId': invocation_id,
        'results': results
    }
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Conclusion

S3 Batch Operations enables operations at massive scale that would take weeks using custom scripts in minutes. Use S3 Inventory to generate job manifests automatically, and enable job completion reports to track success rates. For custom processing like encryption re-encryption or metadata updates, Lambda-based jobs provide full flexibility while leveraging S3's managed parallelism.
