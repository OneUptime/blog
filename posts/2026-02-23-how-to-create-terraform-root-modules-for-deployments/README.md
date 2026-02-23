# How to Create Terraform Root Modules for Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Deployments, Infrastructure as Code, DevOps

Description: A practical guide to structuring Terraform root modules for real-world deployments with proper state management, variable handling, and environment separation.

---

A root module in Terraform is the working directory where you run `terraform apply`. It is the entry point for your deployment, the place where you wire together child modules, configure providers, set up backends, and define the overall shape of your infrastructure. Getting root module design right has a massive impact on how maintainable your Terraform code stays over time.

## What Makes a Root Module Different

Every Terraform configuration has exactly one root module. When you run `terraform plan` in a directory, that directory is your root module. Child modules are called from within it using `module` blocks. The root module is special because it is where you:

- Configure providers and their authentication
- Set up the state backend
- Define input variables that come from the environment or CI/CD pipeline
- Call child modules and wire their outputs together
- Define any environment-specific logic

## Basic Root Module Structure

Here is a clean structure for a root module that deploys a web application:

```hcl
# root module structure
# environments/production/
#   main.tf          - Module calls and resource wiring
#   providers.tf     - Provider configuration
#   backend.tf       - State backend configuration
#   variables.tf     - Input variable declarations
#   outputs.tf       - Output declarations
#   terraform.tfvars - Variable values for this environment
#   versions.tf      - Required provider versions

# versions.tf - Lock your provider versions
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Configuring the Backend

The root module is where you define your state backend. Never use local state for real deployments.

```hcl
# backend.tf - Remote state configuration
terraform {
  backend "s3" {
    bucket         = "mycompany-terraform-state"
    key            = "production/web-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

Each environment should have its own state file. The `key` parameter in the backend configuration is what separates production state from staging state.

## Provider Configuration

Providers belong in the root module. Child modules should never configure providers directly - they inherit them from the root.

```hcl
# providers.tf - Provider setup with authentication
provider "aws" {
  region = var.aws_region

  # Use assume role for cross-account deployments
  assume_role {
    role_arn = var.deploy_role_arn
  }

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "terraform"
      Project     = var.project_name
    }
  }
}

# Secondary provider for a different region (e.g., for CloudFront certs)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  assume_role {
    role_arn = var.deploy_role_arn
  }
}
```

## Defining Input Variables

Root module variables serve as the interface between your CI/CD pipeline (or human operator) and the infrastructure. Keep them focused and well-documented.

```hcl
# variables.tf - Root module inputs
variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be production, staging, or development."
  }
}

variable "aws_region" {
  description = "AWS region for resource deployment"
  type        = string
  default     = "us-east-1"
}

variable "deploy_role_arn" {
  description = "IAM role ARN for cross-account deployment"
  type        = string
}

variable "project_name" {
  description = "Name of the project for resource naming and tagging"
  type        = string
  default     = "web-app"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "instance_type" {
  description = "EC2 instance type for the application servers"
  type        = string
  default     = "t3.medium"
}

variable "min_capacity" {
  description = "Minimum number of instances in the auto scaling group"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of instances in the auto scaling group"
  type        = number
  default     = 10
}
```

## Wiring Modules Together in main.tf

This is where the root module shines. You compose child modules and pass data between them.

```hcl
# main.tf - The core of the root module

# Networking layer
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.1.0"

  name               = "${var.project_name}-${var.environment}"
  cidr_block         = var.vpc_cidr
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]

  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
}

# Database layer
module "database" {
  source = "git::https://github.com/myorg/terraform-aws-rds.git?ref=v1.3.0"

  name                = "${var.project_name}-${var.environment}"
  engine              = "postgres"
  engine_version      = "15.4"
  instance_class      = var.environment == "production" ? "db.r6g.xlarge" : "db.t3.medium"

  # Wire VPC outputs to database inputs
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.private_subnet_ids
  allowed_cidr_blocks = module.vpc.private_subnet_cidrs

  multi_az            = var.environment == "production"
  backup_retention    = var.environment == "production" ? 30 : 7
}

# Application layer
module "app" {
  source = "git::https://github.com/myorg/terraform-aws-ecs-service.git?ref=v3.0.1"

  name            = "${var.project_name}-${var.environment}"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  # Pass database connection info to the application
  environment_variables = {
    DB_HOST     = module.database.endpoint
    DB_PORT     = module.database.port
    DB_NAME     = module.database.database_name
    ENVIRONMENT = var.environment
  }

  instance_type = var.instance_type
  min_capacity  = var.min_capacity
  max_capacity  = var.max_capacity
}

# Load balancer in front of the application
module "alb" {
  source = "git::https://github.com/myorg/terraform-aws-alb.git?ref=v1.2.0"

  name       = "${var.project_name}-${var.environment}"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  target_group_arn = module.app.target_group_arn
  certificate_arn  = var.environment == "production" ? var.production_cert_arn : var.staging_cert_arn
}
```

## Environment-Specific Values

Use `.tfvars` files for environment-specific values:

```hcl
# environments/production/terraform.tfvars
environment    = "production"
aws_region     = "us-east-1"
deploy_role_arn = "arn:aws:iam::123456789012:role/TerraformDeploy"
vpc_cidr       = "10.0.0.0/16"
instance_type  = "t3.large"
min_capacity   = 3
max_capacity   = 20

# environments/staging/terraform.tfvars
environment    = "staging"
aws_region     = "us-east-1"
deploy_role_arn = "arn:aws:iam::987654321098:role/TerraformDeploy"
vpc_cidr       = "10.1.0.0/16"
instance_type  = "t3.medium"
min_capacity   = 1
max_capacity   = 4
```

## Outputs for Downstream Consumers

Root module outputs make key information available to other systems or Terraform configurations.

```hcl
# outputs.tf - Expose important values
output "vpc_id" {
  description = "ID of the deployed VPC"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = module.alb.dns_name
}

output "database_endpoint" {
  description = "RDS endpoint for the database"
  value       = module.database.endpoint
  sensitive   = true
}

output "app_service_name" {
  description = "Name of the ECS service"
  value       = module.app.service_name
}
```

## One Root Module per Environment vs. Shared Root Module

There are two common patterns. The first uses separate directories per environment, each with its own root module. The second uses a single root module with different `.tfvars` files.

Separate directories give you more isolation but can lead to drift between environments. A shared root module with different variable files keeps environments consistent but requires discipline around the use of conditionals.

For most teams, I recommend starting with a shared root module and separate `.tfvars` files. As complexity grows, you may split into separate directories if environments need fundamentally different architectures.

## Running Deployments

```bash
# Initialize the root module
terraform init

# Plan with environment-specific variables
terraform plan -var-file="environments/production/terraform.tfvars" -out=plan.tfplan

# Apply the plan
terraform apply plan.tfplan
```

## Conclusion

Root modules are the control center for your Terraform deployments. They should be thin - mostly wiring, configuration, and environment-specific decisions. The actual resource logic belongs in child modules. Keep your root modules focused on composing infrastructure from well-tested building blocks, and you will have a much easier time managing deployments across environments.

For more on structuring modules, see our guide on [how to organize child modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-child-modules-in-terraform/view) and [how to version Terraform modules with Git tags](https://oneuptime.com/blog/post/2026-02-23-how-to-version-terraform-modules-with-git-tags/view).
