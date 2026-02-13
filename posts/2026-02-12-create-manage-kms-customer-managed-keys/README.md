# How to Create and Manage KMS Customer Managed Keys

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, KMS, Encryption, Security

Description: Learn how to create, configure, and manage AWS KMS customer managed keys for encryption, including key policies, aliases, and lifecycle management.

---

AWS KMS gives you three types of keys: AWS owned keys (fully managed by AWS), AWS managed keys (visible but not configurable), and customer managed keys (CMKs) where you control everything. If you need control over key policies, rotation, and lifecycle, customer managed keys are the way to go.

This guide covers creating CMKs, setting up proper policies, managing key aliases, and handling the full lifecycle from creation to eventual deletion.

## Creating Your First Customer Managed Key

The simplest way to create a symmetric encryption key (the most common type) is through the CLI.

```bash
# Create a symmetric encryption CMK
aws kms create-key \
  --description "Production database encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec SYMMETRIC_DEFAULT \
  --tags '[
    {"TagKey": "Environment", "TagValue": "production"},
    {"TagKey": "Team", "TagValue": "platform"},
    {"TagKey": "Purpose", "TagValue": "database-encryption"}
  ]'
```

The response includes the key ID and ARN. Save those - you'll need them for everything else.

Now give the key a human-readable alias. Aliases make it much easier to reference keys in code and policies.

```bash
# Create an alias for the key
aws kms create-alias \
  --alias-name alias/production-database \
  --target-key-id "1234abcd-12ab-34cd-56ef-1234567890ab"
```

## Asymmetric Keys

Not everything needs a symmetric key. For digital signatures or when you need a public/private key pair, create an asymmetric key.

```bash
# Create an RSA key for signing
aws kms create-key \
  --description "Code signing key" \
  --key-usage SIGN_VERIFY \
  --key-spec RSA_2048

# Create an RSA key for encryption
aws kms create-key \
  --description "External partner encryption key" \
  --key-usage ENCRYPT_DECRYPT \
  --key-spec RSA_2048

# Create an ECC key for signing (more efficient than RSA)
aws kms create-key \
  --description "API token signing key" \
  --key-usage SIGN_VERIFY \
  --key-spec ECC_NIST_P256
```

For asymmetric encryption keys, you can download the public key and share it with external partners.

```bash
# Get the public key
aws kms get-public-key \
  --key-id alias/external-partner-key \
  --output text \
  --query PublicKey | base64 --decode > public-key.der
```

## Terraform Configuration

Most teams manage KMS keys through Terraform. Here's a solid baseline configuration.

```hcl
# Create a customer managed key with a proper policy
resource "aws_kms_key" "database" {
  description             = "Encryption key for production databases"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  is_enabled              = true
  key_usage               = "ENCRYPT_DECRYPT"
  customer_master_key_spec = "SYMMETRIC_DEFAULT"

  # Key policy - this is critical
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/KeyAdminRole"
        }
        Action = [
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
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowKeyUsage"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/ApplicationRole"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey",
          "kms:GenerateDataKeyWithoutPlaintext",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Environment = "production"
    Team        = "platform"
  }
}

# Create an alias
resource "aws_kms_alias" "database" {
  name          = "alias/production-database"
  target_key_id = aws_kms_key.database.key_id
}
```

