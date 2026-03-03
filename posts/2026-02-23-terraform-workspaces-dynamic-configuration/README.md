# How to Use Terraform Workspaces with Dynamic Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, Dynamic Configuration, Infrastructure as Code, DevOps

Description: Learn how to pair Terraform workspaces with dynamic configuration to manage multiple environments from a single codebase using workspace-aware variables and logic.

---

Terraform workspaces let you maintain multiple state files from the same configuration directory. Combine that with dynamic configuration - where resource attributes change based on which workspace is active - and you get a clean way to manage dev, staging, and production environments without duplicating code.

This guide shows you how to build workspace-aware configurations that adapt automatically when you switch workspaces.

## Workspaces Quick Refresher

Workspaces create isolated state files. Each workspace has its own `terraform.tfstate`, so resources in one workspace do not affect another:

```bash
# Create and switch to a new workspace
terraform workspace new dev
terraform workspace new staging
terraform workspace new production

# List all workspaces
terraform workspace list

# Switch to a workspace
terraform workspace select staging

# Check current workspace in configuration
# Use terraform.workspace to get the name
```

The key function is `terraform.workspace`, which returns the name of the current workspace as a string. You can use this value anywhere in your configuration.

## Workspace-Aware Variable Maps

The most common pattern is a local map that holds different values per workspace:

```hcl
# locals.tf - Configuration varies by workspace

locals {
  # Map of workspace name to environment settings
  env_config = {
    dev = {
      instance_type    = "t3.small"
      instance_count   = 1
      db_instance_class = "db.t3.micro"
      multi_az         = false
      min_capacity     = 1
      max_capacity     = 2
      enable_monitoring = false
      domain_prefix    = "dev"
    }
    staging = {
      instance_type    = "t3.medium"
      instance_count   = 2
      db_instance_class = "db.t3.small"
      multi_az         = false
      min_capacity     = 2
      max_capacity     = 4
      enable_monitoring = true
      domain_prefix    = "staging"
    }
    production = {
      instance_type    = "t3.large"
      instance_count   = 3
      db_instance_class = "db.r5.large"
      multi_az         = true
      min_capacity     = 3
      max_capacity     = 20
      enable_monitoring = true
      domain_prefix    = "www"
    }
  }

  # Current workspace configuration (with fallback to dev)
  config = lookup(local.env_config, terraform.workspace, local.env_config["dev"])

  # Common tags that include the workspace name
  common_tags = {
    Environment = terraform.workspace
    ManagedBy   = "terraform"
    Project     = var.project_name
  }
}
```

Now every resource can reference `local.config` to get workspace-appropriate values:

```hcl
# compute.tf

resource "aws_instance" "app" {
  count = local.config.instance_count

  ami           = data.aws_ami.app.id
  instance_type = local.config.instance_type
  subnet_id     = element(aws_subnet.private[*].id, count.index)

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${terraform.workspace}-app-${count.index}"
  })
}
```

## Dynamic Resource Sizing

Beyond simple instance types, you can dynamically size entire resource groups:

```hcl
locals {
  # Subnet configuration changes by environment
  subnet_config = {
    dev = {
      public_count  = 2
      private_count = 2
      cidr_block    = "10.0.0.0/16"
    }
    staging = {
      public_count  = 2
      private_count = 2
      cidr_block    = "10.1.0.0/16"
    }
    production = {
      public_count  = 3
      private_count = 3
      cidr_block    = "10.2.0.0/16"
    }
  }

  subnets = lookup(local.subnet_config, terraform.workspace, local.subnet_config["dev"])
}

resource "aws_vpc" "main" {
  cidr_block = local.subnets.cidr_block

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${terraform.workspace}-vpc"
  })
}

# Number of subnets adapts to workspace
resource "aws_subnet" "public" {
  count = local.subnets.public_count

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-${terraform.workspace}-public-${count.index}"
  })
}
```

## Conditional Resources Per Workspace

Some resources should only exist in certain environments. Use `count` with a workspace check:

