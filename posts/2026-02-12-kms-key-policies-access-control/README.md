# How to Use KMS Key Policies for Access Control

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, KMS, IAM, Security, Access Control

Description: A practical guide to writing and managing AWS KMS key policies for fine-grained access control, including separation of duties, cross-account access, and grants.

---

KMS key policies are the primary mechanism controlling who can do what with your encryption keys. Unlike most AWS resources where IAM policies alone determine access, KMS uses a dual-authorization model: both the key policy and IAM policies must allow an action. Getting key policies wrong can lock you out of your own keys or expose them to unintended principals.

This guide walks through writing effective key policies, implementing separation of duties, handling cross-account scenarios, and using grants for service-level access.

## How KMS Authorization Works

Before writing policies, you need to understand the authorization flow. When someone tries to use a KMS key, AWS checks two things:

1. Does the **key policy** allow this principal to perform this action?
2. Does the principal's **IAM policy** allow this action on this key?

Both must say yes, with one exception: if the key policy explicitly grants access to a principal, IAM policies don't need to be involved. The key policy can be the sole authority.

Here's the critical part most people miss: by default, a newly created key policy only grants access to the root account. This root account statement is what enables IAM policies to work.

```json
{
  "Sid": "Enable IAM User Permissions",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:root"
  },
  "Action": "kms:*",
  "Resource": "*"
}
```

If you remove this statement, only principals explicitly named in the key policy can access the key. IAM policies become irrelevant.

## Building a Proper Key Policy

A well-structured key policy separates three concerns: root access (safety net), key administration, and key usage. Here's a complete example.

```json
{
  "Version": "2012-10-17",
  "Id": "production-database-key-policy",
  "Statement": [
    {
      "Sid": "EnableRootAccountFullAccess",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowKeyAdministrators",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::123456789012:role/SecurityTeamRole",
          "arn:aws:iam::123456789012:role/InfraAdminRole"
        ]
      },
      "Action": [
        "kms:Create*",
        "kms:Describe*",
        "kms:Enable*",
        "kms:List*",
        "kms:Put*",
        "kms:Update*",
        "kms:Revoke*",
        "kms:Disable*",
        "kms:Get*",
        "kms:Delete*",
        "kms:TagResource",
        "kms:UntagResource",
        "kms:ScheduleKeyDeletion",
        "kms:CancelKeyDeletion"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowApplicationKeyUsage",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::123456789012:role/AppServerRole",
          "arn:aws:iam::123456789012:role/LambdaExecutionRole"
        ]
      },
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey",
        "kms:GenerateDataKeyWithoutPlaintext",
        "kms:DescribeKey"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowGrantsForAWSServices",
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::123456789012:role/AppServerRole"
        ]
      },
      "Action": [
        "kms:CreateGrant",
        "kms:ListGrants",
        "kms:RevokeGrant"
      ],
      "Resource": "*",
      "Condition": {
        "Bool": {
          "kms:GrantIsForAWSResource": "true"
        }
      }
    }
  ]
}
```

Let's break down why each statement matters.

**Root account access** is your escape hatch. If every named principal loses access or their roles get deleted, you can still manage the key through the root account. Never remove this.

**Key administrators** can manage the key but can't use it for encryption/decryption. This is the separation of duties principle - the people who configure keys shouldn't be the same people using them.

**Key users** can encrypt and decrypt but can't change the key policy or delete the key. They only get the minimum permissions needed.

**Grant permissions** are restricted with a condition that only allows grants for AWS services. This prevents users from creating grants that bypass the key policy.

## Applying the Key Policy

You can apply a key policy via the CLI or Terraform.

```bash
# Apply the key policy from a JSON file
aws kms put-key-policy \
  --key-id alias/production-database \
  --policy-name default \
  --policy file://key-policy.json

# Verify it was applied correctly
aws kms get-key-policy \
  --key-id alias/production-database \
  --policy-name default \
  --output text | python3 -m json.tool
```

With Terraform, you embed the policy directly in the key resource.

```hcl
resource "aws_kms_key" "database" {
  description = "Production database encryption"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ... statements from above
    ]
  })
}
```

## Cross-Account Key Access

