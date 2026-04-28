# How to Follow Naming Conventions for Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Naming Convention, Best Practice, Infrastructure as Code, Registry

Description: Learn the naming conventions for OpenTofu module directories, registry modules, and module call blocks to keep large module libraries organized and discoverable.

## Introduction

Module naming conventions govern both how you name module directories in your project and how you publish modules to a registry. Consistent names make modules self-describing, discoverable, and composable.

## Module Directory Naming

Local module directories use kebab-case (hyphens) by convention, matching the way module sources are referenced in registry addresses:

```text
modules/
├── vpc/                    # Simple single-word module
├── eks-cluster/            # Multi-word: use hyphens
├── rds-postgres/           # Specific variant
├── iam-roles/              # Plural for collections
├── security-groups/
├── lambda-function/
└── alb-https/
```

## Module Call Block Naming

Module call blocks (the `module` keyword in your `.tf` files) use snake_case:

```hcl
# GOOD - snake_case, descriptive, matches the module's purpose

module "vpc" {}
module "eks_cluster" {}
module "rds_postgres" {}
module "app_security_groups" {}

# AVOID
module "MyVPC" {}         # CamelCase
module "vpc-module" {}    # Redundant "-module" suffix
module "m1" {}            # Cryptic abbreviation
```

## Registry Module Naming

For modules published to the OpenTofu registry, the format is `<namespace>/<name>/<provider>`:

```hcl
# Correct registry module source format
module "vpc" {
  source  = "my-company/vpc/aws"          # AWS VPC module
  version = "~> 3.0"
}

module "kubernetes" {
  source  = "my-company/kubernetes/google" # GKE module
  version = "~> 2.0"
}

# Internal (private) registry
module "vpc" {
  source  = "registry.internal.example.com/platform/vpc/aws"
  version = "~> 1.0"
}
```

## Module Variable Naming

Module input variables should be descriptive and consistent within the module:

```hcl
# modules/eks-cluster/variables.tf

# GOOD - clear, consistent naming
variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster"
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the cluster"
  default     = "1.29"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID where the cluster will be deployed"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for the cluster nodes"
}

# AVOID - ambiguous names
variable "name" {}        # Too generic - name of what?
variable "id" {}          # Which ID?
variable "enabled" {}     # Enabled what?
```

## Module Output Naming

```hcl
# modules/eks-cluster/outputs.tf

# GOOD - prefixed with the resource type for clarity
output "cluster_id" {
  description = "ID of the EKS cluster"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "API server endpoint of the EKS cluster"
  value       = aws_eks_cluster.main.endpoint
}

output "node_group_arns" {
  description = "ARNs of all node groups"
  value       = { for k, v in aws_eks_node_group.nodes : k => v.arn }
}
```

## Versioning Conventions

Modules should follow semantic versioning:

```hcl
# MAJOR version: breaking changes
module "vpc" {
  source  = "my-company/vpc/aws"
  version = "~> 3.0"  # Pin to major version 3, any minor or patch
}

# MINOR version: new features, backward compatible
module "vpc" {
  source  = "my-company/vpc/aws"
  version = "~> 3.2"  # At least 3.2, below 4.0
}

# Exact pin: fully reproducible
module "vpc" {
  source  = "my-company/vpc/aws"
  version = "= 3.2.1"  # Exactly this version
}
```

## Conclusion

Module naming conventions flow from the registry format: kebab-case directories, `<namespace>/<name>/<provider>` registry addresses, and snake_case module call blocks. Prefix output names with the resource type, and use semantic versioning with `~>` constraints to stay current with minor improvements while avoiding breaking changes.
