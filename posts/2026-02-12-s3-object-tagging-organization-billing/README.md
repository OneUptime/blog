# How to Set Up S3 Object Tagging for Organization and Billing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Cost Management, Tagging

Description: Learn how to use S3 object tagging to organize data, control access, manage lifecycle policies, and allocate storage costs across teams and projects.

---

S3 object tags are key-value pairs you attach to individual objects. They might seem like a minor feature, but they unlock powerful capabilities for cost allocation, lifecycle management, access control, and data organization. Each object can have up to 10 tags, and once you start using them consistently, they'll change how you manage your S3 data.

## Why Object Tags Matter

Tags let you answer questions that prefixes alone can't:

- "How much storage is Team Alpha using across all buckets?"
- "Which objects are classified as PII and need special retention?"
- "What's our S3 cost per project?"
- "Which objects should transition to Glacier after 90 days?"

Prefixes give you folder-like organization. Tags give you metadata-based organization that cuts across the prefix hierarchy.

## Adding Tags to Objects

You can tag objects at upload time or add tags to existing objects.

Tag an object during upload.

```bash
# Upload with tags
aws s3api put-object \
  --bucket my-data-bucket \
  --key reports/q4-2025.pdf \
  --body q4-2025.pdf \
  --tagging "department=finance&project=quarterly-reports&classification=internal"
```

Add or update tags on an existing object.

```bash
# Set tags on an existing object (replaces all existing tags)
aws s3api put-object-tagging \
  --bucket my-data-bucket \
  --key reports/q4-2025.pdf \
  --tagging '{
    "TagSet": [
      { "Key": "department", "Value": "finance" },
      { "Key": "project", "Value": "quarterly-reports" },
      { "Key": "classification", "Value": "internal" },
      { "Key": "retention", "Value": "7-years" }
    ]
  }'
```

Read tags from an object.

```bash
# Get tags for an object
aws s3api get-object-tagging \
  --bucket my-data-bucket \
  --key reports/q4-2025.pdf
```

## Tagging at Scale with S3 Batch Operations

Tagging objects one at a time doesn't scale. If you need to tag millions of objects, use S3 Batch Operations.

First, create a CSV manifest listing the objects to tag.

```csv
my-data-bucket,reports/q1-2025.pdf
my-data-bucket,reports/q2-2025.pdf
my-data-bucket,reports/q3-2025.pdf
my-data-bucket,reports/q4-2025.pdf
```

Upload the manifest and create a batch job.

```bash
# Create a batch tagging job
aws s3control create-job \
  --account-id 123456789012 \
  --operation '{
    "S3PutObjectTagging": {
      "TagSet": [
        { "Key": "department", "Value": "finance" },
        { "Key": "status", "Value": "archived" }
      ]
    }
  }' \
  --manifest '{
    "Spec": {
      "Format": "S3BatchOperations_CSV_20180820",
      "Fields": ["Bucket", "Key"]
    },
    "Location": {
      "ObjectArn": "arn:aws:s3:::manifest-bucket/tag-manifest.csv",
      "ETag": "MANIFEST_ETAG"
    }
  }' \
  --report '{
    "Bucket": "arn:aws:s3:::manifest-bucket",
    "Prefix": "batch-tag-report",
    "Format": "Report_CSV_20180820",
    "Enabled": true,
    "ReportScope": "AllTasks"
  }' \
  --priority 10 \
  --role-arn arn:aws:iam::123456789012:role/S3BatchRole \
  --confirmation-required
```

## Tagging with Python (Boto3)

For programmatic tagging in applications.

```python
import boto3

s3 = boto3.client('s3')

def tag_object(bucket, key, tags):
    """
    Add tags to an S3 object.
    tags should be a dict like {'department': 'engineering', 'env': 'prod'}
    """
    tag_set = [{'Key': k, 'Value': v} for k, v in tags.items()]

    s3.put_object_tagging(
        Bucket=bucket,
        Key=key,
        Tagging={'TagSet': tag_set}
    )


def tag_objects_by_prefix(bucket, prefix, tags):
    """Tag all objects under a prefix."""
    paginator = s3.get_paginator('list_objects_v2')

    count = 0
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get('Contents', []):
            tag_object(bucket, obj['Key'], tags)
            count += 1
            if count % 100 == 0:
                print(f"Tagged {count} objects...")

    print(f"Done. Tagged {count} objects.")


# Tag all objects in the uploads prefix
tag_objects_by_prefix(
    'my-data-bucket',
    'uploads/2026/',
    {
        'year': '2026',
        'department': 'engineering',
        'data-classification': 'internal'
    }
)
```

