# How to Fix Error Deleting S3 Bucket BucketNotEmpty

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, S3, Troubleshooting, Infrastructure as Code

Description: Resolve the BucketNotEmpty error when deleting S3 buckets with Terraform by handling objects, versions, delete markers, and incomplete multipart uploads.

---

When Terraform tries to delete an S3 bucket and gets the `BucketNotEmpty` error, it means there are still objects in the bucket. AWS does not let you delete a bucket that contains objects. This sounds simple to fix, but it gets complicated when you factor in versioning, delete markers, and incomplete multipart uploads.

## What the Error Looks Like

```text
Error: error deleting S3 Bucket (my-bucket): BucketNotEmpty:
The bucket you tried to delete is not empty
    status code: 409, request id: abc123-def456
```

## Why This Happens

S3 buckets must be completely empty before they can be deleted. "Empty" means:

- No current objects
- No previous versions of objects (if versioning is enabled)
- No delete markers (if versioning is enabled)
- No incomplete multipart uploads

Terraform does not automatically empty buckets before deleting them (unless you tell it to), so any objects left in the bucket will block deletion.

## Fix 1: Use force_destroy in Terraform

The simplest fix is to enable `force_destroy` on the bucket resource. This tells Terraform to delete all objects (including versions) before deleting the bucket:

```hcl
resource "aws_s3_bucket" "my_bucket" {
  bucket        = "my-bucket-name"
  force_destroy = true  # This will delete all objects when the bucket is destroyed
}
```

If you already have the bucket in your configuration without `force_destroy`, add it and apply before destroying:

```bash
# Step 1: Add force_destroy = true to the bucket resource
# Step 2: Apply to update the bucket
terraform apply

# Step 3: Now destroy will work
terraform destroy
```

**Important:** `force_destroy` will permanently delete all objects and all versions in the bucket. There is no undo. Only use this for buckets where data loss is acceptable.

## Fix 2: Empty the Bucket Manually

If you want to review the contents before deleting, or if you cannot modify the Terraform configuration, empty the bucket manually:

### For Buckets Without Versioning

```bash
# Delete all objects
aws s3 rm s3://my-bucket-name --recursive
```

### For Buckets With Versioning

Versioned buckets are trickier because `aws s3 rm` only creates delete markers; it does not remove previous versions:

```bash
# List all object versions
aws s3api list-object-versions \
  --bucket my-bucket-name \
  --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}'

# Delete all versions
aws s3api list-object-versions \
  --bucket my-bucket-name \
  --output json \
  --query 'Versions[].{Key:Key,VersionId:VersionId}' | \
  jq -c '.[]' | while read -r obj; do
    key=$(echo $obj | jq -r '.Key')
    version=$(echo $obj | jq -r '.VersionId')
    echo "Deleting $key version $version"
    aws s3api delete-object --bucket my-bucket-name --key "$key" --version-id "$version"
  done

# Delete all delete markers
aws s3api list-object-versions \
  --bucket my-bucket-name \
  --output json \
  --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' | \
  jq -c '.[]' | while read -r obj; do
    key=$(echo $obj | jq -r '.Key')
    version=$(echo $obj | jq -r '.VersionId')
    echo "Deleting marker $key version $version"
    aws s3api delete-object --bucket my-bucket-name --key "$key" --version-id "$version"
  done
```

### For Buckets With Incomplete Multipart Uploads

Sometimes there are incomplete multipart uploads that do not show up in normal listings:

```bash
# List incomplete multipart uploads
aws s3api list-multipart-uploads --bucket my-bucket-name

# Abort each one
aws s3api abort-multipart-upload \
  --bucket my-bucket-name \
  --key "object-key" \
  --upload-id "upload-id"
```

## Fix 3: Use a Lifecycle Policy to Expire Objects

