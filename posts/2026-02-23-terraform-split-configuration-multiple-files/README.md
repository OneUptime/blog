# How to Split Terraform Configuration Across Multiple Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, File Organization, Best Practices, Infrastructure as Code

Description: Learn how to split Terraform configuration across multiple files for better organization, readability, and maintainability of your infrastructure code.

---

A single `main.tf` file works fine for small projects. But once your infrastructure grows beyond a handful of resources, cramming everything into one file becomes painful. Terraform lets you split your configuration across as many `.tf` files as you want within a directory. It reads them all and treats them as a single configuration.

This post covers strategies for splitting your configuration effectively.

## Terraform Reads All .tf Files

Every file ending in `.tf` in the same directory is part of the same Terraform module. Terraform loads them all, merges them, and processes the combined result. The filenames do not matter to Terraform - they are for human organization only.

```text
# All of these files are treated as one configuration
project/
  main.tf
  variables.tf
  outputs.tf
  providers.tf
```

Is functionally identical to having everything in a single `main.tf`. Terraform does not care how you split things up.

## The Standard File Layout

Most Terraform projects follow a conventional file layout. While not required, it helps anyone reading your code find what they need quickly:

```text
project/
  versions.tf      # terraform block (required_version, required_providers)
  providers.tf     # provider configuration blocks
  variables.tf     # input variable declarations
  main.tf          # primary resources
  outputs.tf       # output value declarations
  locals.tf        # local value definitions
  data.tf          # data source definitions
  terraform.tfvars # variable values (optional, often gitignored)
```

### versions.tf

```hcl
# versions.tf - Terraform and provider version constraints

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket = "my-terraform-state"
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}
```

### providers.tf

```hcl
# providers.tf - Provider configurations

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}
```

### variables.tf

```hcl
# variables.tf - Input variable declarations

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
}
```

### outputs.tf

```hcl
# outputs.tf - Output values

output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}
```

## Splitting by Resource Type

For medium-sized projects, splitting by resource type or service works well:

```text
project/
  versions.tf
  providers.tf
  variables.tf
  outputs.tf
  locals.tf
  networking.tf      # VPC, subnets, route tables, NAT gateways
  security.tf        # security groups, NACLs
  compute.tf         # EC2 instances, launch templates, ASGs
  database.tf        # RDS, DynamoDB, ElastiCache
  storage.tf         # S3 buckets, EFS
  dns.tf             # Route53 zones and records
  iam.tf             # IAM roles, policies, instance profiles
  monitoring.tf      # CloudWatch alarms, dashboards
```

### networking.tf

```hcl
# networking.tf - VPC and networking resources

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "public" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-public-${count.index}"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}
```

### iam.tf

```hcl
# iam.tf - IAM roles and policies

resource "aws_iam_role" "app" {
  name = "${var.project_name}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.project_name}-app-profile"
  role = aws_iam_role.app.name
}
```

## Splitting by Feature or Service

For larger projects, group resources by the feature or service they support:

```text
project/
  versions.tf
  providers.tf
  variables.tf
  outputs.tf
  api-gateway.tf     # API Gateway, routes, integrations
  auth-service.tf    # Cognito, Lambda authorizers
  web-app.tf         # CloudFront, S3, Route53
  worker-service.tf  # SQS, Lambda, DLQ
  shared-vpc.tf      # VPC that all services use
```

Each file contains all the resources that belong to that service - IAM roles, security groups, compute, storage, and so on.

## When to Use Modules Instead

At some point, splitting files is not enough. If you find yourself with:
- Resources that are logically independent (different lifecycle, different team)
- Infrastructure that repeats across environments
- Groups of resources that always go together

It is time to extract into modules:

```text
project/
  versions.tf
  providers.tf
  variables.tf
  outputs.tf
  main.tf               # module calls
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
```

```hcl
# main.tf - calling modules

module "networking" {
  source = "./modules/networking"

  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

module "compute" {
  source = "./modules/compute"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids
  environment = var.environment
}

module "database" {
  source = "./modules/database"

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.database_subnet_ids
  environment = var.environment
}
```

## References Across Files

Resources in different files can reference each other freely. Terraform resolves all references across all files in the module:

```hcl
# networking.tf
resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr
}

# compute.tf - references a resource from networking.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public[0].id  # defined in networking.tf

  vpc_security_group_ids = [aws_security_group.web.id]  # defined in security.tf
}

# security.tf - references resources from networking.tf
resource "aws_security_group" "web" {
  vpc_id = aws_vpc.main.id  # defined in networking.tf
  name   = "web-sg"
}
```

## Variable Files (.tfvars)

Variable values go in separate `.tfvars` files:

```text
project/
  variables.tf           # variable declarations
  terraform.tfvars       # default variable values (auto-loaded)
  dev.tfvars             # dev environment values
  staging.tfvars         # staging environment values
  production.tfvars      # production environment values
```

```hcl
# terraform.tfvars (auto-loaded)
project_name = "myapp"
aws_region   = "us-east-1"

# production.tfvars (loaded with -var-file flag)
environment    = "production"
instance_type  = "t3.large"
instance_count = 3
```

```bash
# Apply with a specific variable file
terraform apply -var-file="production.tfvars"
```

## Anti-Patterns to Avoid

**One file per resource**: Do not create a separate file for every single resource. If your VPC, subnet, and route table each have their own file, the project becomes hard to navigate. Group related resources together.

**Too many files**: If you have 50 `.tf` files in one directory, consider using modules instead of files.

**Unclear file names**: File names like `misc.tf` or `other.tf` suggest the code should be organized differently.

## Wrapping Up

Splitting Terraform configuration across multiple files is about human readability, not Terraform requirements. Start with the standard layout (versions, providers, variables, main, outputs), then split by resource type or feature as the project grows. When files alone are not enough, graduate to modules. The goal is for any team member to open the project and quickly find the resource they need.

For related topics, see [How to Understand Terraform File Loading Order](https://oneuptime.com/blog/post/2026-02-23-terraform-file-loading-order/view) and [How to Use Override Files in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-override-files/view).
