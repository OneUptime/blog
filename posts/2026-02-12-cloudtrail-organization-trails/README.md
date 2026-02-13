# How to Set Up CloudTrail Organization Trails

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudTrail, Security, Multi-Account, Organizations

Description: Learn how to set up AWS CloudTrail organization trails to capture API activity across all accounts in your AWS Organization from a single configuration.

---

If you're running more than a handful of AWS accounts, you already know how painful it is to manage CloudTrail individually in each one. You've got to log into every account, configure the trail, pick the S3 bucket, set up the encryption, and hope nobody accidentally deletes anything. Organization trails fix that entire problem by letting you configure one trail that covers every account under your AWS Organization.

Let's walk through exactly how to set it up, what permissions you'll need, and the gotchas that trip people up.

## What Is an Organization Trail?

An organization trail is a CloudTrail trail created in the management account (sometimes still called the master account) that automatically applies to every member account in your AWS Organization. Every API call, every console sign-in, every resource change - it all flows into a single S3 bucket that you control from the management account.

This is different from creating individual trails in each account. With an organization trail, member accounts can see the trail but they can't modify or delete it. That's a big deal for security teams who need to guarantee audit log integrity.

## Prerequisites

Before you start, make sure you've got these pieces in place:

- AWS Organizations must be enabled with "all features" mode (not just consolidated billing)
- You need to be signed into the management account
- CloudTrail must have trusted access enabled in Organizations
- An S3 bucket with the right policy to accept logs from all accounts

Here's how to enable trusted access for CloudTrail in Organizations.

```bash
# Enable trusted access for CloudTrail in AWS Organizations
aws organizations enable-aws-service-access \
  --service-principal cloudtrail.amazonaws.com
```

You can verify it worked with this command.

```bash
# Verify CloudTrail is listed as an enabled service
aws organizations list-aws-service-access-for-organization \
  --query 'EnabledServicePrincipals[?ServicePrincipal==`cloudtrail.amazonaws.com`]'
```

## Creating the S3 Bucket

Your organization trail needs an S3 bucket that accepts logs from all accounts. The bucket policy is the part that most people get wrong. Here's a working bucket policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AWSCloudTrailAclCheck",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "s3:GetBucketAcl",
      "Resource": "arn:aws:s3:::my-org-cloudtrail-bucket",
      "Condition": {
        "StringEquals": {
          "aws:SourceArn": "arn:aws:cloudtrail:us-east-1:111111111111:trail/my-org-trail"
        }
      }
    },
    {
      "Sid": "AWSCloudTrailWrite",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudtrail.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-org-cloudtrail-bucket/AWSLogs/o-organizationid/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "bucket-owner-full-control",
          "aws:SourceArn": "arn:aws:cloudtrail:us-east-1:111111111111:trail/my-org-trail"
        }
      }
    }
  ]
}
```

Replace `111111111111` with your management account ID and `o-organizationid` with your actual organization ID. The key thing here is the Resource path on the PutObject statement - it uses the organization ID prefix, not individual account IDs.

## Creating the Organization Trail

Now for the actual trail creation. You can do this through the console or the CLI. Here's the CLI approach.

```bash
# Create the organization trail
aws cloudtrail create-trail \
  --name my-org-trail \
  --s3-bucket-name my-org-cloudtrail-bucket \
  --is-organization-trail \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --kms-key-id arn:aws:kms:us-east-1:111111111111:key/my-key-id
