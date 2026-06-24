# How to Use Separate State Files Per Environment in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, State Management, Environment Separation, S3, Backend, Infrastructure as Code

Description: Learn how to configure separate state files per environment in OpenTofu using directory-based separation for complete isolation between dev, staging, and production.

---

Separate state files per environment help prevent a mistake in dev from corrupting production state. Unlike workspaces (which share a configuration), directory-based separation provides independent configurations, backends, and provider settings per environment.

## Directory Structure

```text
infrastructure/
├── modules/           # Shared reusable modules
│   ├── network/
│   ├── application/
│   └── database/
├── environments/
│   ├── dev/
│   │   ├── main.tf   # Calls modules with dev variables
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf
│       ├── backend.tf
│       └── terraform.tfvars
```

## Separate Backends Per Environment

```hcl
# environments/dev/backend.tf

terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tofu-state-lock"
    encrypt        = true
  }
}

# environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-tofu-state-production"  # Separate bucket
    key            = "environments/production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tofu-state-lock-production"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/mrk-xxxxx"
  }
}
```

## Environment-Specific Provider Configs

```hcl
# environments/production/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

# Production uses a different AWS account
provider "aws" {
  region = "us-east-1"

  # Assume a role in the production account
  assume_role {
    role_arn = "arn:aws:iam::PROD_ACCOUNT_ID:role/TerraformDeployRole"
  }
}

# Call shared modules with production-specific values
module "application" {
  source = "../../modules/application"

  environment    = "production"
  instance_count = 3
  instance_type  = "t3.large"
}
```

## Cross-Environment State References

```hcl
# Reading outputs from another environment's state
data "terraform_remote_state" "network" {
  backend = "s3"

  config = {
    bucket = "my-tofu-state"
    key    = "environments/production/network/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the VPC ID from the network state
resource "aws_ecs_service" "app" {
  # ...
  network_configuration {
    subnets = data.terraform_remote_state.network.outputs.private_subnet_ids
  }
}
```

## Best Practices

- Use separate S3 buckets for production state - isolate it from dev/staging with strict IAM policies.
- Enable S3 bucket versioning on all state buckets for point-in-time recovery.
- For stricter isolation, use separate DynamoDB state lock tables between environments, or enforce fine-grained IAM controls if you share one.
- Use different AWS accounts for production vs non-production for strong isolation.
- Automate deployment with a script that `cd`s into the appropriate environment directory and runs `tofu apply`.
