# How to Structure an OpenTofu Project Directory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Project Structure, Best Practice, Infrastructure as Code, Organization, DevOps

Description: Learn how to organize an OpenTofu project directory with a consistent layout that separates environments, modules, and shared resources for maximum maintainability.

## Introduction

A well-structured OpenTofu project makes it easy to navigate, test, and review infrastructure changes. This guide presents a battle-tested directory layout that works for projects from small startups to enterprise deployments.

## Recommended Directory Structure

```text
infrastructure/
├── environments/
│   ├── dev/
│   │   ├── backend.tf           # Backend config for dev
│   │   ├── main.tf              # Module calls for dev
│   │   ├── variables.tf         # Dev-specific variable declarations
│   │   ├── terraform.tfvars     # Dev variable values (no secrets)
│   │   ├── outputs.tf
│   │   └── .terraform.lock.hcl  # COMMITTED - provider version lock
│   ├── staging/
│   │   └── ... (same structure)
│   └── prod/
│       └── ... (same structure)
├── modules/
│   ├── shared/
│   │   ├── data-sources.tf      # Shared data lookups exposed as outputs
│   │   ├── locals.tf            # Local values used inside this module
│   │   └── outputs.tf
│   ├── vpc/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── README.md
│   ├── eks/
│   │   └── ...
│   └── rds/
│       └── ...
├── .gitignore
└── README.md
```

## Standard Files in Each Environment

```hcl
# environments/prod/backend.tf

terraform {
  required_version = ">= 1.8"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "my-opentofu-state"
    key            = "prod/tofu.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-locks"
    encrypt        = true
  }
}
```

```hcl
# environments/prod/main.tf
module "networking" {
  source      = "../../modules/vpc"
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

module "eks" {
  source          = "../../modules/eks"
  environment     = var.environment
  vpc_id          = module.networking.vpc_id
  private_subnets = module.networking.private_subnet_ids
}
```

## Module Internal Structure

```hcl
# modules/vpc/variables.tf
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

```hcl
# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}
```

## .gitignore

```gitignore
# .gitignore

# Downloaded providers and modules
.terraform/

# Never commit local state
*.tfstate
*.tfstate.backup

# Exclude secret var files
*.tfvars

# But include an example template
!example.tfvars

# Workspace state
.terraform.tfstate

# Provider crash logs
crash.log

# Binary plan files
*.tfplan
```

## Conclusion

A consistent directory structure with environments at the top, reusable modules in a separate directory, and standardized files within each environment makes OpenTofu projects navigable by any team member. The key principles: keep environments DRY by sharing modules, separate variable declarations from values, and always commit the lock file for each root environment.