Sometimes teams in different AWS accounts need access to your keys. This requires changes on both sides: the key policy must allow the external account, and the external account must have IAM policies granting access.

Add the external account to your key policy.

```json
{
  "Sid": "AllowCrossAccountAccess",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::987654321098:root"
  },
  "Action": [
    "kms:Encrypt",
    "kms:Decrypt",
    "kms:ReEncrypt*",
    "kms:GenerateDataKey",
    "kms:GenerateDataKeyWithoutPlaintext",
    "kms:DescribeKey"
  ],
  "Resource": "*"
}
```

In the external account (987654321098), create an IAM policy for the roles that need access.

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
        "kms:GenerateDataKey",
        "kms:DescribeKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/1234abcd-12ab-34cd-56ef-1234567890ab"
    }
  ]
}
```

Both the key policy and the IAM policy must be in place. One without the other won't work.

## Using Conditions for Fine-Grained Control

KMS supports several condition keys that let you restrict access based on context.

Restrict encryption operations to specific services.

```json
{
  "Sid": "OnlyAllowS3Encryption",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:role/S3AccessRole"
  },
  "Action": [
    "kms:GenerateDataKey",
    "kms:Decrypt"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:ViaService": "s3.us-east-1.amazonaws.com"
    }
  }
}
```

Restrict access based on the encryption context (useful for multi-tenant scenarios).

```json
{
  "Sid": "RestrictByEncryptionContext",
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::123456789012:role/TenantARole"
  },
  "Action": [
    "kms:Decrypt"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "kms:EncryptionContext:tenant": "tenant-a"
    }
  }
}
```

This means TenantARole can only decrypt data that was encrypted with the encryption context `{"tenant": "tenant-a"}`. It's a powerful pattern for isolating data in shared databases.

## Understanding KMS Grants

Grants are an alternative to key policies for granting temporary or programmatic access. AWS services like EBS, RDS, and Redshift use grants under the hood.

```bash
# Create a grant allowing a role to decrypt
aws kms create-grant \
  --key-id alias/production-database \
  --grantee-principal "arn:aws:iam::123456789012:role/DataPipelineRole" \
  --operations Decrypt GenerateDataKey \
  --constraints '{"EncryptionContextSubset": {"project": "analytics"}}' \
  --retiring-principal "arn:aws:iam::123456789012:role/SecurityTeamRole"

# List active grants
aws kms list-grants \
  --key-id alias/production-database

# Revoke a grant
aws kms revoke-grant \
  --key-id alias/production-database \
  --grant-id "grant-abc123"
```

Grants are handy for temporary access patterns, like a data migration job that needs decrypt access for a few hours. The retiring principal can clean up the grant when it's no longer needed.

## Auditing Key Access

Regular audits are essential. Use CloudTrail to see who's actually using your keys.

```bash
# Query CloudTrail for key policy changes
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=PutKeyPolicy \
  --max-results 10
```

You should also periodically review key policies to check for overly permissive access.

```bash
# List all CMKs and their policies
for key_id in $(aws kms list-keys --query 'Keys[*].KeyId' --output text); do
  echo "=== Key: $key_id ==="
  aws kms get-key-policy --key-id "$key_id" --policy-name default --output text
  echo ""
done
```

## Common Mistakes

I've seen these issues repeatedly in production environments:

1. **Removing the root account statement** and then losing access when roles get deleted. Always keep it.
2. **Granting kms:* to application roles.** Applications should only get Encrypt, Decrypt, and GenerateDataKey.
3. **Not using conditions.** The `kms:ViaService` condition prevents keys from being used outside their intended service.
4. **Ignoring grants.** Services create grants automatically, and they accumulate. Review them periodically.

For more on managing the keys themselves, check out our guide on [creating and managing CMKs](https://oneuptime.com/blog/post/2026-02-12-create-manage-kms-customer-managed-keys/view).

## Wrapping Up

KMS key policies are your most important tool for controlling encryption key access. Structure them with clear separation of duties, use conditions for fine-grained control, and audit regularly. The dual-authorization model can be confusing at first, but once you understand that both key policies and IAM policies must agree, it becomes a powerful security mechanism that's hard to accidentally bypass.
