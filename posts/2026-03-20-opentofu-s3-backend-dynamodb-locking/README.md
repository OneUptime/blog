# How to Configure S3 Backend with DynamoDB Locking in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, AWS

Description: Learn how to configure the OpenTofu S3 backend with DynamoDB state locking to prevent concurrent runs from corrupting your state file.

## Introduction

DynamoDB state locking prevents multiple simultaneous OpenTofu operations from corrupting the state file. When a run starts, it writes a lock entry to DynamoDB. Other runs that try to acquire the same lock will wait or fail with a lock error. This is the traditional locking mechanism for the S3 backend.

## Configuration

```hcl
terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tofu-state-lock"
  }
}
```

## Creating the DynamoDB Table

```hcl
resource "aws_dynamodb_table" "tofu_state_lock" {
  name         = "tofu-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name    = "OpenTofu State Lock"
    Purpose = "terraform-state-locking"
  }
}
```

The table requires exactly one attribute: `LockID` of type String.

## IAM Permissions for Locking

```hcl
resource "aws_iam_policy" "tofu_lock" {
  name = "opentofu-state-lock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:DescribeTable"
        ]
        Resource = aws_dynamodb_table.tofu_state_lock.arn
      }
    ]
  })
}
```

## Lock File Entry

When a run starts, DynamoDB contains a single item with two attributes: `LockID` and `Info`. The `Info` attribute holds the lock metadata as a JSON string:

```json
{
  "LockID": {"S": "my-tofu-state/production/terraform.tfstate"},
  "Info": {"S": "{\"ID\":\"abc-123\",\"Operation\":\"OperationTypeApply\",\"Info\":\"\",\"Who\":\"user@hostname\",\"Version\":\"1.8.0\",\"Created\":\"2026-03-20T10:00:00Z\",\"Path\":\"my-tofu-state/production/terraform.tfstate\"}"}
}
```

## Lock Conflict Behavior

```bash
# If another run holds the lock:

tofu apply

# Error: Error acquiring the state lock: ConditionalCheckFailedException
# Lock Info:
#   ID:        abc-123
#   Path:      my-tofu-state/production/terraform.tfstate
#   Operation: OperationTypeApply
#   Who:       ci-runner@hostname
#   Version:   1.8.0
#   Created:   2026-03-20 10:00:00 UTC
```

## Force-Unlock a Stuck Lock

If a run crashes and leaves a lock:

```bash
# Get the lock info from DynamoDB (Info is a JSON string; parse it to read the ID)
aws dynamodb get-item \
  --table-name tofu-state-lock \
  --key '{"LockID": {"S": "my-tofu-state/production/terraform.tfstate"}}' \
  --query 'Item.Info.S' \
  --output text

# Force-unlock using the lock ID (also shown in the error output of the failing run)
tofu force-unlock abc-123
```

## Multiple Environments with One Table

One DynamoDB table can handle locking for multiple state files:

```hcl
# production
backend "s3" {
  dynamodb_table = "tofu-state-lock"
  key            = "production/terraform.tfstate"
  # Lock key: "my-tofu-state/production/terraform.tfstate"
}

# staging
backend "s3" {
  dynamodb_table = "tofu-state-lock"
  key            = "staging/terraform.tfstate"
  # Lock key: "my-tofu-state/staging/terraform.tfstate"
}
```

Each state file path generates a unique `LockID` in DynamoDB.

## Point-in-Time Recovery for Lock Table

```hcl
resource "aws_dynamodb_table" "tofu_state_lock" {
  name         = "tofu-state-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  point_in_time_recovery {
    enabled = true
  }

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## Conclusion

DynamoDB locking provides robust concurrency protection for the S3 backend. Create the table with a single `LockID` hash key, grant the required DynamoDB permissions, and reference the table in the backend configuration. Use `tofu force-unlock` to clear stuck locks from crashed runs. For simpler setups, consider native S3 locking with `use_lockfile = true` to eliminate the DynamoDB dependency.
