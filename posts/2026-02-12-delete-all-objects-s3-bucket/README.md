# How to Delete All Objects in an S3 Bucket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CLI

Description: Multiple approaches to deleting all objects in an S3 bucket, including handling versioned objects, delete markers, and large-scale deletions with S3 Batch Operations.

---

Deleting all objects in an S3 bucket sounds simple until you realize your bucket has versioning enabled, a million objects, and delete markers everywhere. The right approach depends on how many objects you have and whether versioning is on. Let's cover all the scenarios.

## The Simple Case: Small Unversioned Bucket

If your bucket has no versioning and a manageable number of objects (under 100,000 or so), the AWS CLI handles it in one command.

```bash
# Delete all objects in a non-versioned bucket
aws s3 rm s3://my-bucket --recursive
```

That's it. The `--recursive` flag iterates through all objects and deletes them. You'll see each deletion printed to the console.

If you want to do a dry run first to see what would be deleted without actually deleting anything:

```bash
# Preview what will be deleted
aws s3 rm s3://my-bucket --recursive --dryrun
```

## Deleting Objects with a Specific Prefix

Maybe you don't want to delete everything - just objects under a certain path.

```bash
# Delete only objects under the 'temp/' prefix
aws s3 rm s3://my-bucket/temp/ --recursive

# Delete only CSV files under 'reports/'
aws s3 rm s3://my-bucket/reports/ --recursive --exclude "*" --include "*.csv"
```

The `--exclude` and `--include` filters let you target specific file patterns.

## The Tricky Case: Versioned Buckets

When versioning is enabled, `aws s3 rm` only creates delete markers. The actual object versions stick around. To truly delete everything, you need to remove every version of every object.

First, check if versioning is enabled.

```bash
# Check versioning status
aws s3api get-bucket-versioning --bucket my-bucket
```

If it says `"Status": "Enabled"` or `"Status": "Suspended"`, you've got versions to deal with.

Here's a script that deletes all object versions and delete markers.

```bash
#!/bin/bash
# delete-all-versions.sh - Deletes all object versions and delete markers

BUCKET="my-bucket"

echo "Deleting all object versions..."
aws s3api list-object-versions \
  --bucket "$BUCKET" \
  --query 'Versions[].{Key: Key, VersionId: VersionId}' \
  --output json | \
  jq -c '.[] | {Key, VersionId}' | \
  while read -r obj; do
    KEY=$(echo "$obj" | jq -r '.Key')
    VERSION_ID=$(echo "$obj" | jq -r '.VersionId')
    echo "Deleting $KEY (version: $VERSION_ID)"
    aws s3api delete-object \
      --bucket "$BUCKET" \
      --key "$KEY" \
      --version-id "$VERSION_ID"
  done

echo "Deleting all delete markers..."
aws s3api list-object-versions \
  --bucket "$BUCKET" \
  --query 'DeleteMarkers[].{Key: Key, VersionId: VersionId}' \
  --output json | \
  jq -c '.[] | {Key, VersionId}' | \
  while read -r obj; do
    KEY=$(echo "$obj" | jq -r '.Key')
    VERSION_ID=$(echo "$obj" | jq -r '.VersionId')
    echo "Deleting marker $KEY (version: $VERSION_ID)"
    aws s3api delete-object \
      --bucket "$BUCKET" \
      --key "$KEY" \
      --version-id "$VERSION_ID"
  done

echo "Done!"
```

## Faster: Batch Delete with the API

The script above makes one API call per object, which is painfully slow for large buckets. The S3 API supports deleting up to 1,000 objects per request. Here's a Python script that uses batch deletions.

```python
import boto3

def delete_all_versions(bucket_name):
    """
    Delete all object versions and delete markers in a bucket.
    Uses batch delete for efficiency (1000 objects per API call).
    """
    s3 = boto3.client('s3')
    paginator = s3.get_paginator('list_object_versions')

    total_deleted = 0

    for page in paginator.paginate(Bucket=bucket_name):
        objects_to_delete = []

        # Collect object versions
        for version in page.get('Versions', []):
            objects_to_delete.append({
                'Key': version['Key'],
                'VersionId': version['VersionId']
            })

        # Collect delete markers
        for marker in page.get('DeleteMarkers', []):
            objects_to_delete.append({
                'Key': marker['Key'],
                'VersionId': marker['VersionId']
            })

        if objects_to_delete:
            # Batch delete up to 1000 objects
            response = s3.delete_objects(
                Bucket=bucket_name,
                Delete={
                    'Objects': objects_to_delete,
                    'Quiet': True
                }
            )

            # Check for errors
            errors = response.get('Errors', [])
            if errors:
                for error in errors:
                    print(f"Error deleting {error['Key']}: {error['Message']}")

            total_deleted += len(objects_to_delete) - len(errors)
            print(f"Deleted {total_deleted} objects so far...")

    print(f"Finished. Total objects deleted: {total_deleted}")


if __name__ == '__main__':
    delete_all_versions('my-bucket')
```

