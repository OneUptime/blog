# How to Use terraform.workspace Reference in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, HCL, Infrastructure as Code, Multi-Environment

Description: Learn how to use the terraform.workspace reference in Terraform to create environment-aware configurations that adapt based on the active workspace.

---

Terraform workspaces let you manage multiple instances of your infrastructure with the same configuration. The `terraform.workspace` reference gives you access to the name of the currently selected workspace, which you can use to make your configuration adapt to different environments.

This post covers how to use `terraform.workspace` effectively in your configurations, with practical patterns for multi-environment deployments.

## What terraform.workspace Returns

The `terraform.workspace` expression returns a string containing the name of the current workspace. By default, every Terraform configuration starts with a workspace called `default`.

```hcl
# This always returns a string - the current workspace name
output "current_workspace" {
  value = terraform.workspace  # "default", "dev", "staging", "production", etc.
}
```

You create and switch workspaces from the CLI:

```bash
# List workspaces
terraform workspace list

# Create a new workspace
terraform workspace new staging

# Switch to an existing workspace
terraform workspace select production

# Show current workspace
terraform workspace show
```

## Using terraform.workspace in Resource Names

The most basic use is including the workspace name in resource identifiers to avoid naming collisions:

```hcl
# Each workspace gets its own uniquely-named bucket
resource "aws_s3_bucket" "data" {
  bucket = "myapp-${terraform.workspace}-data"

  tags = {
    Environment = terraform.workspace
  }
}

# Each workspace gets its own DynamoDB table
resource "aws_dynamodb_table" "users" {
  name         = "users-${terraform.workspace}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  tags = {
    Environment = terraform.workspace
  }
}
```

When you switch to the `staging` workspace and apply, you get `myapp-staging-data` and `users-staging`. Switch to `production`, and you get `myapp-production-data` and `users-production`.

## Conditional Configuration Based on Workspace

You can use `terraform.workspace` in conditional expressions to change behavior per environment:

```hcl
# Size instances differently per environment
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = terraform.workspace == "production" ? "t3.large" : "t3.micro"

  # Only enable detailed monitoring in production
  monitoring = terraform.workspace == "production"

  tags = {
    Name        = "app-${terraform.workspace}"
    Environment = terraform.workspace
  }
}

# Only create the resource in production
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = terraform.workspace == "production" ? 1 : 0

  alarm_name          = "cpu-high-${terraform.workspace}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilization is too high"
}
```

## Workspace-Based Variable Lookups

A powerful pattern is using the workspace name to look up environment-specific values from a map:

```hcl
# Define environment-specific configurations in a local map
locals {
  env_config = {
    dev = {
      instance_type  = "t3.micro"
      instance_count = 1
      db_class       = "db.t3.micro"
      multi_az       = false
      min_capacity   = 1
      max_capacity   = 2
    }
    staging = {
      instance_type  = "t3.small"
      instance_count = 2
      db_class       = "db.t3.small"
      multi_az       = false
      min_capacity   = 2
      max_capacity   = 4
    }
    production = {
      instance_type  = "t3.large"
      instance_count = 3
      db_class       = "db.r6g.large"
      multi_az       = true
      min_capacity   = 3
      max_capacity   = 10
    }
  }

  # Look up the config for the current workspace
  config = local.env_config[terraform.workspace]
}

# Use the workspace-specific config values
resource "aws_instance" "app" {
  count         = local.config.instance_count
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = local.config.instance_type

  tags = {
    Name        = "app-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

resource "aws_db_instance" "main" {
  identifier     = "db-${terraform.workspace}"
  engine         = "postgres"
  instance_class = local.config.db_class
  multi_az       = local.config.multi_az
  allocated_storage = 20
  username       = "admin"
  password       = var.db_password
}
```

This pattern keeps all your environment differences in one place and makes them easy to compare.

## Workspace in Tags and Labels

Tagging resources with the workspace name helps with cost tracking and resource identification:

```hcl
locals {
  # Common tags applied to every resource
  common_tags = {
    Environment = terraform.workspace
    Project     = var.project_name
    ManagedBy   = "terraform"
    Workspace   = terraform.workspace
  }
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = merge(local.common_tags, {
    Name = "vpc-${terraform.workspace}"
  })
}
```

## Workspace in Backend Configuration Paths

If you are using an S3 backend, you can organize state files by workspace:

```hcl
# Note: the workspace name is automatically appended to the key
# by Terraform when using non-default workspaces
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "infrastructure/terraform.tfstate"
    region = "us-east-1"
  }
}

# For the "default" workspace, state goes to:
#   infrastructure/terraform.tfstate
# For workspace "staging", state goes to:
#   env:/staging/infrastructure/terraform.tfstate
```

## Workspace-Based Provider Configuration

You can use workspaces to target different AWS accounts or regions:

```hcl
locals {
  # Map workspaces to AWS accounts
  account_config = {
    dev        = { account_id = "111111111111", region = "us-east-1" }
    staging    = { account_id = "222222222222", region = "us-east-1" }
    production = { account_id = "333333333333", region = "us-east-1" }
  }

  current_account = local.account_config[terraform.workspace]
}

provider "aws" {
  region = local.current_account.region

  assume_role {
    role_arn = "arn:aws:iam::${local.current_account.account_id}:role/TerraformRole"
  }
}
```

## Handling the Default Workspace

Your configuration should handle the `default` workspace gracefully. If your lookup map does not include `default`, Terraform will throw an error:

```hcl
locals {
  env_config = {
    default = {  # always include a default entry
      instance_type = "t3.micro"
      instance_count = 1
    }
    dev = {
      instance_type = "t3.micro"
      instance_count = 1
    }
    production = {
      instance_type = "t3.large"
      instance_count = 3
    }
  }

  # Safer lookup with a fallback
  config = lookup(local.env_config, terraform.workspace, local.env_config["default"])
}
```

The `lookup` function with a default value prevents errors if someone creates a workspace name that is not in your map.

## Validation with Workspace Names

You can add validation to prevent typos or unsupported workspace names:

```hcl
locals {
  valid_workspaces = toset(["dev", "staging", "production"])

  # This will cause an error during plan if the workspace is not valid
  validate_workspace = (
    contains(local.valid_workspaces, terraform.workspace)
    ? true
    : tobool("ERROR: workspace '${terraform.workspace}' is not valid. Use one of: ${join(", ", local.valid_workspaces)}")
  )
}
```

## When Not to Use terraform.workspace

Workspaces work best for simple environment variations using the same configuration. They are not ideal when:

- Different environments need fundamentally different resources
- You need fine-grained access control per environment
- Teams work independently on different environments

In those cases, separate root modules with separate state files are usually a better approach.

## Wrapping Up

The `terraform.workspace` reference is a straightforward way to make your configuration environment-aware. Combine it with local maps for configuration lookups, use it in resource names to avoid collisions, and include it in tags for visibility. Just remember to handle the `default` workspace and validate workspace names to prevent mistakes.

For broader workspace strategies, see [How to Build Terraform Workspace Patterns](https://oneuptime.com/blog/post/2026-01-30-terraform-workspace-patterns/view). For other reference types, check out [How to Reference Input Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-input-variables/view).
