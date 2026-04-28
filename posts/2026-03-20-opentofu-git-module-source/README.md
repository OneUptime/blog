# Using Git as a Module Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, Git

Description: Learn how to use Git repositories as module sources in OpenTofu with version pinning via refs and tags.

Git repositories are a popular module source for private modules and when you need precise version control. OpenTofu supports both HTTPS and SSH Git URLs.

## HTTPS Git URL

```hcl
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = var.environment
}
```

## SSH Git URL

```hcl
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-modules.git//modules/vpc?ref=v2.1.0"

  cidr_block  = "10.0.0.0/16"
}
```

## Version References

```hcl
# Pin to a specific tag

module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v2.0.0"
}

# Pin to a specific commit (most precise)
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=a1b2c3d4"
}

# Use a branch (less stable - avoid in production)
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=main"
}
```

## Private Repository Authentication

```bash
# SSH key authentication (recommended)
# Ensure SSH agent has the key loaded
ssh-add ~/.ssh/id_rsa

# Or configure in ~/.ssh/config
# Host github.com
#   IdentityFile ~/.ssh/id_rsa_github

# HTTPS with token
# Configure a git credential helper (e.g. `git config --global credential.helper store`)
# which reads tokens from ~/.git-credentials
```

## Conclusion

Git sources provide version-pinned module distribution without requiring a formal registry. Use `?ref=v1.0.0` tag references in production, SSH for private repositories, and HTTPS for public repositories. The `//subdirectory` notation allows you to store multiple modules in a single repository.
