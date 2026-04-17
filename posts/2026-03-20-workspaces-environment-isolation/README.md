# How to Use Workspaces for Environment Isolation in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Workspaces

Description: Learn how to use OpenTofu workspaces to isolate infrastructure environments (dev, staging, prod) using a single configuration with environment-specific variable files.

## Introduction

Workspaces provide state isolation between environments, allowing a single OpenTofu configuration to manage dev, staging, and production environments with separate, isolated state files. This guide shows practical patterns for workspace-based environment isolation.

## Setting Up the Workspace Structure

```bash
# Initialize and create workspaces

tofu init

tofu workspace new development
tofu workspace new staging
tofu workspace new production

tofu workspace list
#   default
#   development
# * production
#   staging
```

## Environment-Specific Variable Files

Each environment has its own `.tfvars` file:

```hcl
# development.tfvars
environment        = "development"
instance_type      = "t3.micro"
instance_count     = 1
enable_monitoring  = false
db_instance_class  = "db.t3.micro"
domain_prefix      = "dev"
min_capacity       = 1
max_capacity       = 2
```

```hcl
# staging.tfvars
environment        = "staging"
instance_type      = "t3.small"
instance_count     = 2
enable_monitoring  = true
db_instance_class  = "db.t3.small"
domain_prefix      = "staging"
min_capacity       = 1
max_capacity       = 4
```

```hcl
# production.tfvars
environment        = "production"
instance_type      = "t3.large"
instance_count     = 3
enable_monitoring  = true
db_instance_class  = "db.r5.large"
domain_prefix      = "api"
min_capacity       = 3
max_capacity       = 10
```

## Configuration Using terraform.workspace

```hcl
# main.tf
variable "environment" {
  type = string
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "instance_count" {
  type    = number
  default = 1
}

# Validate that the workspace matches the environment variable
locals {
  # Use workspace as the authoritative source of environment
  environment = terraform.workspace
}

resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name        = "app-${local.environment}-${count.index + 1}"
    Environment = local.environment
    ManagedBy   = "OpenTofu"
  }
}
```

## Workspace-Based Naming Convention

```hcl
locals {
  prefix = "${var.project_name}-${terraform.workspace}"
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    Name        = "${local.prefix}-vpc"
    Environment = terraform.workspace
  }
}

resource "aws_s3_bucket" "app" {
  bucket = "${local.prefix}-app-data-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${local.prefix}-app-data"
    Environment = terraform.workspace
  }
}
```

## Deployment Pipeline

```bash
#!/bin/bash
# deploy.sh

ENVIRONMENT="${1:-development}"
TFVARS_FILE="${ENVIRONMENT}.tfvars"

echo "Deploying to: $ENVIRONMENT"

# Validate environment
if ! tofu workspace list | grep -q "$ENVIRONMENT"; then
  echo "Creating workspace: $ENVIRONMENT"
  tofu workspace new "$ENVIRONMENT"
else
  tofu workspace select "$ENVIRONMENT"
fi

echo "Active workspace: $(tofu workspace show)"

# Plan
tofu plan \
  -var-file="$TFVARS_FILE" \
  -out="${ENVIRONMENT}.tfplan"

# Show plan summary
tofu show "${ENVIRONMENT}.tfplan"

# Apply with confirmation for production
if [ "$ENVIRONMENT" = "production" ]; then
  echo "WARNING: Applying to PRODUCTION. Type 'yes' to confirm:"
  read -r CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo "Aborted"
    exit 1
  fi
fi

tofu apply "${ENVIRONMENT}.tfplan"
echo "Deployment to $ENVIRONMENT complete"
```

## Isolation Validation

Verify that workspaces are truly isolated:

```bash
# Check what resources exist in each workspace

tofu workspace select development
echo "=== Development Resources ==="
tofu state list

tofu workspace select production
echo "=== Production Resources ==="
tofu state list

# Each should show different resource instances
```

## Common Pitfalls

### Using the Same Resource Names Across Workspaces

```hcl
# BAD: Same bucket name in all environments - will fail
resource "aws_s3_bucket" "app" {
  bucket = "my-app-bucket"  # S3 bucket names must be globally unique
}

# GOOD: Include workspace in the name
resource "aws_s3_bucket" "app" {
  bucket = "my-app-${terraform.workspace}-bucket-${data.aws_caller_identity.current.account_id}"
}
```

## Conclusion

Workspaces provide a clean mechanism for environment isolation when all environments share the same infrastructure shape and differ only in scale or configuration. The combination of workspace-specific state files with environment-specific `.tfvars` files creates a maintainable multi-environment setup. Use `terraform.workspace` in your naming and tagging to clearly distinguish resources across environments.
