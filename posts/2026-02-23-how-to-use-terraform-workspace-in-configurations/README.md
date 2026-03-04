# How to Use terraform.workspace in Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Configuration, Infrastructure as Code, HCL

Description: Learn how to use the terraform.workspace expression in your Terraform configurations to create dynamic, workspace-aware infrastructure with conditional logic and environment-specific settings.

---

The `terraform.workspace` expression is a built-in value that returns the name of the currently selected workspace as a string. It is the bridge between the workspace CLI commands and your actual Terraform code. Without it, every workspace would create identical resources with the same names, causing conflicts. With it, you can write one configuration that adapts its behavior based on which workspace is active. This post shows you every practical way to use it.

## The Basics

`terraform.workspace` is available everywhere in your Terraform code - resource blocks, data sources, locals, outputs, and even module arguments:

```hcl
# Simple usage - embed workspace name in a resource name
resource "aws_s3_bucket" "data" {
  bucket = "myapp-data-${terraform.workspace}"

  tags = {
    Environment = terraform.workspace
  }
}
```

When you are in the "dev" workspace, the bucket is named `myapp-data-dev`. Switch to "prod" and it becomes `myapp-data-prod`. Same code, different results.

## Resource Naming

The most common use is preventing name collisions across workspaces:

```hcl
# EC2 instances named by workspace
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name        = "web-server-${terraform.workspace}"
    Environment = terraform.workspace
    ManagedBy   = "terraform"
  }
}

# RDS instance with workspace-specific identifier
resource "aws_db_instance" "main" {
  identifier     = "myapp-db-${terraform.workspace}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.micro"
  db_name        = "myapp_${replace(terraform.workspace, "-", "_")}"

  tags = {
    Environment = terraform.workspace
  }
}

# Security group named by workspace
resource "aws_security_group" "web" {
  name        = "web-sg-${terraform.workspace}"
  description = "Web security group for ${terraform.workspace}"
  vpc_id      = aws_vpc.main.id
}
```

Note the `replace()` function for the database name. Database names often cannot contain hyphens, so we swap them for underscores.

## Lookup Maps for Environment Configuration

Rather than scattering conditionals throughout your code, use a local map that ties workspace names to configurations:

```hcl
locals {
  # Central configuration map keyed by workspace name
  env_config = {
    dev = {
      instance_type    = "t3.micro"
      instance_count   = 1
      db_instance_class = "db.t3.micro"
      enable_monitoring = false
      min_capacity     = 1
      max_capacity     = 2
    }
    staging = {
      instance_type    = "t3.small"
      instance_count   = 2
      db_instance_class = "db.t3.small"
      enable_monitoring = true
      min_capacity     = 2
      max_capacity     = 4
    }
    prod = {
      instance_type    = "t3.large"
      instance_count   = 3
      db_instance_class = "db.r6g.large"
      enable_monitoring = true
      min_capacity     = 3
      max_capacity     = 10
    }
  }

  # Get the config for the current workspace, defaulting to dev
  config = lookup(local.env_config, terraform.workspace, local.env_config["dev"])
}

# Now use local.config throughout your resources
resource "aws_instance" "web" {
  count         = local.config.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = local.config.instance_type

  tags = {
    Name        = "web-${terraform.workspace}-${count.index}"
    Environment = terraform.workspace
  }
}

resource "aws_db_instance" "main" {
  identifier     = "db-${terraform.workspace}"
  instance_class = local.config.db_instance_class
  engine         = "postgres"
  engine_version = "15.4"
}

resource "aws_autoscaling_group" "web" {
  name                = "asg-${terraform.workspace}"
  min_size            = local.config.min_capacity
  max_size            = local.config.max_capacity
  desired_capacity    = local.config.instance_count
  launch_template {
    id = aws_launch_template.web.id
  }
}
```

This pattern keeps all environment differences in one place instead of spreading them across dozens of resources.

## Conditional Resource Creation

Sometimes you need resources only in certain environments:

```hcl
# CloudWatch alarms only in production
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  count = terraform.workspace == "prod" ? 1 : 0

  alarm_name          = "high-cpu-${terraform.workspace}"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80

  alarm_actions = [aws_sns_topic.alerts[0].arn]
}

# WAF only in staging and production
resource "aws_wafv2_web_acl" "main" {
  count = contains(["staging", "prod"], terraform.workspace) ? 1 : 0

  name  = "web-acl-${terraform.workspace}"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name               = "web-acl-${terraform.workspace}"
    sampled_requests_enabled  = true
  }
}

# SNS topic for alerts (only where alarms exist)
resource "aws_sns_topic" "alerts" {
  count = terraform.workspace == "prod" ? 1 : 0
  name  = "alerts-${terraform.workspace}"
}
```

## Using workspace in Backend Configuration

