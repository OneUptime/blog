# How to Encrypt Terraform State with AWS KMS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, KMS, Encryption, Security, State Management

Description: Step-by-step guide to encrypting Terraform state files using AWS KMS, covering key creation, S3 backend configuration, key policies, key rotation, and cross-account access patterns.

---

Terraform state files contain sensitive information about your infrastructure. When using AWS as your state backend, encrypting the state with AWS Key Management Service (KMS) provides a strong layer of protection. This guide walks through setting up KMS encryption for your Terraform state, from key creation to advanced configurations.

## Why KMS Over Default S3 Encryption?

S3 offers three encryption options:

1. **SSE-S3** (AES-256): Amazon manages the keys. You have no control over key access.
2. **SSE-KMS** (aws:kms): You control the keys through KMS policies. You can audit key usage and restrict access.
3. **SSE-C**: You provide the encryption key with each request. Complex to manage.

SSE-KMS is the best option for Terraform state because it gives you fine-grained control over who can decrypt the state file. Even if someone has S3 read access, they cannot read the state without KMS decrypt permissions.

## Creating a KMS Key

Start by creating a dedicated KMS key for Terraform state encryption:

```hcl
# kms.tf - Create a KMS key for state encryption
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state file encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  multi_region            = false

  # Key policy controls who can use and manage this key
  policy = jsonencode({
    Version = "2012-10-17"
    Id      = "terraform-state-key-policy"
    Statement = [
      {
        # Allow account root full access (required for key administration)
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        # Allow Terraform role to encrypt and decrypt
        Sid    = "AllowTerraformAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/TerraformRole",
            "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/CIDeployRole"
          ]
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      },
      {
        # Allow key administrators to manage (but not use) the key
        Sid    = "AllowKeyAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/AdminRole"
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
      }
    ]
  })

  tags = {
    Purpose = "terraform-state-encryption"
    ManagedBy = "terraform"
  }
}

# Create an alias for easier reference
resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}

# Output the key ARN for use in backend configuration
output "kms_key_arn" {
  value       = aws_kms_key.terraform_state.arn
  description = "ARN of the KMS key for Terraform state encryption"
}
```

## Configuring the S3 Backend with KMS

Once you have a KMS key, configure your Terraform backend to use it:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/infrastructure.tfstate"
    region         = "us-east-1"

    # Enable encryption with your KMS key
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abcd1234-ef56-gh78-ij90-klmnopqrstuv"

    # State locking
    dynamodb_table = "terraform-state-locks"
  }
}
```

You can also use the KMS alias:

```hcl
terraform {
  backend "s3" {
    bucket     = "my-terraform-state"
    key        = "production/infrastructure.tfstate"
    region     = "us-east-1"
    encrypt    = true
    kms_key_id = "alias/terraform-state"
    dynamodb_table = "terraform-state-locks"
  }
}
```

## Setting Up the S3 Bucket

The S3 bucket that stores state should enforce KMS encryption for all objects:

```hcl
# s3.tf - State bucket with mandatory KMS encryption
resource "aws_s3_bucket" "state" {
  bucket = "my-terraform-state"

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Purpose   = "terraform-state"
    ManagedBy = "terraform"
  }
}

# Enable versioning for state recovery
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enforce KMS encryption for all objects
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.terraform_state.arn
    }
    bucket_key_enabled = true  # Reduces KMS API calls and costs
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enforce SSL-only access
resource "aws_s3_bucket_policy" "state" {
  bucket = aws_s3_bucket.state.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyNonSSLAccess"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.state.arn,
          "${aws_s3_bucket.state.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        # Deny uploads that do not use the correct KMS key
        Sid       = "DenyIncorrectEncryption"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.state.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption-aws-kms-key-id" = aws_kms_key.terraform_state.arn
          }
        }
      }
    ]
  })
}
```

## Key Rotation

AWS KMS supports automatic annual key rotation. When you enable it, AWS creates new key material yearly but keeps old material for decrypting previously encrypted data:

```hcl
resource "aws_kms_key" "terraform_state" {
  # ... other configuration ...
  enable_key_rotation = true  # Rotates annually
}
```

You can also trigger manual rotation:

```bash
# Check the current rotation status
aws kms get-key-rotation-status --key-id alias/terraform-state