This is significantly faster because it sends 1,000 deletions per API call instead of one.

## Using Lifecycle Rules for Massive Buckets

For buckets with millions or billions of objects, even the batch approach can take a very long time. A smarter approach is to let S3 do the work asynchronously using lifecycle rules.

Set up a lifecycle rule that expires all objects immediately.

```bash
# Create a lifecycle rule to expire all current versions
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "DeleteAllObjects",
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

S3 processes lifecycle rules asynchronously, so it might take a day or two for all objects to be deleted. But you don't have to babysit it and it doesn't cost you anything in API calls.

After everything is deleted, remember to remove the lifecycle rule.

```bash
# Remove the lifecycle configuration after cleanup
aws s3api delete-bucket-lifecycle --bucket my-bucket
```

## Using S3 Batch Operations

For really large-scale deletions where you need more control, S3 Batch Operations can process billions of objects. You provide a manifest (object list) and S3 executes the delete operation across all of them.

First, generate an inventory report for the bucket.

```bash
# Set up S3 Inventory to generate an object list
aws s3api put-bucket-inventory-configuration \
  --bucket my-bucket \
  --id full-inventory \
  --inventory-configuration '{
    "Id": "full-inventory",
    "IsEnabled": true,
    "Destination": {
      "S3BucketDestination": {
        "Bucket": "arn:aws:s3:::inventory-bucket",
        "Format": "CSV",
        "Prefix": "my-bucket-inventory"
      }
    },
    "Schedule": { "Frequency": "Daily" },
    "IncludedObjectVersions": "All",
    "OptionalFields": ["Size", "LastModifiedDate"]
  }'
```

After the inventory is generated (takes up to 48 hours for the first report), create a batch job.

```bash
# Create a batch delete job using the inventory as manifest
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{"S3DeleteObjectTagging": {}}' \
  --manifest '{
    "Spec": {"Format": "S3InventoryReport_CSV_20161130"},
    "Location": {
      "ObjectArn": "arn:aws:s3:::inventory-bucket/my-bucket-inventory/data/manifest.json",
      "ETag": "ETAG_HERE"
    }
  }' \
  --report '{
    "Bucket": "arn:aws:s3:::inventory-bucket",
    "Prefix": "batch-delete-report",
    "Format": "Report_CSV_20180820",
    "Enabled": true,
    "ReportScope": "FailedTasksOnly"
  }' \
  --priority 1 \
  --role-arn arn:aws:iam::123456789012:role/S3BatchRole \
  --confirmation-required
```

## Cleaning Up Incomplete Multipart Uploads

Don't forget about incomplete multipart uploads. They take up space and won't be caught by normal delete operations.

```bash
# List incomplete multipart uploads
aws s3api list-multipart-uploads --bucket my-bucket

# Abort a specific multipart upload
aws s3api abort-multipart-upload \
  --bucket my-bucket \
  --key large-file.zip \
  --upload-id "UPLOAD_ID_HERE"
```

The lifecycle rule approach handles this automatically with `AbortIncompleteMultipartUpload`.

## Safety Tips

1. **Always do a dry run first** when using `aws s3 rm --recursive`
2. **Double-check the bucket name** - there's no undo for non-versioned buckets
3. **Consider enabling MFA Delete** for critical buckets to prevent accidental mass deletions
4. **Use bucket policies** to prevent unauthorized deletions

If you're trying to delete the bucket itself after emptying it, check out our guide on [emptying and deleting an S3 bucket](https://oneuptime.com/blog/post/empty-and-delete-s3-bucket/view).

For monitoring bucket operations and catching accidental deletions early, set up alerts with [OneUptime](https://oneuptime.com) or use the S3 event notifications we covered in our [EventBridge integration guide](https://oneuptime.com/blog/post/s3-bucket-notifications-eventbridge/view).
