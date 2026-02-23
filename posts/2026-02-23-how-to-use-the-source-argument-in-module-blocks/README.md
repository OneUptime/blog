# How to Use the source Argument in Module Blocks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Configuration, Infrastructure as Code, DevOps

Description: A comprehensive guide to the Terraform module source argument covering all supported source types including local paths, Git, registries, S3, GCS, and HTTP URLs.

---

The `source` argument in a Terraform module block tells Terraform where to find the module's code. It is the only truly required meta-argument in a module block, and it supports a surprising variety of source types. Depending on your needs, you can point to a local directory, a Git repository, the Terraform Registry, an S3 bucket, a GCS bucket, or even a plain HTTP URL that serves a zip file.

This guide covers every source type, when to use each, and the syntax details that matter.

## How source Works

When you run `terraform init`, Terraform reads the `source` argument in each module block, downloads the module code to `.terraform/modules/`, and registers it. Subsequent commands like `plan` and `apply` use the local copy. You need to re-run `terraform init` (or `terraform init -upgrade`) whenever you change a source or want to pick up updates from remote sources.

```hcl
module "example" {
  source = "..."  # Terraform downloads from here during init

  # All other arguments are passed as input variables to the module
  name = "my-resource"
}
```

## Local Paths

The simplest source type. Point to a directory on the local filesystem:

```hcl
# Relative path from the current directory
module "vpc" {
  source = "./modules/vpc"
}

# Relative path going up directories
module "vpc" {
  source = "../shared-modules/vpc"
}

# Absolute path (rarely used, not portable)
module "vpc" {
  source = "/opt/terraform/modules/vpc"
}
```

Local paths must start with `./` or `../` (or be an absolute path). Without the prefix, Terraform interprets the source as a registry module name.

Key characteristics:
- No download step during `terraform init` - Terraform reads directly from the path
- Changes to the module code are immediately reflected
- No version pinning available
- Best for: project-specific modules, rapid iteration, monorepo setups

## Terraform Registry

The registry uses a three-part naming convention:

```hcl
# Public registry: <NAMESPACE>/<NAME>/<PROVIDER>
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.1"
}

# Private registry (Terraform Cloud/Enterprise)
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "2.1.0"
}
```

Key characteristics:
- The `version` argument is only supported for registry sources
- Supports version constraints (`~>`, `>=`, `<`, etc.)
- Auto-generated documentation on the registry website
- Best for: using community modules, sharing modules across an organization

## Git Repositories

Git sources use the `git::` prefix:

```hcl
# HTTPS
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.0.0"
}

# SSH
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.0.0"
}

# SCP-style SSH shorthand
module "vpc" {
  source = "git::git@github.com:myorg/terraform-modules.git//modules/vpc?ref=v2.0.0"
}

# GitHub shorthand (HTTPS, public repos)
module "vpc" {
  source = "github.com/myorg/terraform-modules//modules/vpc?ref=v2.0.0"
}

# Bitbucket shorthand
module "vpc" {
  source = "bitbucket.org/myorg/terraform-modules//modules/vpc?ref=v2.0.0"
}
```

The `?ref=` parameter pins to a tag, branch, or commit SHA. The `//` separates the repo URL from the subdirectory path within the repo.

Key characteristics:
- Works with any Git hosting provider
- Supports authentication via SSH keys or HTTPS credentials
- Can reference subdirectories within a repo (monorepo support)
- Pin to tags, branches, or commits
- Best for: private modules, organization-shared modules, GitOps workflows

## S3 Buckets

For AWS-hosted module archives:

```hcl
# S3 source
module "vpc" {
  source = "s3::https://myorg-terraform-modules.s3.amazonaws.com/vpc/v1.0.0.zip"
}

# Regional S3 endpoint
module "vpc" {
  source = "s3::https://myorg-terraform-modules.s3.us-east-1.amazonaws.com/vpc/v1.0.0.zip"
}
```

Key characteristics:
- Uses AWS IAM for authentication
- Module must be a zip archive
- Best for: AWS-native organizations, simple private module hosting

## GCS Buckets

For Google Cloud-hosted module archives:

```hcl
# GCS source
module "network" {
  source = "gcs::https://www.googleapis.com/storage/v1/myorg-terraform-modules/network/v1.0.0.zip"
}
```

Key characteristics:
- Uses Google Cloud IAM for authentication
- Module must be a zip archive
- Best for: GCP-native organizations

## HTTP URLs

Terraform can download modules from any HTTP/HTTPS URL that serves a zip, tar.gz, or other supported archive:

```hcl
# HTTP source - must be an archive file
module "vpc" {
  source = "https://example.com/modules/vpc-v1.0.0.zip"
}
```

Terraform detects the archive type from the URL or content type. Supported formats include zip, tar.gz, tar.bz2, and tar.xz.

Key characteristics:
- Works with any HTTP server or CDN
- No authentication built in (must be public or use URL tokens)
- Best for: simple distribution, CDN-hosted modules, internal artifact servers

## Terraform Cloud/Enterprise Private Modules

If you use Terraform Cloud or Enterprise:

```hcl
# Private module from Terraform Cloud
module "vpc" {
  source  = "app.terraform.io/my-organization/vpc/aws"
  version = "3.0.0"
}
```

This requires authentication configured in `~/.terraformrc`:

```hcl
credentials "app.terraform.io" {
  token = "your-api-token"
}
```

## The source Cannot Be Dynamic

An important limitation: the `source` argument cannot use variables, locals, or any dynamic expression. It must be a literal string:

```hcl
# This does NOT work
variable "module_source" {
  default = "./modules/vpc"
}

module "vpc" {
  source = var.module_source  # ERROR: source must be a literal string
}
```

This is by design. Terraform needs to know all module sources at init time, before it evaluates variables.

## Subdirectories in Remote Sources

For all remote source types, you can specify a subdirectory within the downloaded archive or repository using `//`:

```hcl
# Git repo with subdirectory
module "vpc" {
  source = "git::https://github.com/myorg/infra.git//terraform/modules/vpc?ref=v1.0"
}

# Registry module with submodule
module "iam_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-assumable-role"
  version = "5.33.0"
}
```

The path after `//` is relative to the root of the downloaded content.

## Choosing the Right Source Type

| Use Case | Source Type |
|----------|------------|
| Module specific to this project | Local path (`./modules/x`) |
| Community/public module | Terraform Registry |
| Organization shared module (version control needed) | Git repository |
| Organization shared module (simple hosting) | S3 or GCS bucket |
| Quick prototyping | Local path |
| CI/CD with strict versioning | Registry or Git with tags |
| Multi-cloud team | Terraform Registry (supports all providers) |

## Re-Initializing After Source Changes

Any change to the `source` argument requires re-running `terraform init`:

```bash
# After changing any source argument
terraform init

# To upgrade to a newer version of a remote source
terraform init -upgrade

# To see what modules are installed
ls .terraform/modules/
```

## Summary

The `source` argument is the gateway to Terraform's module system. It supports local directories, the Terraform Registry, Git repositories, S3 and GCS buckets, and HTTP URLs. Each source type has its strengths: local paths for speed and simplicity, Git for version control integration, the registry for discoverability and version constraints, and cloud storage for private hosting. Choose based on your team's workflow, authentication infrastructure, and how widely the module will be shared. And remember - `source` must be a literal string, so plan your module organization accordingly.

For detailed guides on specific source types, see [How to Call a Module from a Git Repository in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-a-git-repository-in-terraform/view), [How to Call a Module from the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-the-terraform-registry/view), and [How to Call a Module from an S3 Bucket in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-an-s3-bucket-in-terraform/view).