While you cannot use interpolation in backend blocks directly, the workspace mechanism integrates with backend key paths automatically. However, you can use `terraform.workspace` in other parts of your configuration that reference the backend:

```hcl
# You CANNOT do this (backend blocks do not support interpolation):
# terraform {
#   backend "s3" {
#     key = "${terraform.workspace}/terraform.tfstate"  # INVALID
#   }
# }

# Instead, the S3 backend automatically prefixes with the workspace:
terraform {
  backend "s3" {
    bucket = "my-state-bucket"
    key    = "app/terraform.tfstate"
    region = "us-east-1"
    # Workspace "dev" stores at: env:/dev/app/terraform.tfstate
    # Workspace "prod" stores at: env:/prod/app/terraform.tfstate
  }
}
```

## Dynamic Provider Configuration

Use `terraform.workspace` to adjust provider settings:

```hcl
locals {
  # Map workspaces to AWS regions
  region_map = {
    dev     = "us-east-1"
    staging = "us-west-2"
    prod    = "eu-west-1"
  }
}

provider "aws" {
  region = lookup(local.region_map, terraform.workspace, "us-east-1")
}
```

## Workspace in Outputs

Outputs can include workspace information for downstream tools:

```hcl
output "environment" {
  description = "The current environment/workspace"
  value       = terraform.workspace
}

output "api_endpoint" {
  description = "The API endpoint for this environment"
  value       = "https://api-${terraform.workspace}.example.com"
}

output "dashboard_url" {
  description = "Link to the monitoring dashboard"
  value       = "https://monitoring.example.com/dashboard/${terraform.workspace}"
}
```

## Workspace in Data Sources

Filter data sources based on the workspace:

```hcl
# Look up the VPC for the current environment
data "aws_vpc" "main" {
  filter {
    name   = "tag:Environment"
    values = [terraform.workspace]
  }
}

# Look up subnets tagged with the current environment
data "aws_subnets" "app" {
  filter {
    name   = "tag:Environment"
    values = [terraform.workspace]
  }

  filter {
    name   = "tag:Tier"
    values = ["application"]
  }
}

# Use an AMI based on the environment
data "aws_ami" "app" {
  most_recent = true

  filter {
    name   = "name"
    values = ["myapp-${terraform.workspace}-*"]
  }

  owners = ["self"]
}
```

## Workspace-Aware Modules

Pass the workspace to modules to make them environment-aware:

```hcl
module "networking" {
  source = "./modules/networking"

  environment    = terraform.workspace
  vpc_cidr       = local.config.vpc_cidr
  enable_nat     = terraform.workspace != "dev"
}

module "database" {
  source = "./modules/database"

  environment    = terraform.workspace
  instance_class = local.config.db_instance_class
  multi_az       = terraform.workspace == "prod"
  backup_retention = terraform.workspace == "prod" ? 30 : 7
}
```

Inside the module, use the passed variable instead of referencing `terraform.workspace` directly. This keeps the module reusable outside of workspace contexts:

```hcl
# modules/database/variables.tf
variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
}

# modules/database/main.tf
resource "aws_db_instance" "this" {
  identifier     = "db-${var.environment}"
  instance_class = var.instance_class
  multi_az       = var.multi_az

  tags = {
    Environment = var.environment
  }
}
```

## Common Pitfalls

**Hardcoding workspace names in conditions.** If someone creates a workspace called "production" instead of "prod", all your `terraform.workspace == "prod"` checks will fail silently. Use a lookup map with a default value instead:

```hcl
# Fragile
resource "aws_instance" "web" {
  instance_type = terraform.workspace == "prod" ? "t3.large" : "t3.micro"
}

# Better - handles unknown workspaces gracefully
locals {
  sizes = {
    dev     = "t3.micro"
    staging = "t3.small"
    prod    = "t3.large"
  }
}

resource "aws_instance" "web" {
  instance_type = lookup(local.sizes, terraform.workspace, "t3.micro")
}
```

**Using terraform.workspace in count with complex conditions.** Keep count expressions simple. Move complex logic into locals:

```hcl
# Hard to read
resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = terraform.workspace == "prod" || terraform.workspace == "staging" ? 1 : 0
  # ...
}

# Clearer
locals {
  enable_monitoring = contains(["prod", "staging"], terraform.workspace)
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  count = local.enable_monitoring ? 1 : 0
  # ...
}
```

## Conclusion

The `terraform.workspace` expression is the glue that makes workspace-based workflows practical. Use it in resource names to avoid collisions, in lookup maps for centralized configuration, in conditions for environment-specific resources, and in outputs for downstream integration. Keep the logic clean by centralizing environment differences in locals rather than scattering conditionals across resources. For managing workspace-specific variables alongside this approach, check out our guide on [workspace-specific variable files](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspace-specific-variable-files-in-terraform/view).
