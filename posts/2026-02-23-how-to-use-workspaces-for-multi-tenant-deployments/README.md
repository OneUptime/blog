# How to Use Workspaces for Multi-Tenant Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Multi-Tenant, SaaS, Infrastructure as Code, DevOps

Description: Learn how to use Terraform workspaces to manage isolated infrastructure for multiple tenants in a SaaS or multi-customer deployment.

---

When you run a SaaS product or managed service, each customer or tenant often needs their own isolated set of infrastructure resources. Terraform workspaces provide a clean way to manage this - one workspace per tenant, one configuration, and complete isolation between tenants' infrastructure. This guide walks through the practical setup, patterns, and trade-offs.

## The Multi-Tenant Workspace Model

The idea is straightforward. Each tenant gets a Terraform workspace, and the workspace name maps to the tenant identifier. All tenants share the same Terraform configuration, but each one has its own state file and its own set of resources.

```bash
# Create a workspace for each tenant
terraform workspace new tenant-acme
terraform workspace new tenant-globex
terraform workspace new tenant-initech

# Deploy infrastructure for a specific tenant
terraform workspace select tenant-acme
terraform apply -var-file="tenants/acme.tfvars"
```

## Tenant Configuration Files

Each tenant typically has different requirements - different sizes, different regions, different features enabled. Store these in per-tenant variable files:

```hcl
# tenants/acme.tfvars
tenant_name     = "acme"
tenant_domain   = "acme.example.com"
environment     = "prod"
region          = "us-east-1"
instance_type   = "t3.large"
instance_count  = 3
db_class        = "db.r5.large"
storage_gb      = 500
enable_cdn      = true
enable_waf      = true
backup_retention = 30
contact_email   = "ops@acme.com"
```

```hcl
# tenants/globex.tfvars
tenant_name     = "globex"
tenant_domain   = "globex.example.com"
environment     = "prod"
region          = "eu-west-1"
instance_type   = "t3.medium"
instance_count  = 2
db_class        = "db.t3.large"
storage_gb      = 200
enable_cdn      = false
enable_waf      = true
backup_retention = 14
contact_email   = "infra@globex.com"
```

## Core Infrastructure Configuration

The Terraform configuration uses `terraform.workspace` combined with the tenant variables to create isolated resources:

```hcl
# variables.tf
variable "tenant_name" {
  description = "Tenant identifier"
  type        = string
}

variable "tenant_domain" {
  description = "Custom domain for the tenant"
  type        = string
}

variable "region" {
  description = "AWS region for this tenant"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "instance_count" {
  description = "Number of application instances"
  type        = number
}

variable "db_class" {
  description = "RDS instance class"
  type        = string
}

variable "storage_gb" {
  description = "Database storage in GB"
  type        = number
}

variable "enable_cdn" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = false
}

variable "enable_waf" {
  description = "Enable WAF"
  type        = bool
  default     = true
}

variable "backup_retention" {
  description = "Database backup retention in days"
  type        = number
  default     = 7
}

variable "contact_email" {
  description = "Contact email for this tenant"
  type        = string
}
```

```hcl
# main.tf
locals {
  # Use workspace name for resource naming
  name_prefix = terraform.workspace

  # Standard tags for all tenant resources
  common_tags = {
    Tenant      = var.tenant_name
    ManagedBy   = "terraform"
    Workspace   = terraform.workspace
    Environment = var.environment
  }
}

# Each tenant gets their own VPC
resource "aws_vpc" "tenant" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

# Private subnets for the application
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.tenant.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-${count.index + 1}"
    Tier = "private"
  })
}

# Public subnets for load balancers
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.tenant.id
  cidr_block              = cidrsubnet("10.0.0.0/16", 8, count.index + 100)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-${count.index + 1}"
    Tier = "public"
  })
}
```

## Tenant-Specific Database Setup

```hcl
# database.tf
resource "aws_db_subnet_group" "tenant" {
  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = local.common_tags
}

resource "aws_db_instance" "tenant" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "15.4"

  instance_class    = var.db_class
  allocated_storage = var.storage_gb

  db_name  = replace(var.tenant_name, "-", "_")
  username = "admin_${replace(var.tenant_name, "-", "_")}"
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.tenant.name
  vpc_security_group_ids = [aws_security_group.db.id]

  multi_az            = var.instance_count > 1
  backup_retention_period = var.backup_retention
  deletion_protection = true

  # Encrypt data at rest - important for multi-tenant
  storage_encrypted = true
  kms_key_id        = aws_kms_key.tenant.arn

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db"
  })
}

# Each tenant gets their own encryption key
resource "aws_kms_key" "tenant" {
  description             = "Encryption key for tenant ${var.tenant_name}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = local.common_tags
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Store credentials in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${local.name_prefix}/db-credentials"

  tags = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = aws_db_instance.tenant.username
    password = random_password.db_password.result
    host     = aws_db_instance.tenant.endpoint
    port     = aws_db_instance.tenant.port
    dbname   = aws_db_instance.tenant.db_name
  })
}
```

