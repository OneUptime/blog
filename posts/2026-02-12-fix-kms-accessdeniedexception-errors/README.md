# How to Fix KMS 'AccessDeniedException' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, KMS, IAM, Security, Troubleshooting

Description: Diagnose and resolve AccessDeniedException errors when working with AWS KMS, including key policy issues, grants, cross-account access, and VPC endpoint restrictions.

---

AWS KMS `AccessDeniedException` errors are frustrating because KMS uses a unique permission model that combines IAM policies with key policies. Unlike most AWS services where IAM policies alone determine access, KMS requires both sides to agree. Let's untangle how this works and fix the common scenarios where things break.

## How KMS Permissions Work

KMS has a dual authorization model. Access to a KMS key requires:

1. The **key policy** must allow the action (or delegate to IAM)
2. The **IAM policy** must allow the action

If either one denies or doesn't allow the action, you get `AccessDeniedException`. This is the source of most confusion.

## Cause 1: Key Policy Doesn't Enable IAM Policies

The default key policy includes a statement that lets IAM policies control access to the key. If someone removed this statement, IAM policies alone won't work.

Check the key policy first.

```bash
# Retrieve the key policy to see who has access
aws kms get-key-policy \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234 \
  --policy-name default \
  --output text
```

Look for this critical statement that delegates permission control to IAM.

```json
{
  "Sid": "Enable IAM policies",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:root"
  },
  "Action": "kms:*",
  "Resource": "*"
}
```

If this statement is missing, IAM policies have no effect on this key. You'll need to add it back (and you'll need someone who does have key policy access to do it).

```bash
# Update the key policy to re-enable IAM policy delegation
aws kms put-key-policy \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234 \
  --policy-name default \
  --policy file://key-policy.json
```

## Cause 2: Missing IAM Permissions

Even with the key policy delegation in place, your IAM principal needs the right permissions. Here's a policy that covers the most common KMS operations.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd1234"
    }
  ]
}
```

For services that use KMS on your behalf (like S3 or EBS), you might also need `kms:CreateGrant`.

```json
{
  "Effect": "Allow",
  "Action": [
    "kms:CreateGrant",
    "kms:ListGrants",
    "kms:RevokeGrant"
  ],
  "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd1234",
  "Condition": {
    "Bool": {
      "kms:GrantIsForAWSResource": "true"
    }
  }
}
```

## Cause 3: Cross-Account Access

Cross-account KMS access requires configuration on both sides, similar to how cross-account S3 or SNS works.

The key policy in the key owner's account needs to allow the external account.

```json
{
  "Sid": "AllowExternalAccount",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::987654321098:root"
  },
  "Action": [
    "kms:Encrypt",
    "kms:Decrypt",
    "kms:ReEncrypt*",
    "kms:GenerateDataKey*",
    "kms:DescribeKey"
  ],
  "Resource": "*"
}
```

And the IAM policy in the external account needs to allow using the key.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/abcd1234"
    }
  ]
}
```

Both pieces must be in place. Missing either one results in `AccessDeniedException`.

## Cause 4: KMS Key Is Disabled or Pending Deletion

A key that's been disabled or scheduled for deletion can't be used for cryptographic operations. Check the key status.

```bash
# Check the current state of a KMS key
aws kms describe-key \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234 \
  --query 'KeyMetadata.{State: KeyState, Enabled: Enabled, DeletionDate: DeletionDate}'
```

If the key is disabled, re-enable it.

```bash
# Re-enable a disabled KMS key
aws kms enable-key \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234
```

If it's pending deletion, you can cancel the deletion (within the waiting period).

```bash
# Cancel the scheduled deletion of a KMS key
aws kms cancel-key-deletion \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234

# Then re-enable it
aws kms enable-key \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234
```

## Cause 5: VPC Endpoint Policy Restrictions

If you're accessing KMS through a VPC endpoint, the endpoint policy might be restricting which keys or operations are allowed.

```bash
# Check the VPC endpoint policy for KMS
aws ec2 describe-vpc-endpoints \
  --filters Name=service-name,Values=com.amazonaws.us-east-1.kms \
  --query 'VpcEndpoints[].PolicyDocument'
```

If the endpoint policy is restrictive, update it to allow the operations you need.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowKMSOperations",
      "Effect": "Allow",
      "Principal": "*",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    }
  ]
}
```

## Cause 6: Key Policy Conditions

KMS key policies can include conditions that restrict access based on things like encryption context, calling service, or VPC.

```json
{
  "Sid": "RestrictToS3",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:role/my-role"
  },
  "Action": "kms:Decrypt",
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:ViaService": "s3.us-east-1.amazonaws.com"
    }
  }
}
```

If you're calling KMS directly but the key policy only allows access through a specific service, you'll get denied. Review the conditions carefully.

## Debugging with CloudTrail

KMS logs every API call to CloudTrail, making it excellent for debugging.

```bash
# Find recent KMS access denied events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventSource,AttributeValue=kms.amazonaws.com \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --query 'Events[?contains(CloudTrailEvent, `AccessDenied`)].[EventTime, Username, CloudTrailEvent]' \
  --output text
```

The CloudTrail event will tell you exactly which principal tried what action on which key, and often includes context about why it was denied.

## Service-Linked Roles and Grants

Some AWS services use KMS grants instead of IAM policies. For example, when EBS encrypts a volume, it creates a grant on the KMS key. If the key policy doesn't allow `kms:CreateGrant`, the service can't set up the grant it needs.

```bash
# List existing grants on a KMS key
aws kms list-grants \
  --key-id arn:aws:kms:us-east-1:123456789012:key/abcd1234
```

## Troubleshooting Checklist

1. Does the key policy include the "Enable IAM policies" statement?
2. Does the IAM policy allow the specific KMS action?
3. Is the key in another account? If so, configure both sides.
4. Is the key enabled and not pending deletion?
5. Are there VPC endpoint policy restrictions?
6. Are there condition keys in the key policy limiting access?
7. Does the service need `kms:CreateGrant`?
8. Check CloudTrail for the detailed error context.

KMS access issues are always about the interplay between key policies and IAM policies. Once you understand that both must agree, the debugging process becomes systematic. For more AWS troubleshooting tips, take a look at our guide on [fixing ACM certificate validation issues](https://oneuptime.com/blog/post/2026-02-12-fix-acm-certificate-pending-validation-stuck/view).
