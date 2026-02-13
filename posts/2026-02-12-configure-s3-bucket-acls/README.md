# How to Configure S3 Bucket ACLs (and Why You Should Avoid Them)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Security

Description: Understand S3 Access Control Lists, how they work, when they might still be needed, and why bucket policies are almost always the better choice.

---

S3 Access Control Lists (ACLs) are the original access control mechanism for S3, dating back to 2006. They predate IAM policies and bucket policies, and AWS has been actively discouraging their use for years. In fact, since April 2023, all new S3 buckets have ACLs disabled by default.

So why write about them? Because you'll still encounter ACLs in legacy systems, cross-account migration scenarios, and occasionally in situations where they're genuinely the simplest tool for the job. Understanding how they work helps you make the right decision about when to use them versus bucket policies.

## What Are S3 ACLs?

An ACL is a set of grants that defines which AWS accounts or predefined groups have which permissions on a bucket or object. Each grant specifies a grantee and a permission.

There are five permission types:
- **READ** - List objects in a bucket, or read an object's data
- **WRITE** - Create, overwrite, and delete objects in a bucket
- **READ_ACP** - Read the ACL
- **WRITE_ACP** - Write the ACL
- **FULL_CONTROL** - All of the above

And there are three types of grantees:
- **Canonical user ID** - A specific AWS account
- **Predefined groups** - AllUsers (public) or AuthenticatedUsers (any AWS account)
- **Log delivery group** - For S3 access logging

## The Default: ACLs Disabled

Since April 2023, new buckets use the "BucketOwnerEnforced" setting, which disables ACLs entirely. The bucket owner owns all objects, period.

Check your bucket's ownership setting:

```bash
# Check if ACLs are enabled or disabled
aws s3api get-bucket-ownership-controls \
    --bucket my-bucket

# Output when ACLs are disabled (default):
# {
#     "OwnershipControls": {
#         "Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]
#     }
# }
```

If you see `BucketOwnerEnforced`, ACLs are disabled and all the ACL-related commands below won't work on that bucket. This is the recommended state.

## Enabling ACLs (When You Must)

If you have a legitimate reason to use ACLs, you need to change the ownership setting first.

Enable ACLs on a bucket:

```bash
# Enable ACLs with bucket owner preferred
# (bucket owner automatically owns new objects)
aws s3api put-bucket-ownership-controls \
    --bucket my-bucket \
    --ownership-controls '{"Rules": [{"ObjectOwnership": "BucketOwnerPreferred"}]}'

# Or enable with object writer ownership
# (the uploading account owns the objects)
aws s3api put-bucket-ownership-controls \
    --bucket my-bucket \
    --ownership-controls '{"Rules": [{"ObjectOwnership": "ObjectWriter"}]}'
```

The difference between the two:
- **BucketOwnerPreferred** - If the uploader includes the `bucket-owner-full-control` canned ACL, the bucket owner gets ownership. Otherwise, the uploader retains ownership.
- **ObjectWriter** - The account that uploads the object always owns it. This is the old behavior.

## Viewing ACLs

Check the current ACL on a bucket or object:

```bash
# View bucket ACL
aws s3api get-bucket-acl --bucket my-bucket

# View object ACL
aws s3api get-object-acl --bucket my-bucket --key data/report.csv

# The output shows grants like:
# {
#     "Owner": {"ID": "canonical-user-id"},
#     "Grants": [
#         {
#             "Grantee": {"Type": "CanonicalUser", "ID": "canonical-user-id"},
#             "Permission": "FULL_CONTROL"
#         }
#     ]
# }
```

## Setting ACLs with Canned ACLs

Canned ACLs are predefined ACL configurations. They're the simplest way to set ACLs.

Apply canned ACLs:

```bash
# Private - only the owner has full control (default)
aws s3api put-bucket-acl --bucket my-bucket --acl private

# Public read - everyone can read, owner has full control
# WARNING: This makes your bucket publicly readable!
aws s3api put-bucket-acl --bucket my-bucket --acl public-read

# Authenticated read - any authenticated AWS user can read
aws s3api put-bucket-acl --bucket my-bucket --acl authenticated-read

# Log delivery write - allows S3 log delivery group to write
aws s3api put-bucket-acl --bucket my-bucket --acl log-delivery-write

# Set ACL on a specific object
aws s3api put-object-acl --bucket my-bucket --key file.txt --acl public-read

# Upload with a canned ACL
aws s3 cp myfile.txt s3://my-bucket/ --acl bucket-owner-full-control
```

## Setting Custom ACLs

For more granular control, set custom grants:

