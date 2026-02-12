# How to Empty and Delete an S3 Bucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CLI

Description: Step-by-step guide to emptying and deleting an S3 bucket, including handling versioned objects, replication rules, and common errors that prevent bucket deletion.

---

You'd think deleting an S3 bucket would be straightforward. And it is, until it isn't. S3 won't let you delete a bucket unless it's completely empty, and "empty" means no objects, no object versions, no delete markers, and no incomplete multipart uploads. If versioning is involved, this gets complicated fast.

Let's walk through the process properly, handling all the edge cases.

## Quick Delete for Simple Buckets

If your bucket doesn't have versioning and contains a manageable number of objects, this is all you need.

```bash
# Empty the bucket
aws s3 rm s3://my-old-bucket --recursive

# Delete the bucket
aws s3 rb s3://my-old-bucket
```

Or combine both steps.

```bash
# Empty and delete in one command
aws s3 rb s3://my-old-bucket --force
```

The `--force` flag empties the bucket first, then deletes it. However, it doesn't handle versioned objects. If your bucket has versioning enabled, this command will fail after creating delete markers instead of actually removing objects.

## Deleting a Versioned Bucket

When versioning is enabled (or was ever enabled), you need to delete all object versions and delete markers before the bucket can be removed.

First check the versioning status.

```bash
# Check if versioning is or was enabled
aws s3api get-bucket-versioning --bucket my-old-bucket
```

If the output shows `Enabled` or `Suspended`, you have versions to deal with.

Use this Python script to clean everything out.

```python
import boto3

def empty_and_delete_bucket(bucket_name):
    """
    Completely empties a bucket (including all versions
    and delete markers) and then deletes the bucket.
    """
    s3 = boto3.resource('s3')
    bucket = s3.Bucket(bucket_name)

    print(f"Emptying bucket: {bucket_name}")

    # Delete all object versions
    bucket.object_versions.all().delete()
    print("All versions and delete markers deleted.")

    # Abort any incomplete multipart uploads
    client = boto3.client('s3')
    uploads = client.list_multipart_uploads(Bucket=bucket_name)
    for upload in uploads.get('Uploads', []):
        client.abort_multipart_upload(
            Bucket=bucket_name,
            Key=upload['Key'],
            UploadId=upload['UploadId']
        )
    print("Multipart uploads cleaned up.")

    # Delete the bucket
    bucket.delete()
    print(f"Bucket {bucket_name} deleted successfully.")


if __name__ == '__main__':
    empty_and_delete_bucket('my-old-bucket')
```

The `bucket.object_versions.all().delete()` line is the key. It handles both object versions and delete markers in batch, making it much faster than individual API calls.

## Handling Large Buckets

For buckets with millions of objects, the Python approach above might time out or run out of memory. Use a lifecycle rule to expire objects first, then delete the bucket after.

Set a lifecycle rule that expires everything.

```bash
# Set lifecycle rule to expire all objects in 1 day
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-old-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "ExpireEverything",
        "Status": "Enabled",
        "Filter": {},
        "Expiration": {
          "Days": 1
        },
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 1
        },
        "AbortIncompleteMultipartUpload": {
          "DaysAfterInitiation": 1
        }
      }
    ]
  }'
```

Wait for S3 to process the lifecycle rules (this can take up to 48 hours). Then check if the bucket is empty and delete it.

```bash
# Check if any objects remain
aws s3api list-object-versions --bucket my-old-bucket --max-items 1

# If empty, delete the bucket
aws s3 rb s3://my-old-bucket
```

## Common Errors and How to Fix Them

### "BucketNotEmpty" Error

This is the most common one. It means there are still objects, versions, or delete markers in the bucket.

```bash
# Check for remaining object versions
aws s3api list-object-versions --bucket my-old-bucket --max-items 10

# Check for incomplete multipart uploads
aws s3api list-multipart-uploads --bucket my-old-bucket
```

