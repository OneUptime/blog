# How to Configure S3 Backend with DynamoDB Locking in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, State Management

Description: Learn how to configure the OpenTofu S3 backend with DynamoDB state locking to prevent concurrent state modifications and ensure infrastructure consistency.

## Introduction

State locking prevents multiple OpenTofu processes from modifying the same state file simultaneously. The traditional approach for S3 backends uses a DynamoDB table to store lock records. This guide covers the complete setup of DynamoDB-based state locking.

## Step 1: Create the DynamoDB Table

```hcl
# dynamodb.tf

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PAY_PER_REQUEST"  # No capacity planning needed
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Enable server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "Terraform State Locks"
    ManagedBy   = "OpenTofu"
    Environment = "shared"
  }
}
```

## Step 2: Configure the S3 Backend with DynamoDB

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true

    # DynamoDB table for state locking
    dynamodb_table = "terraform-state-locks"

    # The DynamoDB table must be in the configured backend region
  }
}
```

## Step 3: IAM Permissions

```hcl
resource "aws_iam_policy" "terraform_state" {
  name = "TerraformStateManagement"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3StateAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "arn:aws:s3:::my-terraform-state/*"
      },
      {
        Sid    = "S3ListBucket"
        Effect = "Allow"
        Action = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::my-terraform-state"
      },
      {
        Sid    = "DynamoDBLocking"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-state-locks"
      }
    ]
  })
}
```

## How DynamoDB Locking Works

When OpenTofu acquires a lock:
1. It writes an item to DynamoDB with a `LockID` = `<bucket>/<key>`
2. The item contains the operation type, user, timestamp, and lock ID
3. If an item with that `LockID` already exists, the operation fails with a lock error
4. When the operation completes, the active lock item is deleted
5. OpenTofu stores a separate state digest item with `LockID` = `<bucket>/<key>-md5` for consistency checks

DynamoDB lock and digest record structures:

```json
[
  {
    "LockID": {"S": "my-terraform-state/prod/terraform.tfstate"},
    "Info": {"S": "{\"ID\":\"abc123\",\"Operation\":\"OperationTypeApply\",\"Who\":\"user@host\",\"Version\":\"1.8.0\",\"Created\":\"2026-03-20T10:00:00Z\"}"}
  },
  {
    "LockID": {"S": "my-terraform-state/prod/terraform.tfstate-md5"},
    "Digest": {"S": "d41d8cd98f00b204e9800998ecf8427e"}
  }
]
```

## Viewing Active Locks

```bash
# Check for active locks
aws dynamodb scan \
  --table-name terraform-state-locks \
  --filter-expression "attribute_exists(Info)" \
  --query 'Items[*]' \
  --output table

# Check for a specific state file's lock
aws dynamodb get-item \
  --table-name terraform-state-locks \
  --key '{"LockID": {"S": "my-terraform-state/prod/terraform.tfstate"}}'
```

## Force-Releasing a Stuck Lock

```bash
# Via OpenTofu (preferred)
tofu force-unlock abc12345-1234-1234-1234-abc123456789

# Or directly in DynamoDB (last resort)
aws dynamodb delete-item \
  --table-name terraform-state-locks \
  --key '{"LockID": {"S": "my-terraform-state/prod/terraform.tfstate"}}'
```

## DynamoDB Region

If your team operates across multiple regions, configure the backend to use one AWS Region for both the S3 state bucket and the DynamoDB lock table:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"  # S3 bucket and DynamoDB table region
    encrypt        = true
    dynamodb_table = "terraform-state-locks"
  }
}
```

## DynamoDB Capacity Planning

For large teams with frequent deployments, consider provisioned capacity:

```hcl
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "terraform-state-locks"
  billing_mode = "PROVISIONED"
  hash_key     = "LockID"

  # Adjust based on team size and deployment frequency
  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

For most teams, `PAY_PER_REQUEST` is more cost-effective since lock operations are infrequent.

## Conclusion

DynamoDB-based state locking provides reliable, distributed locking for the S3 backend. While native S3 locking (available in OpenTofu 1.10+) can replace DynamoDB for new setups, DynamoDB locking remains widely used and well-proven. Ensure your DynamoDB table has SSE enabled, point-in-time recovery configured, and that your IAM policies grant only the minimum required permissions.