If the bucket has a huge number of objects and manual deletion would take too long, add a lifecycle policy that expires everything:

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "expire_all" {
  bucket = aws_s3_bucket.my_bucket.id

  rule {
    id     = "expire-all"
    status = "Enabled"

    expiration {
      days = 1
    }

    noncurrent_version_expiration {
      noncurrent_days = 1
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
```

Wait a day or two for AWS to process the lifecycle rules, then delete the bucket. This approach is useful for buckets with millions of objects where the AWS CLI delete would take hours.

## Fix 4: Use AWS S3 Batch Operations

For very large buckets (billions of objects), AWS S3 Batch Operations can delete objects at scale:

```bash
# Generate an inventory of all objects
# Then create a batch delete job using the inventory
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{"S3DeleteObject":{}}' \
  --manifest '{"Spec":{"Format":"S3InventoryReport_CSV_20161130","Fields":["Bucket","Key"]},"Location":{"ObjectArn":"arn:aws:s3:::inventory-bucket/inventory.csv","ETag":"etag"}}' \
  --report '{"Bucket":"arn:aws:s3:::report-bucket","Format":"Report_CSV_20180820","Enabled":true,"Prefix":"reports"}' \
  --priority 10 \
  --role-arn arn:aws:iam::123456789012:role/batch-operations-role
```

## Handling the Error in CI/CD Pipelines

If your CI/CD pipeline runs `terraform destroy` and hits this error, you can add a pre-destroy step:

```bash
#!/bin/bash
# Pre-destroy script to empty S3 buckets

# Get all S3 buckets managed by Terraform
BUCKETS=$(terraform state list | grep aws_s3_bucket | grep -v "aws_s3_bucket_")

for BUCKET_RESOURCE in $BUCKETS; do
  BUCKET_NAME=$(terraform state show "$BUCKET_RESOURCE" | grep "bucket " | head -1 | awk -F'"' '{print $2}')

  if [ -n "$BUCKET_NAME" ]; then
    echo "Emptying bucket: $BUCKET_NAME"
    aws s3 rm "s3://$BUCKET_NAME" --recursive

    # Also handle versioned objects
    aws s3api list-object-versions --bucket "$BUCKET_NAME" --output json | \
      python3 -c "
import sys, json
data = json.load(sys.stdin)
for version in data.get('Versions', []):
    print(f\"{version['Key']} {version['VersionId']}\")
for marker in data.get('DeleteMarkers', []):
    print(f\"{marker['Key']} {marker['VersionId']}\")
" | while read key version; do
      aws s3api delete-object --bucket "$BUCKET_NAME" --key "$key" --version-id "$version"
    done
  fi
done

# Now run destroy
terraform destroy -auto-approve
```

## Best Practices

### Always Use force_destroy for Non-Production Buckets

```hcl
resource "aws_s3_bucket" "dev_bucket" {
  bucket        = "my-dev-bucket"
  force_destroy = true  # Safe for dev/staging
}

resource "aws_s3_bucket" "prod_bucket" {
  bucket        = "my-prod-bucket"
  force_destroy = false  # Protect production data
}
```

### Use Variables to Control force_destroy

```hcl
variable "environment" {
  type = string
}

resource "aws_s3_bucket" "data" {
  bucket        = "my-data-bucket"
  force_destroy = var.environment != "production"
}
```

### Set Up Lifecycle Rules From the Start

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "cleanup" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "cleanup-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
```

## Monitoring Bucket Cleanup

Use [OneUptime](https://oneuptime.com) to monitor your S3 bucket sizes and object counts. Setting up alerts for unexpectedly large buckets helps you identify cleanup issues before they become blockers for infrastructure teardown.

## Conclusion

The `BucketNotEmpty` error means there are still objects in the bucket that need to be removed before deletion. The quickest fix is `force_destroy = true`, but use it with caution in production environments. For versioned buckets, remember that you need to delete all object versions and delete markers, not just the current objects. For very large buckets, lifecycle policies or S3 Batch Operations are more efficient than CLI-based deletion.