```bash
# Grant read access to a specific account
aws s3api put-bucket-acl \
    --bucket my-bucket \
    --grant-read "id=canonical-user-id-of-other-account"

# Grant full control to another account while keeping your own access
aws s3api put-bucket-acl \
    --bucket my-bucket \
    --grant-full-control "id=your-canonical-user-id" \
    --grant-read "id=other-account-canonical-id"

# Find your canonical user ID
aws s3api list-buckets --query "Owner.ID" --output text
```

## Setting ACLs on Upload

When uploading objects to another account's bucket (cross-account), you should include the `bucket-owner-full-control` ACL.

Upload with ACL for cross-account scenarios:

```bash
# Upload to another account's bucket with proper ownership
aws s3 cp myfile.txt s3://other-account-bucket/shared/ \
    --acl bucket-owner-full-control

# Sync with ACL
aws s3 sync ./data/ s3://other-account-bucket/data/ \
    --acl bucket-owner-full-control
```

## Why ACLs Are Problematic

Here's why AWS recommends disabling ACLs:

**1. Object-level ownership confusion.** With ACLs enabled, different objects in the same bucket can be owned by different accounts. The bucket owner might not be able to read or delete objects uploaded by other accounts.

```bash
# This scenario causes problems:
# Account A owns the bucket
# Account B uploads a file without bucket-owner-full-control
# Account A can't read or delete that file!
# It's visible in listing but inaccessible
```

**2. ACLs are limited.** You can only grant permissions to AWS accounts, not to IAM users or roles. You can't use conditions like IP restrictions or VPC endpoints. For anything beyond the basics, you need bucket policies anyway.

**3. ACLs are hard to audit.** Each object can have its own ACL. In a bucket with millions of objects, tracking who has access to what becomes nearly impossible.

**4. Public access risks.** The `public-read` and `public-read-write` canned ACLs are the most common cause of S3 data breaches. With ACLs disabled, these can't be applied.

## The Migration Path: From ACLs to Bucket Policies

If you have existing buckets using ACLs, here's how to migrate to bucket policies.

Migrate from ACLs to bucket policies:

```bash
# Step 1: Identify what ACLs are currently granting
aws s3api get-bucket-acl --bucket my-bucket

# Step 2: Create an equivalent bucket policy
# For example, if you were granting read to another account via ACL:
cat > policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "CrossAccountRead",
            "Effect": "Allow",
            "Principal": {"AWS": "arn:aws:iam::111222333444:root"},
            "Action": ["s3:GetObject", "s3:ListBucket"],
            "Resource": [
                "arn:aws:s3:::my-bucket",
                "arn:aws:s3:::my-bucket/*"
            ]
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket my-bucket --policy file://policy.json

# Step 3: Test that the bucket policy works correctly

# Step 4: Disable ACLs
aws s3api put-bucket-ownership-controls \
    --bucket my-bucket \
    --ownership-controls '{"Rules": [{"ObjectOwnership": "BucketOwnerEnforced"}]}'

# Step 5: Verify ACLs are disabled
aws s3api get-bucket-ownership-controls --bucket my-bucket
```

## When ACLs Are Still Useful

Despite the general advice to avoid ACLs, there are a few scenarios where they're still useful:

1. **S3 access logging** - The target bucket for access logs needs the `log-delivery-write` ACL
2. **Legacy applications** that depend on ACL-based access control
3. **Simple cross-account writes** where you just need the bucket owner to have access to uploaded objects

For the access logging case:

```bash
# Enable S3 access logging (requires ACLs on the target bucket)
aws s3api put-bucket-ownership-controls \
    --bucket my-log-bucket \
    --ownership-controls '{"Rules": [{"ObjectOwnership": "BucketOwnerPreferred"}]}'

aws s3api put-bucket-acl \
    --bucket my-log-bucket \
    --acl log-delivery-write

aws s3api put-bucket-logging \
    --bucket my-source-bucket \
    --bucket-logging-status '{
        "LoggingEnabled": {
            "TargetBucket": "my-log-bucket",
            "TargetPrefix": "access-logs/"
        }
    }'
```

## Bottom Line

For new buckets, keep ACLs disabled and use [bucket policies](https://oneuptime.com/blog/post/2026-02-12-set-up-s3-bucket-policies-access-control/view) for access control. They're more flexible, easier to audit, and don't have the object ownership complications that ACLs introduce.

For existing buckets with ACLs, plan a migration to bucket policies. It's usually straightforward - the hardest part is identifying all the ACL grants that need to be replicated as policy statements.

And make sure you've got [public access blocked](https://oneuptime.com/blog/post/2026-02-12-block-public-access-on-s3-buckets/view) on every bucket, regardless of whether you're using ACLs or policies.
