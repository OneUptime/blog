# How to Configure DynamoDB Encryption with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, Encryption, KMS, Security, Infrastructure as Code

Description: Learn how to configure DynamoDB server-side encryption with customer-managed KMS keys using OpenTofu to control encryption key lifecycle and access policies.

## Introduction

DynamoDB encrypts all data at rest by default using an AWS owned key. For compliance requirements or key management control, you can use the AWS managed key (`aws/dynamodb`) or a customer-managed key. Customer-managed keys provide key rotation control, detailed CloudTrail audit logging, and the ability to revoke access by disabling the key.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB and KMS permissions

## Step 1: Create Customer-Managed KMS Key for DynamoDB

```hcl
resource "aws_kms_key" "dynamodb" {
  description             = "KMS key for DynamoDB encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name    = "${var.project_name}-dynamodb-key"
    Purpose = "DynamoDB"
  }
}

resource "aws_kms_alias" "dynamodb" {
  name          = "alias/${var.project_name}-dynamodb"
  target_key_id = aws_kms_key.dynamodb.key_id
}
```

## Step 2: Create DynamoDB Table with Customer-Managed Key Encryption

```hcl
resource "aws_dynamodb_table" "encrypted" {
  name         = "${var.project_name}-encrypted-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Use customer-managed KMS key for encryption
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.dynamodb.arn
  }

  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Name      = "${var.project_name}-encrypted-table"
    Encrypted = "CustomerManagedKey"
  }
}
```

## Step 3: Migrate Existing Table to Customer-Managed Key Encryption

```bash
# You can change encryption type for existing tables without downtime

aws dynamodb update-table \
  --table-name my-existing-table \
  --sse-specification "Enabled=true,SSEType=KMS,KMSMasterKeyId=alias/my-project-dynamodb"

# Monitor the update
aws dynamodb describe-table \
  --table-name my-existing-table \
  --query 'Table.{Status: TableStatus, SSEDescription: SSEDescription}'
```

## Step 4: Grant Application Access to Encrypted Table

```hcl
# Application IAM role needs DynamoDB permissions and KMS permissions scoped to DynamoDB
resource "aws_iam_role_policy" "app_dynamodb" {
  name = "dynamodb-encrypted-access"
  role = var.application_role_name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.encrypted.arn
      },
      {
        # Required for DynamoDB to use the customer-managed key on this role's behalf
        Effect = "Allow"
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey",
          "kms:CreateGrant"
        ]
        Resource = aws_kms_key.dynamodb.arn
        Condition = {
          StringLike = {
            "kms:ViaService" = "dynamodb.*.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

## Step 5: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify encryption configuration
aws dynamodb describe-table \
  --table-name my-project-encrypted-table \
  --query 'Table.SSEDescription'
```

## Conclusion

Customer-managed keys for DynamoDB provide the highest level of control over encryption, including the ability to audit key usage via CloudTrail and revoke access by disabling the key. The encryption is transparent to applications-no code changes required-but the IAM principals that create or access the table need both DynamoDB permissions and KMS permissions when using customer-managed keys. Enable automatic key rotation to limit the blast radius of key compromise.