### "OperationAborted: A conflicting conditional operation is in progress"

This happens when multiple operations are trying to modify the bucket simultaneously. Wait a few seconds and retry.

### Bucket Policy Preventing Deletion

If the bucket has a policy that denies `s3:DeleteBucket`, you need to remove it first.

```bash
# Remove the bucket policy
aws s3api delete-bucket-policy --bucket my-old-bucket

# Then delete the bucket
aws s3 rb s3://my-old-bucket
```

### Replication Configuration Blocking Deletion

If the bucket is a source for cross-region replication, you need to remove the replication configuration first.

```bash
# Remove replication configuration
aws s3api delete-bucket-replication --bucket my-old-bucket
```

### Object Lock Preventing Deletion

If the bucket has Object Lock enabled with retention periods, you can't delete objects until the retention period expires. There's no workaround for governance mode unless you have the `s3:BypassGovernanceRetention` permission. For compliance mode, you simply have to wait.

```bash
# Check object lock configuration
aws s3api get-object-lock-configuration --bucket my-old-bucket

# For governance mode, bypass with special header
aws s3api delete-object \
  --bucket my-old-bucket \
  --key locked-file.txt \
  --version-id VERSION_ID \
  --bypass-governance-retention
```

## Deleting Multiple Buckets

If you need to clean up many buckets at once, script it.

```bash
#!/bin/bash
# delete-buckets.sh - Delete multiple buckets by prefix

PREFIX="temp-"

# List buckets matching prefix
BUCKETS=$(aws s3api list-buckets \
  --query "Buckets[?starts_with(Name, '${PREFIX}')].Name" \
  --output text)

for BUCKET in $BUCKETS; do
  echo "Processing: $BUCKET"

  # Suspend versioning first
  aws s3api put-bucket-versioning \
    --bucket "$BUCKET" \
    --versioning-configuration Status=Suspended 2>/dev/null

  # Remove all objects and versions
  aws s3 rm "s3://$BUCKET" --recursive 2>/dev/null

  # Use Python one-liner to delete versions
  python3 -c "
import boto3
s3 = boto3.resource('s3')
s3.Bucket('$BUCKET').object_versions.all().delete()
"

  # Delete the bucket
  aws s3 rb "s3://$BUCKET"
  echo "Deleted: $BUCKET"
done
```

## Pre-Deletion Checklist

Before you delete a bucket, make sure you've covered these items:

1. **Back up any data you need** - Deletion is permanent
2. **Check for applications using the bucket** - Search your configs, environment variables, and CloudFormation/Terraform stacks
3. **Remove replication configurations** from both source and destination
4. **Remove event notifications** - Lambda functions or SQS queues that depend on this bucket will start failing
5. **Update DNS** if you're using the bucket for static website hosting
6. **Note the bucket name** - Someone else can claim it after deletion

That last point is worth emphasizing. S3 bucket names are globally unique. Once you delete a bucket, that name goes back into the global pool. Someone else could create a bucket with the same name, which could be a security issue if your applications still reference it.

## Using CloudFormation or Terraform

If the bucket was created by infrastructure-as-code, you'll want to use those tools for deletion too.

For CloudFormation, you need a custom resource to empty the bucket before the stack can delete it.

For Terraform, set `force_destroy = true` on the bucket resource.

```hcl
resource "aws_s3_bucket" "example" {
  bucket        = "my-old-bucket"
  force_destroy = true  # Allows terraform destroy to empty and delete
}
```

Without `force_destroy`, `terraform destroy` will fail with a BucketNotEmpty error if the bucket contains objects. For more on managing S3 with Terraform, see our post on [using S3 as a Terraform state backend](https://oneuptime.com/blog/post/s3-terraform-state-backend/view).

Monitor your S3 bucket inventory and get alerts when buckets are created or deleted unexpectedly using [OneUptime](https://oneuptime.com).
