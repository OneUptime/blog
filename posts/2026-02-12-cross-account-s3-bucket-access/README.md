# How to Set Up Cross-Account S3 Bucket Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, IAM, Security, Multi-Account

Description: Learn how to configure cross-account S3 bucket access using bucket policies, IAM roles, and resource-based policies for secure multi-account architectures.

---

If you're running workloads across multiple AWS accounts - and honestly, most organizations do these days - you'll eventually need one account to access S3 buckets in another. Maybe your analytics team sits in a separate account from production data. Maybe you've got a shared logging bucket. Whatever the reason, cross-account S3 access is something you need to get right.

There are a few ways to do this. Let's walk through the most common approaches, starting with the simplest.

## Option 1: Bucket Policies

The most straightforward method is adding a bucket policy that grants access to the other account. You don't need to touch IAM roles or anything fancy - just tell the bucket who's allowed in.

Here's a bucket policy that lets Account B (111122223333) read objects from a bucket in Account A.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCrossAccountRead",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:root"
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-shared-bucket",
        "arn:aws:s3:::my-shared-bucket/*"
      ]
    }
  ]
}
```

This grants the entire Account B access. But you still need an IAM policy in Account B that allows the user or role to actually call those S3 actions. Cross-account access requires both sides to say "yes."

Here's the IAM policy you'd attach in Account B.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-shared-bucket",
        "arn:aws:s3:::my-shared-bucket/*"
      ]
    }
  ]
}
```

Both policies must exist. If either one is missing, access gets denied.

## Option 2: IAM Role Assumption

Bucket policies work fine for simple cases, but they can get messy when you're dealing with many accounts or need more granular control. A better pattern for complex setups is using IAM roles with cross-account assume role.

The idea is simple: Account A creates an IAM role that Account B can assume. That role has permissions to access the S3 bucket. Account B's users assume the role when they need access.

First, create the trust policy for the role in Account A.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:role/DataAnalyticsRole"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "shared-data-access-2024"
        }
      }
    }
  ]
}
```

The `ExternalId` condition adds an extra layer of security against confused deputy attacks. Always use it for cross-account role assumptions.

Now attach a permissions policy to this role that grants S3 access.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-shared-bucket",
        "arn:aws:s3:::my-shared-bucket/*"
      ]
    }
  ]
}
```

From Account B, users assume the role like this.

```bash
# Assume the cross-account role and get temporary credentials
aws sts assume-role \
  --role-arn arn:aws:iam::999988887777:role/CrossAccountS3Role \
  --role-session-name my-session \
  --external-id shared-data-access-2024
```

Then use the returned temporary credentials to access the bucket.

## Option 3: S3 Access Points

For really complex multi-account setups, S3 Access Points give you a cleaner way to manage permissions. Each access point gets its own policy, so you can create one per consuming account.

Here's how to create an access point with cross-account access.

```bash
# Create an access point in Account A for Account B
aws s3control create-access-point \
  --name analytics-team-access \
  --account-id 999988887777 \
  --bucket my-shared-bucket
```

Then attach a policy to the access point.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::111122223333:root"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:us-east-1:999988887777:accesspoint/analytics-team-access/object/*"
    }
  ]
}
```

Access points are especially useful when you've got multiple teams or accounts that need different levels of access to the same bucket.

## Using AWS Organizations for Simplified Access

If your accounts are part of an AWS Organization, you can use organization-level conditions in your bucket policies. This is cleaner than listing individual account IDs.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOrgAccess",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-shared-bucket/*",
      "Condition": {
        "StringEquals": {
          "aws:PrincipalOrgID": "o-abc123def4"
        }
      }
    }
  ]
}
```

This grants read access to every account in your organization. It's a single line change when new accounts join - they automatically get access.

## Handling Encryption

Cross-account access gets trickier when your bucket uses KMS encryption. The accessing account needs both S3 permissions AND KMS key permissions.

If the bucket uses SSE-KMS, you'll need to update the KMS key policy too.

```json
{
  "Sid": "AllowCrossAccountDecrypt",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::111122223333:role/DataAnalyticsRole"
  },
  "Action": [
    "kms:Decrypt",
    "kms:GenerateDataKey"
  ],
  "Resource": "*"
}
```

Forgetting the KMS piece is one of the most common reasons cross-account access fails. If you're getting access denied errors even though your S3 policies look right, check the encryption configuration first. For more on troubleshooting these kinds of issues, check out our post on [troubleshooting S3 403 errors](https://oneuptime.com/blog/post/troubleshoot-s3-403-forbidden-access-denied/view).

## Object Ownership Gotcha

There's a subtle issue with cross-account PutObject operations. By default, when Account B uploads an object to Account A's bucket, Account B owns that object - not Account A. This means Account A can't even read it without special permissions.

The fix is to use S3 Object Ownership settings. Set the bucket to "Bucket owner enforced" to disable ACLs entirely and ensure the bucket owner always owns all objects.

```bash
# Set bucket ownership controls
aws s3api put-bucket-ownership-controls \
  --bucket my-shared-bucket \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

This eliminates the ownership problem entirely. It's the recommended approach for any new cross-account setup.

## Monitoring Cross-Account Access

Once you've set up cross-account access, monitor it. Enable S3 server access logging or CloudTrail data events to track who's accessing what.

```bash
# Enable CloudTrail data events for the bucket
aws cloudtrail put-event-selectors \
  --trail-name my-trail \
  --event-selectors '[{
    "ReadWriteType": "All",
    "IncludeManagementEvents": false,
    "DataResources": [{
      "Type": "AWS::S3::Object",
      "Values": ["arn:aws:s3:::my-shared-bucket/"]
    }]
  }]'
```

You can then set up CloudWatch alarms or use a monitoring tool like [OneUptime](https://oneuptime.com) to alert on unexpected access patterns.

## Which Approach Should You Use?

For simple two-account setups, bucket policies are fine. For anything more complex, IAM role assumption gives you better auditability and control. Access points shine when multiple consumers need different access levels. And if you're using AWS Organizations, always add the org condition to your policies.

The key thing is to always follow least privilege. Don't grant `s3:*` when all you need is `s3:GetObject`. And test your setup from the consuming account before calling it done.