## Application Deployment Per Tenant

```hcl
# application.tf
resource "aws_lb" "tenant" {
  name               = "${local.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = local.common_tags
}

resource "aws_ecs_cluster" "tenant" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

resource "aws_ecs_service" "app" {
  name            = "${local.name_prefix}-app"
  cluster         = aws_ecs_cluster.tenant.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.instance_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.app.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8080
  }

  tags = local.common_tags
}
```

## Automation for Tenant Onboarding

When a new customer signs up, you need a streamlined process to provision their infrastructure:

```bash
#!/bin/bash
# onboard-tenant.sh
# Usage: ./onboard-tenant.sh <tenant-name> <region>

set -e

TENANT_NAME=$1
REGION=$2
WORKSPACE="tenant-${TENANT_NAME}"

if [ -z "$TENANT_NAME" ] || [ -z "$REGION" ]; then
  echo "Usage: $0 <tenant-name> <region>"
  exit 1
fi

echo "Onboarding tenant: $TENANT_NAME in $REGION"

# Check if the tenant config file exists
TFVARS="tenants/${TENANT_NAME}.tfvars"
if [ ! -f "$TFVARS" ]; then
  echo "ERROR: Tenant config file not found: $TFVARS"
  echo "Create the config file first, then run this script."
  exit 1
fi

# Initialize Terraform
terraform init

# Create the workspace
if terraform workspace list | grep -q "$WORKSPACE"; then
  echo "Workspace $WORKSPACE already exists - selecting it"
  terraform workspace select "$WORKSPACE"
else
  echo "Creating workspace: $WORKSPACE"
  terraform workspace new "$WORKSPACE"
fi

# Plan the deployment
echo "Planning infrastructure for $TENANT_NAME..."
terraform plan -var-file="$TFVARS" -out="${TENANT_NAME}.tfplan"

# Apply
echo "Deploying infrastructure..."
terraform apply "${TENANT_NAME}.tfplan"

# Output connection info
echo ""
echo "=== Tenant $TENANT_NAME Provisioned ==="
terraform output -json > "tenants/${TENANT_NAME}-outputs.json"
echo "Outputs saved to tenants/${TENANT_NAME}-outputs.json"
```

## Offboarding a Tenant

When a customer leaves, you need to cleanly remove their infrastructure:

```bash
#!/bin/bash
# offboard-tenant.sh
# Usage: ./offboard-tenant.sh <tenant-name>

set -e

TENANT_NAME=$1
WORKSPACE="tenant-${TENANT_NAME}"

echo "WARNING: This will destroy all infrastructure for tenant $TENANT_NAME"
read -p "Type the tenant name to confirm: " confirm

if [ "$confirm" != "$TENANT_NAME" ]; then
  echo "Confirmation failed. Aborting."
  exit 1
fi

# Select the tenant workspace
terraform workspace select "$WORKSPACE"

# Create a final backup of the state
terraform state pull > "backups/${TENANT_NAME}-final-$(date +%Y%m%d).json"

# Disable deletion protection on resources that have it
echo "Disabling deletion protection..."
terraform apply -var-file="tenants/${TENANT_NAME}.tfvars" \
  -var="deletion_protection=false" \
  -target=aws_db_instance.tenant \
  -auto-approve

# Destroy all resources
terraform destroy -var-file="tenants/${TENANT_NAME}.tfvars" -auto-approve

# Clean up the workspace
terraform workspace select default
terraform workspace delete "$WORKSPACE"

echo "Tenant $TENANT_NAME has been fully offboarded."
```

## Monitoring Across Tenants

Keep track of all tenant workspaces with a simple inventory script:

```bash
#!/bin/bash
# tenant-inventory.sh
# Lists all tenant workspaces and their resource counts

echo "Tenant Infrastructure Inventory"
echo "================================"
printf "%-30s %-10s %-10s\n" "Workspace" "Resources" "Status"
echo "---------------------------------------------------"

terraform workspace list | tr -d ' *' | grep "^tenant-" | while read ws; do
  terraform workspace select "$ws" 2>/dev/null
  count=$(terraform state list 2>/dev/null | wc -l | tr -d ' ')

  if [ "$count" -gt 0 ]; then
    status="Active"
  else
    status="Empty"
  fi

  printf "%-30s %-10s %-10s\n" "$ws" "$count" "$status"
done
```

## When Workspaces Are Not Enough

Workspaces work well when tenants need the same general architecture with different sizing. If tenants need fundamentally different configurations - different cloud providers, different compliance requirements, or custom integrations - you might outgrow the workspace model. In that case, consider using separate Terraform root modules for each tenant category and keep workspaces for the environment dimension (dev, staging, prod) within each tenant's module.

## Summary

Terraform workspaces provide a clean abstraction for multi-tenant infrastructure. Each tenant gets isolated state, isolated resources, and can be independently scaled, updated, or decommissioned. The combination of workspace-per-tenant with per-tenant variable files gives you both consistency and customization. For more workspace patterns, check out our post on [handling workspace naming conventions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-naming-in-terraform-workspace/view).
