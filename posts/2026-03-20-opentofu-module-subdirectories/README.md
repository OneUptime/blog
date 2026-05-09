# Using Module Package Subdirectories in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Git

Description: Learn how to reference specific subdirectories within a module package source in OpenTofu using the double-slash notation.

OpenTofu allows you to reference a specific subdirectory within a module package using the `//` (double-slash) notation. This is especially useful when working with Git repositories or other sources that contain multiple modules.

## The Double-Slash Notation

The `//` separator distinguishes between the package address (the downloadable archive) and the subdirectory path within it:

```hcl
module "example" {
  source = "github.com/org/repo//path/to/module"
}
```

Everything before `//` is the package address. Everything after is the subdirectory path.

## Git Repository with Subdirectories

```hcl
# Reference a specific module in a monorepo

module "vpc" {
  source = "git::https://github.com/myorg/infrastructure.git//modules/vpc"
}

module "eks" {
  source = "git::https://github.com/myorg/infrastructure.git//modules/eks"
}

module "rds" {
  source = "git::https://github.com/myorg/infrastructure.git//modules/rds"
}
```

## Combining Subdirectory with Version Reference

```hcl
# Pin to a specific Git tag
module "vpc" {
  source = "git::https://github.com/myorg/tf-modules.git//networking/vpc?ref=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}

# Pin to a specific commit SHA
module "eks" {
  source = "git::https://github.com/myorg/tf-modules.git//compute/eks?ref=abc1234"

  cluster_name    = "prod-cluster"
  k8s_version     = "1.29"
}

# Use a branch (not recommended for production)
module "experimental" {
  source = "git::https://github.com/myorg/tf-modules.git//experimental?ref=feature/new-vpc"
}
```

## GitHub Shorthand with Subdirectory

```hcl
# GitHub shorthand supports subdirectories
module "security_groups" {
  source = "github.com/myorg/aws-modules//security/web-tier"
  
  vpc_id      = var.vpc_id
  environment = var.environment
}
```

## S3 Bucket with Subdirectories

```hcl
# Reference a module within an S3 archive
module "networking" {
  source = "s3::https://s3.amazonaws.com/my-modules/infrastructure.zip//modules/networking"
}
```

## Local Paths Are Not Packages

Local paths are not packages, so the `//` subdirectory syntax does not apply - the entire local path is treated as the module itself. Use a normal relative path to reference a nested module:

```hcl
# Local paths use a regular relative path, not //
module "app" {
  source = "./platform/application/web"
}
```

## Practical Monorepo Pattern

```text
terraform-modules/                    # Single repo
├── README.md
├── modules/
│   ├── aws/
│   │   ├── vpc/
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   └── outputs.tf
│   │   ├── eks/
│   │   └── rds/
│   ├── gcp/
│   │   ├── gke/
│   │   └── cloudsql/
│   └── azure/
│       ├── aks/
│       └── postgresql/
└── examples/
    ├── aws-full-stack/
    └── gcp-full-stack/
```

```hcl
# Use modules from different cloud providers in the monorepo
module "aws_vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/aws/vpc?ref=v3.0.0"

  cidr_block  = "10.0.0.0/16"
  environment = "prod"
}

module "gcp_gke" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/gcp/gke?ref=v3.0.0"

  project     = var.gcp_project
  cluster_name = "prod-cluster"
}
```

## Registry Modules with Submodules

Some public registry modules expose submodules:

```hcl
# Using a submodule from the public registry
module "s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 3.0"
}

# Using a submodule within the same package (if the module provides them)
module "s3_notification" {
  source  = "terraform-aws-modules/s3-bucket/aws//modules/notification"
  version = "~> 3.0"

  bucket = module.s3_bucket.s3_bucket_id
}
```

## Locking Submodule References

```hcl
# versions.tf - document your module sources
locals {
  module_ref = "v4.2.1"
}

module "vpc" {
  source = "git::https://github.com/myorg/modules.git//aws/vpc?ref=${local.module_ref}"
  cidr   = "10.0.0.0/16"
}

module "eks" {
  source = "git::https://github.com/myorg/modules.git//aws/eks?ref=${local.module_ref}"
  vpc_id = module.vpc.vpc_id
}
```

## Conclusion

The `//` subdirectory notation is a flexible way to work with modular package sources. Whether you're pulling from a GitHub monorepo, an S3 archive, or a registry module with submodules, subdirectory references let you access exactly the module you need. Always combine subdirectory references with version pins (`?ref=`) to ensure reproducible deployments.
