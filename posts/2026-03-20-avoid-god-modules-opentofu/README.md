# How to Avoid God Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Best Practice, Refactoring, Infrastructure as Code, Architecture

Description: Learn how to identify and break down OpenTofu god modules - modules that try to manage too many unrelated resources - into smaller, composable, single-responsibility modules.

## Introduction

A "god module" in OpenTofu is a module that manages too many unrelated concerns: it creates the VPC, the security groups, the EC2 instances, the RDS database, the IAM roles, and the DNS records all in one place. These modules become difficult to understand, test, and reuse. Applying the Single Responsibility Principle to modules fixes this.

## Signs of a God Module

```hcl
# BAD - a module that does everything

module "our_application" {
  source = "./modules/our-application"  # This module has 2000+ lines
  # Creates: VPC, subnets, security groups, EKS, RDS,
  #          ElastiCache, S3, Lambda, API Gateway, Route53, ACM, WAF
  #          IAM roles, KMS keys, CloudWatch alarms...
}
```

Signs:
- Module has 500+ lines of Terraform code
- Module's `variables.tf` has 50+ inputs
- Module manages resources from 5+ different cloud services
- Impossible to use the module without creating ALL its resources

## Refactoring into Single-Responsibility Modules

```text
Before (god module):
  modules/application/    → everything

After (decomposed):
  modules/networking/     → VPC, subnets, routing
  modules/security/       → Security groups, NACLs
  modules/compute/        → EKS cluster, node groups
  modules/data/           → RDS, ElastiCache
  modules/storage/        → S3 buckets
  modules/iam/            → IAM roles, policies
  modules/monitoring/     → CloudWatch, alarms
```

If you are refactoring an existing live module rather than starting fresh, add `moved` blocks as you split resources into child modules so OpenTofu preserves state instead of planning replacements.

## Example: Before and After

### Before (God Module)

```hcl
# modules/app/main.tf - 2000 lines
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "private" { ... }
resource "aws_subnet" "public" { ... }
resource "aws_security_group" "web" { ... }
resource "aws_security_group" "db" { ... }
resource "aws_eks_cluster" "main" { ... }
resource "aws_db_instance" "main" { ... }
resource "aws_elasticache_cluster" "main" { ... }
# ... 50 more resource types ...
```

### After (Composable Modules)

```hcl
# main.tf - clean composition
module "networking" {
  source      = "./modules/networking"
  vpc_cidr    = var.vpc_cidr
  environment = var.environment
}

module "security" {
  source      = "./modules/security"
  vpc_id      = module.networking.vpc_id
  environment = var.environment
}

module "compute" {
  source          = "./modules/compute"
  vpc_id          = module.networking.vpc_id
  subnet_ids      = module.networking.private_subnet_ids
  node_sg_id      = module.security.eks_node_sg_id
  environment     = var.environment
}

module "data" {
  source            = "./modules/data"
  vpc_id            = module.networking.vpc_id
  subnet_group_name = module.networking.db_subnet_group_name
  db_sg_id          = module.security.db_sg_id
  environment       = var.environment
}
```

## Testing Single-Responsibility Modules

Smaller modules are easier to validate and test in isolation:

```bash
# Validate just the networking module
(cd modules/networking && tofu init -backend=false && tofu validate)

# If the module includes *.tofutest.hcl files, run its tests
(cd modules/networking && tofu init -backend=false && tofu test -var="vpc_cidr=10.0.0.0/16" -var="environment=test")

# Validate just the security module
(cd modules/security && tofu init -backend=false && tofu validate)
```

## Guidelines for Module Size

```text
A module is too large if:
  - It has more than 150 lines in main.tf
  - It manages resources from more than 3 cloud service categories
  - It has more than 15 input variables
  - A new team member can't understand it in < 30 minutes
```

## Conclusion

God modules are a maintenance liability. Break them apart along service category boundaries (networking, compute, data, IAM) so each module has a single reason to change. Smaller modules are testable, reusable in different contexts, and approachable by new team members - all properties that make infrastructure code sustainable as the system grows.