## Tag-Based Lifecycle Policies

This is one of the most powerful uses of tags. Create lifecycle rules that target objects based on tags rather than prefixes.

Move objects tagged with `archive=true` to Glacier after 30 days.

```bash
# Lifecycle rule based on object tags
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-data-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "ArchiveTaggedObjects",
        "Status": "Enabled",
        "Filter": {
          "Tag": {
            "Key": "archive",
            "Value": "true"
          }
        },
        "Transitions": [
          {
            "Days": 30,
            "StorageClass": "GLACIER"
          }
        ]
      },
      {
        "ID": "DeleteTempObjects",
        "Status": "Enabled",
        "Filter": {
          "Tag": {
            "Key": "lifecycle",
            "Value": "temp"
          }
        },
        "Expiration": {
          "Days": 7
        }
      }
    ]
  }'
```

You can combine prefix and tag filters for even more specific rules.

```json
{
  "ID": "ArchiveOldFinanceReports",
  "Status": "Enabled",
  "Filter": {
    "And": {
      "Prefix": "reports/",
      "Tags": [
        { "Key": "department", "Value": "finance" },
        { "Key": "status", "Value": "final" }
      ]
    }
  },
  "Transitions": [
    {
      "Days": 90,
      "StorageClass": "GLACIER_IR"
    }
  ]
}
```

## Tag-Based Access Control

Control who can access objects based on their tags. This is called Attribute-Based Access Control (ABAC).

Only allow users from the finance department to access objects tagged with `department=finance`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-data-bucket/*",
      "Condition": {
        "StringEquals": {
          "s3:ExistingObjectTag/department": "${aws:PrincipalTag/department}"
        }
      }
    }
  ]
}
```

This dynamically matches the object's department tag against the user's department tag. No need to maintain separate policies per team.

## Cost Allocation with Tags

S3 cost allocation tags let you break down your S3 bill by tag. This requires activating the tags in the Billing console.

First, make sure you're tagging objects consistently. Then activate the tag keys in AWS Cost Explorer.

```bash
# You can activate cost allocation tags via the CLI
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status '[
    {"TagKey": "department", "Status": "Active"},
    {"TagKey": "project", "Status": "Active"},
    {"TagKey": "environment", "Status": "Active"}
  ]'
```

After activation (it takes 24 hours to take effect), you can filter your S3 costs by these tags in Cost Explorer. This lets you answer questions like "How much is the marketing team spending on S3?" or "What's the storage cost for Project Phoenix?"

## S3 Storage Lens and Tags

S3 Storage Lens can aggregate metrics by object tags, giving you visibility into how different tagged categories use storage.

```bash
# Create a Storage Lens configuration with tag grouping
aws s3control put-storage-lens-configuration \
  --account-id 123456789012 \
  --config-id tag-analysis \
  --storage-lens-configuration '{
    "Id": "tag-analysis",
    "IsEnabled": true,
    "AccountLevel": {
      "BucketLevel": {
        "ActivityMetrics": { "IsEnabled": true },
        "PrefixLevel": {
          "StorageMetrics": { "IsEnabled": true }
        }
      }
    },
    "DataExport": {
      "S3BucketDestination": {
        "Format": "CSV",
        "OutputSchemaVersion": "V_1",
        "AccountId": "123456789012",
        "Arn": "arn:aws:s3:::storage-lens-output"
      }
    }
  }'
```

## Tagging Strategy Best Practices

1. **Define a tagging standard** before you start. Document required tags, allowed values, and naming conventions.
2. **Keep tag keys lowercase** with hyphens: `data-classification`, not `DataClassification`.
3. **Use consistent values** - "production", not sometimes "prod" and sometimes "production".
4. **Enforce tagging with SCP or bucket policies** that deny untagged uploads.
5. **Audit tags regularly** to find objects missing required tags.

Enforce tagging by denying uploads without required tags.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RequireTags",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-data-bucket/*",
      "Condition": {
        "Null": {
          "s3:RequestObjectTag/department": "true"
        }
      }
    }
  ]
}
```

This denies any upload that doesn't include a `department` tag.

For monitoring your tagging compliance and storage costs, integrate with [OneUptime](https://oneuptime.com) to build dashboards that track tagged vs untagged objects and cost breakdowns by tag. For more on optimizing S3 costs, see our guide on [S3 storage class analysis](https://oneuptime.com/blog/post/s3-storage-class-analysis-optimize-costs/view).