```hcl
# WAF only in production
resource "aws_wafv2_web_acl" "main" {
  count = terraform.workspace == "production" ? 1 : 0

  name  = "${var.project_name}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
}

# Detailed monitoring only in staging and production
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  count = local.config.enable_monitoring ? 1 : 0

  alarm_name          = "${var.project_name}-${terraform.workspace}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  alarm_actions = [aws_sns_topic.alerts[0].arn]
}

# SNS topic for monitoring alerts (only when monitoring is enabled)
resource "aws_sns_topic" "alerts" {
  count = local.config.enable_monitoring ? 1 : 0
  name  = "${var.project_name}-${terraform.workspace}-alerts"
}
```

## Dynamic Backend Configuration

Each workspace can use a different backend key. With the S3 backend, workspaces automatically get separate state paths:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

Terraform stores workspace state at `env:/WORKSPACE_NAME/app/terraform.tfstate`. The default workspace uses `app/terraform.tfstate` directly.

## Workspace-Aware Provider Configuration

You can configure providers differently per workspace, though this requires some care:

```hcl
locals {
  # Different AWS accounts per environment
  account_config = {
    dev        = { account_id = "111111111111", role = "DevTerraformRole" }
    staging    = { account_id = "222222222222", role = "StagingTerraformRole" }
    production = { account_id = "333333333333", role = "ProdTerraformRole" }
  }

  target_account = lookup(local.account_config, terraform.workspace, local.account_config["dev"])
}

provider "aws" {
  region = var.aws_region

  assume_role {
    role_arn = "arn:aws:iam::${local.target_account.account_id}:role/${local.target_account.role}"
  }

  default_tags {
    tags = local.common_tags
  }
}
```

This lets you deploy the same configuration to different AWS accounts just by switching workspaces.

## Workspace-Specific Variable Files

You can combine workspaces with `.tfvars` files for values that do not fit neatly in a map:

```bash
# Apply with workspace-specific variables
terraform workspace select staging
terraform apply -var-file="config/${terraform.workspace}.tfvars"
```

Since `terraform.workspace` is not available in the CLI command, use a wrapper script:

```bash
#!/bin/bash
# deploy.sh - Apply with workspace-matched variables

WORKSPACE=$(terraform workspace show)
echo "Deploying to workspace: $WORKSPACE"

terraform apply -var-file="config/${WORKSPACE}.tfvars"
```

```text
config/
  dev.tfvars
  staging.tfvars
  production.tfvars
```

## Data Source Lookups Based on Workspace

Dynamically look up existing resources based on the workspace:

```hcl
# Look up the right certificate for this environment
data "aws_acm_certificate" "main" {
  domain   = "${local.config.domain_prefix}.${var.base_domain}"
  statuses = ["ISSUED"]
}

# Look up the right Route53 zone
data "aws_route53_zone" "main" {
  name = var.base_domain
}

# Create DNS record with workspace-appropriate prefix
resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${local.config.domain_prefix}.${var.base_domain}"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = true
  }
}
```

## Validation and Safety Guards

Add validation to prevent mistakes like accidentally creating production-sized resources in dev:

```hcl
# Validate that the workspace name is one we expect
locals {
  valid_workspaces = ["dev", "staging", "production"]
  workspace_valid  = contains(local.valid_workspaces, terraform.workspace)
}

# This check runs during plan
resource "null_resource" "workspace_check" {
  count = local.workspace_valid ? 0 : 1

  provisioner "local-exec" {
    command = "echo 'ERROR: Invalid workspace ${terraform.workspace}. Valid workspaces: ${join(", ", local.valid_workspaces)}' && exit 1"
  }
}

# Alternative: use a validation in a variable
variable "project_name" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "production"], terraform.workspace)
    error_message = "Workspace must be dev, staging, or production."
  }
}
```

## Limitations to Keep in Mind

Workspaces with dynamic configuration work well for environments that share the same overall structure but differ in sizing and features. They do not work well when:

- Environments have fundamentally different architectures (use separate root modules instead)
- You need different providers or different provider versions per environment
- The number of conditional checks becomes overwhelming (more than 30-40% of resources have workspace conditions)

For those cases, consider separate directories per environment with shared modules, or a tool like Terragrunt that handles the orchestration.

## Wrapping Up

Terraform workspaces combined with dynamic configuration give you a single codebase that adapts to each environment. Use local maps for workspace-aware values, conditional resources for environment-specific features, and workspace-aware providers for multi-account setups. The approach keeps your code DRY while still allowing each environment to be sized and configured appropriately. Start with the local map pattern and expand from there as your needs grow.