Notice the three-tier policy structure: root account access (so you don't lock yourself out), key administration (manage but not use), and key usage (use but not manage). This separation of duties is a security best practice.

## Key Policies vs IAM Policies

This trips a lot of people up. KMS uses a combination of key policies and IAM policies. Here's the rule: the key policy is the primary gatekeeper. Even if an IAM policy grants KMS access, the key policy must also allow it.

The root account statement in the key policy above is what enables IAM policies to work. Without it, only principals explicitly named in the key policy can access the key.

```bash
# View the current key policy
aws kms get-key-policy \
  --key-id alias/production-database \
  --policy-name default \
  --output text
```

If you need to update the key policy, be very careful. A mistake can lock everyone out, and you'll need AWS Support to regain access.

```bash
# Update the key policy (be careful!)
aws kms put-key-policy \
  --key-id alias/production-database \
  --policy-name default \
  --policy file://key-policy.json
```

## Managing Key Lifecycle

Keys go through several lifecycle stages: creation, active use, disabled, and eventually scheduled for deletion.

To temporarily disable a key (maybe during a security incident):

```bash
# Disable a key - existing encrypted data is inaccessible until re-enabled
aws kms disable-key \
  --key-id alias/production-database

# Re-enable it
aws kms enable-key \
  --key-id alias/production-database
```

When you're ready to permanently decommission a key, schedule it for deletion. There's a mandatory waiting period (7-30 days) as a safety net.

```bash
# Schedule key deletion with a 30-day waiting period
aws kms schedule-key-deletion \
  --key-id "1234abcd-12ab-34cd-56ef-1234567890ab" \
  --pending-window-in-days 30

# Changed your mind? Cancel the deletion
aws kms cancel-key-deletion \
  --key-id "1234abcd-12ab-34cd-56ef-1234567890ab"
```

**Important**: Once a key is deleted, all data encrypted with it is permanently inaccessible. Always verify there's no remaining data encrypted with the key before scheduling deletion.

## Monitoring Key Usage

You should track who's using your keys and how. CloudTrail logs every KMS API call automatically.

```bash
# Find recent Decrypt calls for a specific key
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=ResourceType,AttributeValue=AWS::KMS::Key \
  --max-results 20
```

Set up a CloudWatch alarm for unusual activity.

```bash
# Alert on excessive decrypt operations (possible data exfiltration)
aws cloudwatch put-metric-alarm \
  --alarm-name "KMS-Excessive-Decrypts" \
  --namespace "AWS/KMS" \
  --metric-name "NumberOfDecryptOps" \
  --dimensions Name=KeyId,Value="1234abcd-12ab-34cd-56ef-1234567890ab" \
  --statistic Sum \
  --period 3600 \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:security-alerts"
```

## Tagging and Organization

At scale, you might have dozens or hundreds of CMKs. Consistent tagging is essential.

```bash
# Tag a key
aws kms tag-resource \
  --key-id "1234abcd-12ab-34cd-56ef-1234567890ab" \
  --tags '[
    {"TagKey": "CostCenter", "TagValue": "engineering"},
    {"TagKey": "DataClassification", "TagValue": "confidential"},
    {"TagKey": "ManagedBy", "TagValue": "terraform"}
  ]'

# List all keys with their tags
aws kms list-keys --query 'Keys[*].KeyId' --output text | \
  xargs -I {} aws kms describe-key --key-id {} \
  --query 'KeyMetadata.{KeyId:KeyId,Description:Description,Enabled:Enabled}'
```

## Common Pitfalls

A few things that catch people off guard:

1. **Locking yourself out of a key.** Always include the root account in the key policy. This is your escape hatch.
2. **Forgetting about grants.** Some AWS services use KMS grants instead of policies. List grants regularly to audit access.
3. **Not enabling key rotation.** Automatic rotation is free and creates new key material annually while keeping old material for decryption.
4. **Ignoring cross-account access.** If other accounts need your key, you must add them to both the key policy and set up IAM policies in their account.

For more on key rotation, check out our guide on [enabling KMS key rotation](https://oneuptime.com/blog/post/2026-02-12-enable-kms-key-rotation/view). And if you're using KMS with specific services, we've got guides for [S3 encryption](https://oneuptime.com/blog/post/2026-02-12-kms-with-s3-encryption/view), [EBS encryption](https://oneuptime.com/blog/post/2026-02-12-kms-with-ebs-volume-encryption/view), and [RDS encryption](https://oneuptime.com/blog/post/2026-02-12-kms-with-rds-database-encryption/view).

## Wrapping Up

Customer managed keys give you the control you need for compliance and security, but that control comes with responsibility. Set up proper key policies from day one, enable rotation, monitor usage, and have a clear lifecycle plan for every key you create. Treat your KMS keys like the critical infrastructure they are - because if you lose a key, you lose everything encrypted with it.
