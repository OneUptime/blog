# How to Use Package Sub-Directories in Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module

Description: Learn how to use the double-slash separator to reference sub-directories within module source packages in OpenTofu for precise module targeting.

## Introduction

When a module source points to a repository or archive containing multiple modules, you can use the `//` (double-slash) separator to specify a sub-directory within that package. OpenTofu downloads the entire package but only uses the files in the specified sub-directory.

## Syntax

```hcl
module "name" {
  source = "SOURCE_URL//subdirectory/path"
}
```

The `//` separates the package location from the sub-directory path within it.

## Git Repository with Sub-Directory

```hcl
# Reference a specific module directory within a monorepo

module "vpc" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/vpc?ref=v2.0.0"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}

module "eks" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/eks?ref=v1.5.0"

  cluster_name = "prod-cluster"
  vpc_id       = module.vpc.vpc_id
}
```

## GitHub Shorthand with Sub-Directory

```hcl
module "security_groups" {
  source = "github.com/acme-corp/terraform-modules//modules/security-groups?ref=v1.3.0"

  vpc_id      = var.vpc_id
  environment = var.environment
}
```

## ZIP Archive with Sub-Directory

```hcl
# A single archive contains multiple modules
module "networking" {
  source = "https://artifacts.acme-corp.com/terraform-modules-v3.zip//modules/networking"

  name = "main"
}

module "compute" {
  source = "https://artifacts.acme-corp.com/terraform-modules-v3.zip//modules/compute"

  vpc_id = module.networking.vpc_id
}
```

## S3 with Sub-Directory

```hcl
module "vpc" {
  source = "s3::https://s3.amazonaws.com/my-modules/all-modules-v2.zip//vpc"

  name = "main"
}
```

## Nested Sub-Directories

The sub-directory path can be nested multiple levels deep:

```hcl
module "app_sg" {
  source = "git::https://github.com/acme/modules.git//aws/networking/security-groups/app?ref=v1.0.0"

  vpc_id = var.vpc_id
}
```

## Monorepo Module Organization

Sub-directories work particularly well with monorepo module layouts:

```text
terraform-modules/
├── aws/
│   ├── vpc/         → source = "...//aws/vpc"
│   ├── eks/         → source = "...//aws/eks"
│   └── rds/         → source = "...//aws/rds"
└── gcp/
    ├── vpc/         → source = "...//gcp/vpc"
    └── gke/         → source = "...//gcp/gke"
```

```hcl
locals {
  base = "git::https://github.com/acme/terraform-modules.git"
  ref  = "?ref=v2.0.0"
}

module "aws_vpc" {
  source = "${local.base}//aws/vpc${local.ref}"
  name   = "main"
}

module "gcp_vpc" {
  source = "${local.base}//gcp/vpc${local.ref}"
  name   = "main"
}
```

## Important Notes

- OpenTofu downloads the entire package (repository or archive) regardless of which sub-directory you reference. For large repos, this can be slow.
- The `//` separator must appear before any query parameters in Git URLs: use `?ref=tag` after `//`, not before.
- For Git sources, the sub-directory path is relative to the repository root.

## Conclusion

The `//` sub-directory separator unlocks monorepo patterns for OpenTofu module distribution. A single well-organized repository can host dozens of modules, each referenced with a targeted sub-directory path and a consistent version ref. This reduces the overhead of maintaining many separate repositories while keeping module boundaries clear.
