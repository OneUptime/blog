# How to Configure S3 Backend with IAM Role Assumption in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, AWS

Description: Learn how to configure the OpenTofu S3 backend to assume an IAM role for cross-account state access and principle of least privilege.

## Introduction

IAM role assumption in the S3 backend allows OpenTofu to access state stored in a different AWS account, or to use a purpose-specific role with minimal permissions. This is a security best practice for multi-account environments where state is centralized in a "shared services" account.

## Basic Role Assumption

```hcl
terraform {
  backend "s3" {
    bucket = "central-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"

    assume_role = {
      role_arn = "arn:aws:iam::SHARED-SERVICES-ACCOUNT:role/TerraformStateAccess"
    }
  }
}
```

## Cross-Account Configuration

```hcl
# Workload account: deploy infrastructure

# Shared services account: store state

terraform {
  backend "s3" {
    bucket  = "acme-terraform-state"  # In shared services account
    key     = "workload-prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

    # Assume a role in the shared services account
    assume_role = {
      role_arn     = "arn:aws:iam::111111111111:role/TerraformStateReader"
      session_name = "terraform-prod-apply"
    }

    dynamodb_table = "terraform-state-lock"
  }
}
```

## IAM Role in the State Account

Create the role that OpenTofu will assume:

```hcl
# In the shared services (state) account
resource "aws_iam_role" "terraform_state_access" {
  name = "TerraformStateAccess"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::WORKLOAD-ACCOUNT-ID:root"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "terraform_state_access" {
  role = aws_iam_role.terraform_state_access.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject"]
        Resource = "arn:aws:s3:::acme-terraform-state/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::acme-terraform-state"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = "arn:aws:dynamodb:us-east-1:*:table/terraform-state-lock"
      }
    ]
  })
}
```

## External ID for Additional Security

```hcl
terraform {
  backend "s3" {
    bucket = "central-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"

    assume_role = {
      role_arn    = "arn:aws:iam::111111111111:role/TerraformStateAccess"
      external_id = "terraform-state-access-prod"
    }
  }
}
```

## Using Partial Configuration

For security, avoid committing the role ARN:

```hcl
# backend.tf - committed to version control
terraform {
  backend "s3" {
    bucket = "central-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```hcl
# backend-prod.hcl - not committed, supplied at init time
assume_role = {
  role_arn = "arn:aws:iam::111111111111:role/TerraformStateAccess"
}
```

```bash
# Provide the assume_role configuration at init time
tofu init -backend-config=backend-prod.hcl
```

## Chained Role Assumption

The backend role can be different from the provider role:

```hcl
# Backend uses one role for state access
terraform {
  backend "s3" {
    bucket = "central-state"
    key    = "prod.tfstate"
    region = "us-east-1"

    assume_role = {
      role_arn = "arn:aws:iam::STATE-ACCOUNT:role/StateAccess"
    }
  }
}

# Provider uses another role for infrastructure changes
provider "aws" {
  region = "us-east-1"
  assume_role {
    role_arn = "arn:aws:iam::WORKLOAD-ACCOUNT:role/InfraDeployer"
  }
}
```

## Conclusion

IAM role assumption in the S3 backend enables secure cross-account state storage following the principle of least privilege. The role in the state account needs only S3 and DynamoDB permissions - it does not need infrastructure permissions. Use external IDs for additional security and partial backend configuration to keep sensitive role ARNs out of version control.