# Key rotation does NOT require re-encrypting existing state files
# AWS KMS transparently handles decryption with old key material
```

## Cross-Account Access

If your organization uses multiple AWS accounts, you may need to share the KMS key across accounts:

```hcl
resource "aws_kms_key" "terraform_state" {
  description         = "KMS key for Terraform state - shared across accounts"
  enable_key_rotation = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::111111111111:root"  # Primary account
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        # Grant access to the other account
        Sid    = "AllowCrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::222222222222:root"  # Secondary account
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}
```

In the secondary account, the IAM role also needs a policy allowing KMS usage:

```hcl
# In account 222222222222
resource "aws_iam_role_policy" "cross_account_kms" {
  name = "cross-account-kms-access"
  role = aws_iam_role.terraform.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "arn:aws:kms:us-east-1:111111111111:key/abcd1234-ef56-gh78-ij90-klmnopqrstuv"
      }
    ]
  })
}
```

## Auditing KMS Key Usage

Track who accesses your state encryption key with CloudTrail:

```hcl
# Monitor KMS key usage through CloudTrail
resource "aws_cloudwatch_log_metric_filter" "kms_decrypt" {
  name           = "terraform-state-decrypt"
  pattern        = "{ $.eventSource = \"kms.amazonaws.com\" && $.eventName = \"Decrypt\" && $.requestParameters.keyId = \"*terraform-state*\" }"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  metric_transformation {
    name      = "TerraformStateDecryptCount"
    namespace = "Security"
    value     = "1"
  }
}

# Alert on unusual decryption patterns
resource "aws_cloudwatch_metric_alarm" "unusual_decrypt" {
  alarm_name          = "unusual-terraform-state-access"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "TerraformStateDecryptCount"
  namespace           = "Security"
  period              = 3600
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Unusual number of Terraform state decryption operations"
  alarm_actions       = [aws_sns_topic.security_alerts.arn]
}
```

## Cost Considerations

KMS encryption adds a small cost:

- **Key storage**: $1/month per KMS key
- **API calls**: $0.03 per 10,000 requests
- **S3 Bucket Keys**: Enabling `bucket_key_enabled` reduces KMS API calls significantly by caching the data encryption key at the bucket level

For most Terraform setups, the KMS costs are negligible - likely under $5/month.

## Verifying Encryption

After setting up encryption, verify it is working:

```bash
# Check the encryption configuration of your state object
aws s3api head-object \
  --bucket my-terraform-state \
  --key production/infrastructure.tfstate

# Expected output should include:
# "ServerSideEncryption": "aws:kms",
# "SSEKMSKeyId": "arn:aws:kms:us-east-1:123456789012:key/abcd1234..."

# Verify the bucket encryption configuration
aws s3api get-bucket-encryption --bucket my-terraform-state
```

## Disaster Recovery

Even with encryption, plan for disaster recovery:

```bash
# Enable cross-region replication for the state bucket
# (with KMS encryption in the replica region too)
```

```hcl
# Replica bucket in another region
resource "aws_s3_bucket" "state_replica" {
  provider = aws.us_west_2
  bucket   = "my-terraform-state-replica"
}

# KMS key in the replica region
resource "aws_kms_key" "state_replica" {
  provider            = aws.us_west_2
  description         = "KMS key for Terraform state replica"
  enable_key_rotation = true
}

# Replication configuration
resource "aws_s3_bucket_replication_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  role   = aws_iam_role.replication.arn

  rule {
    id     = "state-replication"
    status = "Enabled"

    destination {
      bucket = aws_s3_bucket.state_replica.arn

      encryption_configuration {
        replica_kms_key_id = aws_kms_key.state_replica.arn
      }
    }

    source_selection_criteria {
      sse_kms_encrypted_objects {
        status = "Enabled"
      }
    }
  }
}
```

## Monitoring Your Infrastructure

Beyond encrypting your state files, monitoring the infrastructure they describe is equally important. [OneUptime](https://oneuptime.com) provides comprehensive monitoring and alerting for your AWS infrastructure, helping you detect issues before they affect your users.

## Conclusion

Encrypting Terraform state with AWS KMS is a best practice that every team using AWS should implement. The setup is straightforward - create a KMS key, configure the S3 backend to use it, and enforce encryption at the bucket level. Combined with proper IAM policies and auditing, KMS encryption ensures that your infrastructure secrets stay protected even if the state bucket is accidentally exposed.

For encryption on other cloud providers, see our guides on [Azure Key Vault encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-encrypt-terraform-state-with-azure-key-vault/view) and [GCP KMS encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-encrypt-terraform-state-with-gcp-kms/view).
