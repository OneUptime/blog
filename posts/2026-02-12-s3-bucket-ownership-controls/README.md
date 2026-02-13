# How to Configure S3 Bucket Ownership Controls

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Security, Access Control

Description: Understand and configure S3 bucket ownership controls to manage object ownership, disable ACLs, and simplify access management in cross-account scenarios.

---

S3 object ownership is one of those things you don't think about until it bites you. Here's the scenario: Account B uploads an object to Account A's bucket. By default, Account B owns that object - not Account A. Account A can't even read it without Account B explicitly granting access through ACLs.

This is confusing, error-prone, and has caused countless support tickets. S3 Bucket Ownership Controls fix this by letting the bucket owner take ownership of all objects regardless of who uploaded them.

## Understanding the Problem

In the pre-ownership-controls world, S3 had two access control mechanisms running in parallel:

1. **IAM policies and bucket policies** - The modern way
2. **ACLs (Access Control Lists)** - The legacy way

ACLs are object-level permissions that override bucket policies in many cases. When someone uploads an object with `bucket-owner-full-control` ACL, the bucket owner gets access. Without it, the uploader keeps exclusive ownership.

This dual system created confusion. AWS's recommendation is now clear: disable ACLs entirely and use policies for everything.

## Ownership Control Options

S3 offers three settings for ownership controls:

### 1. Bucket owner enforced (Recommended)

ACLs are disabled. The bucket owner automatically owns all objects. All access is managed through policies.

```bash
# Set bucket owner enforced - disables ACLs
aws s3api put-bucket-ownership-controls \
  --bucket my-bucket \
  --ownership-controls '{
    "Rules": [
      {
        "ObjectOwnership": "BucketOwnerEnforced"
      }
    ]
  }'
```

### 2. Bucket owner preferred

ACLs are still active, but when objects are uploaded with the `bucket-owner-full-control` ACL, the bucket owner takes ownership.

```bash
# Set bucket owner preferred
aws s3api put-bucket-ownership-controls \
  --bucket my-bucket \
  --ownership-controls '{
    "Rules": [
      {
        "ObjectOwnership": "BucketOwnerPreferred"
      }
    ]
  }'
```

### 3. Object writer (Legacy default)

The uploading account owns the object. ACLs are active. This is the old behavior.

```bash
# Set object writer (legacy - not recommended)
aws s3api put-bucket-ownership-controls \
  --bucket my-bucket \
  --ownership-controls '{
    "Rules": [
      {
        "ObjectOwnership": "ObjectWriter"
      }
    ]
  }'
```

## Why "Bucket Owner Enforced" Is the Right Choice

For new buckets (created after April 2023), ACLs are disabled by default. For older buckets, you should actively switch to `BucketOwnerEnforced`. Here's why:

1. **Simpler access management** - One system (policies) instead of two (policies + ACLs)
2. **No ownership confusion** - The bucket owner always owns everything
3. **Cross-account clarity** - Other accounts can write to your bucket, and you automatically own what they write
4. **Compliance** - Easier to audit when there's only one access control mechanism

## Migrating to Bucket Owner Enforced

If you have an existing bucket using ACLs, migrating requires some care.

### Step 1: Audit existing ACLs

Check if any objects have non-default ACLs.

```python
import boto3

s3 = boto3.client('s3')

def audit_acls(bucket_name, prefix=''):
    """Find objects with non-default ACLs."""
    paginator = s3.get_paginator('list_objects_v2')
    non_default = []

    for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
        for obj in page.get('Contents', []):
            try:
                acl = s3.get_object_acl(
                    Bucket=bucket_name,
                    Key=obj['Key']
                )

                # Default ACL has one grant for the owner
                grants = acl['Grants']
                if len(grants) != 1 or grants[0]['Permission'] != 'FULL_CONTROL':
                    non_default.append({
                        'key': obj['Key'],
                        'grants': grants
                    })
            except Exception as e:
                print(f"Error checking {obj['Key']}: {e}")

    return non_default


results = audit_acls('my-bucket')
print(f"Found {len(results)} objects with custom ACLs")
for item in results[:10]:
    print(f"  {item['key']}: {item['grants']}")
```

### Step 2: Update bucket policies to replace ACLs

If you have cross-account access via ACLs, replace it with bucket policies.

For example, if Account B was relying on ACLs for write access, add an explicit bucket policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountWrite",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:role/WriterRole"
      },
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

### Step 3: Update uploaders

Any application that includes ACL headers in PUT requests needs to stop doing that. With `BucketOwnerEnforced`, ACL headers in requests will cause a 400 error.

Remove ACL-related code from your uploads.

```python
# Before (with ACLs)
s3.put_object(
    Bucket='my-bucket',
    Key='data.csv',
    Body=data,
    ACL='bucket-owner-full-control'  # Remove this
)

# After (without ACLs)
s3.put_object(
    Bucket='my-bucket',
    Key='data.csv',
    Body=data
    # No ACL parameter needed
)
```

```bash
# Before (with ACL)
aws s3 cp file.txt s3://my-bucket/ --acl bucket-owner-full-control

# After (without ACL)
aws s3 cp file.txt s3://my-bucket/
```

### Step 4: Enable BucketOwnerEnforced

Once all ACL dependencies are removed, flip the switch.

```bash
# Enable bucket owner enforced
aws s3api put-bucket-ownership-controls \
  --bucket my-bucket \
  --ownership-controls '{
    "Rules": [
      {
        "ObjectOwnership": "BucketOwnerEnforced"
      }
    ]
  }'
```

### Step 5: Verify

Try an upload with an ACL header to confirm it's rejected.

```bash
# This should return a 400 error
aws s3api put-object \
  --bucket my-bucket \
  --key test-acl.txt \
  --body test.txt \
  --acl public-read
```

You should see: `An error occurred (AccessControlListNotSupported)`.

## Block Public Access Settings

Bucket Ownership Controls work alongside S3 Block Public Access. For maximum security, enable both.

```bash
# Block all public access
aws s3api put-public-access-block \
  --bucket my-bucket \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }'
```

## Using Terraform

Configure ownership controls and public access block together.

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-data-bucket"
}

resource "aws_s3_bucket_ownership_controls" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

## Common Issues After Migration

**"AccessControlListNotSupported" errors**: Applications are still sending ACL headers. Update them to remove the ACL parameter.

**Cross-account access breaks**: The other account was relying on ACLs for access. Add a bucket policy to grant the necessary permissions explicitly.

**CloudFormation/Terraform drift**: If your IaC templates include ACL settings, update them to match the new configuration.

## Checking Current Configuration

Verify your bucket's ownership settings at any time.

```bash
# Check ownership controls
aws s3api get-bucket-ownership-controls --bucket my-bucket

# Check public access block
aws s3api get-public-access-block --bucket my-bucket

# Check bucket policy
aws s3api get-bucket-policy --bucket my-bucket
```

For a broader look at S3 security across your organization, consider auditing all buckets periodically. For more on fine-grained access control, see our guide on [S3 IAM policies](https://oneuptime.com/blog/post/2026-02-12-s3-iam-policies-fine-grained-access-control/view).

Monitor your S3 security configuration changes with [OneUptime](https://oneuptime.com) to catch accidental misconfigurations before they become security incidents.
