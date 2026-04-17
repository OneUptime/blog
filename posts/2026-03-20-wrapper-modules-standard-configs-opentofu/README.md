# How to Create Wrapper Modules for Standard Configurations in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Module, Wrapper Modules, Opinionated, DRY

Description: Learn how to create wrapper modules in OpenTofu that wrap upstream modules with organization-specific defaults and constraints, reducing boilerplate in calling configurations.

## Introduction

Wrapper modules call upstream modules (from a registry or your own library) with organization-specific defaults pre-applied. Teams get an opinionated interface with fewer variables to set, while the underlying module remains flexible for edge cases.

## Wrapping an Upstream S3 Module

```hcl
# modules/org-s3-bucket/main.tf

# Wraps the public terraform-aws-modules/s3-bucket module
# with organization security defaults

terraform {
  required_providers {
    aws = { source = "hashicorp/aws" }
  }
}

variable "bucket_name" { type = string }
variable "environment" { type = string }
variable "purpose"     { type = string }

variable "extra_tags" {
  type    = map(string)
  default = {}
}

# These are overridable but have opinionated defaults
variable "versioning_enabled" {
  type    = bool
  default = true
}

variable "enable_notifications" {
  type    = bool
  default = false
}

variable "lifecycle_transition_days" {
  type    = number
  default = 90
}

locals {
  standard_tags = merge({
    Environment = var.environment
    Purpose     = var.purpose
    ManagedBy   = "OpenTofu"
    Encrypted   = "true"
    Versioned   = var.versioning_enabled
  }, var.extra_tags)
}

# Call the upstream module with org-standard settings
module "s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 4.0"

  bucket = var.bucket_name

  # Org standards: always enforce these
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true

  versioning = {
    enabled = var.versioning_enabled
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }

  lifecycle_rule = [
    {
      id      = "standard-lifecycle"
      enabled = true
      transition = [
        { days = var.lifecycle_transition_days, storage_class = "STANDARD_IA" }
      ]
    }
  ]

  tags = local.standard_tags
}

output "bucket_id"  { value = module.s3_bucket.s3_bucket_id }
output "bucket_arn" { value = module.s3_bucket.s3_bucket_arn }
```

## Wrapping EKS with Org Defaults

```hcl
# modules/org-eks-cluster/main.tf
variable "cluster_name" { type = string }
variable "environment"  { type = string }
variable "vpc_id"       { type = string }
variable "subnet_ids"   { type = list(string) }

variable "cluster_version" {
  type    = string
  default = "1.29"
}

variable "node_groups" {
  type    = any
  default = {}
}

locals {
  # Org-standard node group that gets merged with user-defined ones
  baseline_node_group = {
    "system" = {
      instance_types = ["t3.medium"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2
      labels         = { "node.k8s.io/role" = "system" }
    }
  }

  all_node_groups = merge(local.baseline_node_group, var.node_groups)
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.0"

  cluster_name    = var.cluster_name
  cluster_version = var.cluster_version
  vpc_id          = var.vpc_id
  subnet_ids      = var.subnet_ids

  # Org standards
  cluster_endpoint_public_access       = true
  cluster_endpoint_public_access_cidrs = ["10.0.0.0/8"]  # Internal only

  eks_managed_node_groups = local.all_node_groups

  # Always enable these add-ons
  cluster_addons = {
    coredns                = { most_recent = true }
    kube-proxy             = { most_recent = true }
    vpc-cni                = { most_recent = true }
    aws-ebs-csi-driver     = { most_recent = true }
  }

  tags = { Environment = var.environment, ManagedBy = "OpenTofu" }
}

output "cluster_name"     { value = module.eks.cluster_name }
output "cluster_endpoint" { value = module.eks.cluster_endpoint }
```

## Caller Usage: Minimal Configuration

```hcl
# Application team's usage - minimal boilerplate
module "app_bucket" {
  source      = "./modules/org-s3-bucket"
  bucket_name = "myapp-prod-data"
  environment = "prod"
  purpose     = "application-data"
  # All security settings are pre-configured by the wrapper
}

module "app_cluster" {
  source        = "./modules/org-eks-cluster"
  cluster_name  = "myapp-prod"
  environment   = "prod"
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnet_ids
  # System node group is automatically included
}
```

## Conclusion

Wrapper modules are the practical middle ground between giving teams raw access to upstream modules (too much configuration) and building everything from scratch (too much maintenance). They encode organizational decisions as defaults, expose only the variables that teams legitimately need to change, and keep the calling configuration concise.