```

Let me break down those flags:

- `--is-organization-trail` is what makes this apply to all accounts
- `--is-multi-region-trail` captures events from every region, not just the one you're creating it in
- `--enable-log-file-validation` creates digest files so you can verify logs haven't been tampered with
- `--kms-key-id` encrypts the logs with a KMS key you control

After creating the trail, you need to start logging.

```bash
# Start the trail - it won't capture anything until you do this
aws cloudtrail start-logging --name my-org-trail
```

## Setting Up KMS Encryption

You really should encrypt your CloudTrail logs. The KMS key policy needs to allow CloudTrail to use it. Here's the relevant policy statement to add to your KMS key.

```json
{
  "Sid": "Allow CloudTrail to encrypt logs",
  "Effect": "Allow",
  "Principal": {
    "Service": "cloudtrail.amazonaws.com"
  },
  "Action": [
    "kms:GenerateDataKey*",
    "kms:DescribeKey"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "aws:SourceArn": "arn:aws:cloudtrail:us-east-1:111111111111:trail/my-org-trail"
    },
    "StringLike": {
      "kms:EncryptionContext:aws:cloudtrail:arn": "arn:aws:cloudtrail:*:111111111111:trail/*"
    }
  }
}
```

You'll also need to let users decrypt the logs when they want to read them. Add this statement for anyone who needs to query the logs.

```json
{
  "Sid": "Allow log decryption",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::111111111111:role/SecurityAuditRole"
  },
  "Action": [
    "kms:Decrypt",
    "kms:ReEncryptFrom"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:CallerAccount": "111111111111"
    },
    "StringLike": {
      "kms:EncryptionContext:aws:cloudtrail:arn": "arn:aws:cloudtrail:*:111111111111:trail/*"
    }
  }
}
```

## Using Terraform

If you prefer infrastructure as code (and you should), here's a Terraform configuration that sets up the entire thing.

```hcl
resource "aws_cloudtrail" "organization" {
  name                          = "org-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  is_organization_trail         = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.cloudtrail.arn
  include_global_service_events = true

  # Optional: send to CloudWatch Logs
  cloud_watch_logs_group_arn = "${aws_cloudwatch_log_group.cloudtrail.arn}:*"
  cloud_watch_logs_role_arn  = aws_iam_role.cloudtrail_cloudwatch.arn

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3"]
    }
  }
}
```

## Log Structure in S3

Once the trail is running, your logs will land in S3 with this folder structure:

```
s3://my-org-cloudtrail-bucket/
  AWSLogs/
    o-organizationid/
      111111111111/    # management account
        CloudTrail/
          us-east-1/
            2026/02/12/
              111111111111_CloudTrail_us-east-1_20260212T0000Z_abc123.json.gz
      222222222222/    # member account
        CloudTrail/
          us-east-1/
            ...
```

Each account gets its own prefix under the organization ID folder. This makes it straightforward to set up Athena queries or feed logs into a SIEM.

## Verifying the Trail Works

After setup, verify that the trail is working across all accounts.

```bash
# Check trail status
aws cloudtrail get-trail-status --name my-org-trail

# Verify it's an org trail
aws cloudtrail describe-trails --trail-name-list my-org-trail \
  --query 'trailList[0].{Name:Name,IsOrgTrail:IsOrganizationTrail,IsMultiRegion:IsMultiRegionTrail,Logging:HasCustomEventSelectors}'
```

You can also sign into a member account and run `aws cloudtrail describe-trails` to confirm the organization trail appears there.

## Common Issues

**Trail creation fails with "insufficient permissions"** - Make sure you've enabled trusted access first. This is the most common cause.

**Logs not appearing for member accounts** - Check the S3 bucket policy. The resource path must include the organization ID, not individual account IDs.

**KMS decrypt errors when reading logs** - The KMS key policy needs explicit decrypt permissions for the IAM principals that will read the logs.

**New accounts don't get covered** - They should be covered automatically, but give it a few minutes. If not, check that the organization trail is still active with `get-trail-status`.

## What to Do Next

Once your organization trail is running, you'll want to actually do something useful with all that data. Consider setting up [Athena queries against your CloudTrail logs](https://oneuptime.com/blog/post/2026-02-12-query-cloudtrail-logs-athena/view) for ad-hoc investigations, or [integrate CloudTrail with CloudWatch Logs](https://oneuptime.com/blog/post/2026-02-12-integrate-cloudtrail-cloudwatch-logs/view) for real-time alerting.

For a complete security monitoring setup, you'll also want to pair this with [GuardDuty for threat detection](https://oneuptime.com/blog/post/2026-02-12-enable-guardduty-threat-detection/view) and [AWS Security Hub](https://oneuptime.com/blog/post/2026-02-12-enable-aws-security-hub/view) to centralize findings from across your environment.

Organization trails are the foundation of AWS security monitoring. Get this right and you've got a reliable, tamper-resistant audit log covering your entire cloud footprint.
