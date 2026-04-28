# How to Use Git Repository Module Sources in OpenTofu - Repository

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module, Git

Description: Learn how to use Git repository URLs as module sources in OpenTofu to share modules across teams and pin them to specific commits or tags.

## What are Git Module Sources?

Git repository sources allow you to reference OpenTofu modules stored in any Git repository. OpenTofu will clone the repository during `tofu init` and use the files as the module source. This enables sharing modules across teams, organizations, and repositories with version pinning.

## Syntax

```hcl
module "name" {
  source = "git::https://github.com/org/repo.git//path/to/module?ref=v1.2.3"
}
```

Key components:
- `git::` - prefix to identify this as a generic Git source
- URL - the HTTPS or SSH URL to the repository
- `//path` - optional subdirectory within the repo (double slash)
- `?ref=` - optional reference (tag, branch, or commit hash)

## HTTPS Source with a Tag

```hcl
module "vpc" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/vpc?ref=v2.1.0"

  name       = "production"
  cidr_block = "10.0.0.0/16"
}
```

## SSH Source

```hcl
# SSH is preferred in CI/CD environments with configured SSH keys

module "eks" {
  source = "git::ssh://git@github.com/acme-corp/terraform-modules.git//modules/eks?ref=v1.5.2"

  cluster_name = "production"
  k8s_version  = "1.29"
}
```

## Pinning to a Specific Commit

For maximum reproducibility, pin to a specific commit SHA instead of a mutable tag.

```hcl
module "rds" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/rds?ref=a1b2c3d4e5f6"

  engine         = "postgres"
  instance_class = "db.t3.medium"
}
```

## Referencing a Branch (Development Only)

```hcl
# Use branches only for development/testing - never in production
module "feature_test" {
  source = "git::https://github.com/acme-corp/terraform-modules.git//modules/vpc?ref=feature/new-subnet-logic"

  name = "test"
}
```

## Private Repository with Authentication

```hcl
# Option 1: SSH key authentication (recommended)
module "private_module" {
  source = "git::ssh://git@github.com/acme-corp/private-modules.git//vpc?ref=v1.0.0"
}

# Option 2: HTTPS with credentials configured via Git
# OpenTofu delegates auth to Git, so configure a credential helper or use .netrc.
# Example with git credential store: git config --global credential.helper store
# Or embed a token directly (avoid committing this to source control):
# source = "git::https://oauth2:ghp_xxx@github.com/acme-corp/private-modules.git//vpc?ref=v1.0.0"
```

## Using with tofu init

After adding a Git-sourced module, run `tofu init` to clone the repository:

```bash
# Initialize and download modules
tofu init

# Upgrade module to latest matching version
tofu init -upgrade
```

## Important Notes

- The `//` separator between the repository URL and the subdirectory path is required. It tells OpenTofu where the repository URL ends and the subdirectory begins.
- Always pin to a `?ref=` value in production. Using a branch means the module can change unexpectedly.
- Git sources do not use OpenTofu's lock file (`tofu providers lock`) - only the `ref` parameter controls versioning.
- Use HTTPS for public repositories and SSH for private repositories in CI/CD pipelines.
- GitHub and Bitbucket have shorter syntax (without `git::`) - see dedicated posts for those.

## Conclusion

Git repository module sources enable cross-repository module sharing in OpenTofu. Pin to tags or commit hashes for production reliability, and use HTTPS or SSH based on your authentication setup. The double-slash (`//`) syntax for subdirectories allows a single repository to host many modules.
