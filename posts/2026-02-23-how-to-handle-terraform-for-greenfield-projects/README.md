# How to Handle Terraform for Greenfield Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Greenfield, Project Setup, Infrastructure as Code, DevOps

Description: Learn how to set up Terraform for greenfield projects from scratch, covering project structure, module design, state management, CI/CD pipelines, and foundational infrastructure patterns.

---

Greenfield projects are the ideal scenario for Terraform. With no existing infrastructure to import or legacy patterns to accommodate, you can design everything right from the start. But this freedom also brings decisions that have long-lasting consequences. The project structure, state management strategy, and module design choices you make in the first week will affect the project for years to come.

In this guide, we will cover how to set up a greenfield Terraform project with the patterns and practices that scale well over time.

## Project Structure from Day One

Start with a structure that supports growth:

```
my-project/
  infrastructure/
    environments/
      dev/
        main.tf
        variables.tf
        outputs.tf
        backend.tf
        terraform.tfvars
      staging/
        main.tf
        variables.tf
        outputs.tf
        backend.tf
        terraform.tfvars
      production/
        main.tf
        variables.tf
        outputs.tf
        backend.tf
        terraform.tfvars
    modules/
      networking/
        main.tf
        variables.tf
        outputs.tf
        versions.tf
      compute/
        main.tf
        variables.tf
        outputs.tf
        versions.tf
      database/
        main.tf
        variables.tf
        outputs.tf
        versions.tf
      monitoring/
        main.tf
        variables.tf
        outputs.tf
        versions.tf
    shared/
      backend-setup/
        main.tf  # S3 bucket and DynamoDB for state
    tests/
      modules/
        networking_test.go
        compute_test.go
```

## Setting Up the State Backend First

The very first thing to create is your state backend:

```hcl
# infrastructure/shared/backend-setup/main.tf
# Bootstrap: Create the state backend infrastructure
# This is the one thing you run manually before anything else

provider "aws" {
  region = var.region
}

# S3 bucket for Terraform state
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "${var.project_name}-terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}
```

## Configuring Each Environment

Set up each environment with its own backend and variables:

```hcl
# infrastructure/environments/production/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-project-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "my-project-terraform-locks"
  }
}

# infrastructure/environments/production/versions.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = "production"
      ManagedBy   = "terraform"
    }
  }

  # Prevent operations in wrong account
  allowed_account_ids = [var.aws_account_id]
}
```

```hcl
# infrastructure/environments/production/main.tf
# Production environment composition

module "networking" {
  source = "../../modules/networking"

  environment    = "production"
  vpc_cidr       = "10.0.0.0/16"
  azs            = ["us-east-1a", "us-east-1b", "us-east-1c"]
  project_name   = var.project_name
}

module "compute" {
  source = "../../modules/compute"

  environment    = "production"
  vpc_id         = module.networking.vpc_id
  subnet_ids     = module.networking.private_subnet_ids
  instance_count = 3
  instance_type  = "t3.large"
  project_name   = var.project_name
}

module "database" {
  source = "../../modules/database"

  environment        = "production"
  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.database_subnet_ids
  instance_class     = "db.r6g.large"
  multi_az           = true
  backup_retention   = 30
  project_name       = var.project_name
}

module "monitoring" {
  source = "../../modules/monitoring"

  environment  = "production"
  project_name = var.project_name
  alb_arn      = module.compute.alb_arn
  ecs_cluster  = module.compute.ecs_cluster_name
  db_instance  = module.database.db_instance_id
}
```

## Building Foundational Modules

Design modules with reusability and environment parity in mind:

```hcl
# infrastructure/modules/networking/main.tf
# Networking module designed for greenfield projects

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "azs" {
  type = list(string)
}

variable "project_name" {
  type = string
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

# Public subnets for load balancers
resource "aws_subnet" "public" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = var.azs[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${var.azs[count.index]}"
    Tier = "public"
  }
}

# Private subnets for application workloads
resource "aws_subnet" "private" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${local.name_prefix}-private-${var.azs[count.index]}"
    Tier = "private"
  }
}

# Database subnets - isolated tier
resource "aws_subnet" "database" {
  count = length(var.azs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.azs[count.index]

  tags = {
    Name = "${local.name_prefix}-database-${var.azs[count.index]}"
    Tier = "database"
  }
}

# NAT Gateway for private subnet internet access
resource "aws_nat_gateway" "main" {
  count = var.environment == "production" ? length(var.azs) : 1

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${local.name_prefix}-nat-${count.index}"
  }
}

resource "aws_eip" "nat" {
  count  = var.environment == "production" ? length(var.azs) : 1
  domain = "vpc"
}

# VPC Flow Logs for security auditing
resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
}
```

## Setting Up CI/CD from the Start

Configure CI/CD immediately so all changes go through the pipeline:

```yaml
# .github/workflows/terraform.yaml
name: Terraform CI/CD

on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  plan:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Plan
        working-directory: infrastructure/environments/${{ matrix.environment }}
        run: |
          terraform init
          terraform plan -out=tfplan

      - name: Post Plan
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            // Post plan summary as PR comment

  apply-dev:
    if: github.ref == 'refs/heads/main'
    needs: plan
    runs-on: ubuntu-latest
    environment: dev
    steps:
      - uses: actions/checkout@v4
      - name: Apply Dev
        working-directory: infrastructure/environments/dev
        run: |
          terraform init
          terraform apply -auto-approve

  apply-staging:
    needs: apply-dev
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Apply Staging
        working-directory: infrastructure/environments/staging
        run: |
          terraform init
          terraform apply -auto-approve

  apply-production:
    needs: apply-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - uses: actions/checkout@v4
      - name: Apply Production
        working-directory: infrastructure/environments/production
        run: |
          terraform init
          terraform apply -auto-approve
```

## Best Practices for Greenfield Projects

Use consistent naming from day one. Define a naming convention and apply it to every resource. Changing names later means destroying and recreating resources.

Create modules for everything, even small configurations. The overhead of a module is minimal, but the reusability and testability benefits are significant.

Pin all versions. Terraform version, provider versions, and module versions should all be pinned from the start.

Set up monitoring alongside infrastructure. Do not wait to add monitoring. Include it in your initial deployment so you have visibility from the first day.

Use separate state files per environment from the beginning. It is much harder to split a shared state file later.

## Conclusion

Greenfield projects give you the opportunity to build your Terraform infrastructure right from the start. By establishing a clean project structure, setting up proper state management, building reusable modules, and configuring CI/CD pipelines early, you create a foundation that scales well as your project grows. Take advantage of the clean slate to implement best practices that would be difficult to retrofit into an existing codebase.
