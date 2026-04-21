# How to Use terraform.workspace Expression in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces

Description: Learn how to use the terraform.workspace expression in OpenTofu configurations to create workspace-aware resources, names, and behaviors.

## Introduction

The `terraform.workspace` expression returns the name of the current workspace as a string. It's available anywhere OpenTofu expressions are allowed and is the primary mechanism for writing workspace-aware OpenTofu code. This guide covers practical patterns for using this expression effectively.

## Basic Usage

```hcl
# The current workspace name is a string

output "current_workspace" {
  value = terraform.workspace
}

# Use it in resource naming
resource "aws_s3_bucket" "app" {
  bucket = "my-app-${terraform.workspace}-data"
}

# Use it in tags
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name        = "web-${terraform.workspace}"
    Environment = terraform.workspace
  }
}
```

## Workspace-Conditional Instance Types

```hcl
locals {
  instance_type = terraform.workspace == "production" ? "t3.large" : "t3.micro"
}

resource "aws_instance" "app" {
  instance_type = local.instance_type
}
```

## Map-Based Workspace Configuration

```hcl
locals {
  workspace_config = {
    default = {
      instance_type = "t3.micro"
      count         = 1
    }
    development = {
      instance_type = "t3.micro"
      count         = 1
    }
    staging = {
      instance_type = "t3.small"
      count         = 2
    }
    production = {
      instance_type = "t3.large"
      count         = 5
    }
  }

  # Safely lookup current workspace config with fallback
  config = lookup(local.workspace_config, terraform.workspace, local.workspace_config.default)
}

resource "aws_autoscaling_group" "app" {
  min_size         = local.config.count
  max_size         = local.config.count * 2
  desired_capacity = local.config.count
}
```

## Boolean Flags per Workspace

```hcl
locals {
  is_production = terraform.workspace == "production"
  is_staging    = terraform.workspace == "staging"
  is_lower_env  = !local.is_production && !local.is_staging
}

resource "aws_db_instance" "main" {
  instance_class            = local.is_production ? "db.r5.large" : "db.t3.micro"
  multi_az                  = local.is_production
  deletion_protection       = local.is_production
  skip_final_snapshot       = local.is_lower_env
  final_snapshot_identifier = local.is_lower_env ? null : "main-${terraform.workspace}-final-snapshot"

  backup_retention_period = local.is_production ? 30 : (
    local.is_staging ? 7 : 1
  )
}
```

## Dynamic Resource Counts

```hcl
resource "aws_nat_gateway" "main" {
  # Production: one NAT gateway per AZ (high availability)
  # Other environments: single NAT gateway (cost savings)
  count = terraform.workspace == "production" ? length(var.availability_zones) : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}
```

## Workspace in Data Source Filters

```hcl
# Get the correct AMI per environment
data "aws_ami" "app" {
  most_recent = true

  filter {
    name   = "name"
    values = ["my-app-${terraform.workspace}-*"]
  }

  owners = ["self"]
}
```

## Workspace in Module Calls

```hcl
module "database" {
  source = "./modules/rds"

  environment    = terraform.workspace
  instance_class = terraform.workspace == "production" ? "db.r5.large" : "db.t3.micro"
  multi_az       = terraform.workspace == "production"
  name           = "app-${terraform.workspace}"
}
```

## Dynamic Sub-Domain Routing

```hcl
locals {
  domain_prefixes = {
    production  = "api"
    staging     = "api-staging"
    development = "api-dev"
  }

  subdomain = lookup(local.domain_prefixes, terraform.workspace, "api-${terraform.workspace}")
  fqdn      = "${local.subdomain}.example.com"
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = local.fqdn
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

output "api_endpoint" {
  value = "https://${local.fqdn}"
}
```

## Preventing Default Workspace in Production

```hcl
resource "terraform_data" "workspace_guard" {
  lifecycle {
    precondition {
      # Fail fast if someone tries to run in the default workspace
      condition     = terraform.workspace != "default"
      error_message = "Do not run in the 'default' workspace. Select a named workspace: development, staging, or production."
    }
  }
}
```

## Conclusion

The `terraform.workspace` expression is a powerful building block for environment-aware infrastructure code. Use it for naming, tagging, conditional sizing, and behavioral differences between environments. Combine it with `lookup()` for map-based configurations and boolean locals for cleaner conditionals. Keep the workspace-specific logic in `locals` to avoid scattering `terraform.workspace` references throughout your resource definitions.
