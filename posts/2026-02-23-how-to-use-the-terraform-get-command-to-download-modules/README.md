# How to Use the terraform get Command to Download Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, CLI, Terraform get, Infrastructure as Code

Description: Master the terraform get command for downloading and updating Terraform modules from registries, Git repositories, S3 buckets, and other sources.

---

The `terraform get` command downloads modules referenced in your configuration. While `terraform init` also handles module downloading, `terraform get` focuses specifically on modules and gives you more control over the update process. Understanding when and how to use it can speed up your development workflow significantly.

## What terraform get Does

When you reference a module in your Terraform configuration, the source code for that module needs to be downloaded to your local machine before Terraform can plan or apply. The `terraform get` command handles this download.

```bash
# Basic usage - download all modules referenced in the current directory
terraform get
```

Modules are downloaded to the `.terraform/modules/` directory. Terraform creates a `modules.json` file that tracks which modules are installed and where they came from.

## terraform get vs terraform init

Many people are confused about the difference between these two commands. Here is the breakdown:

```bash
# terraform init does everything:
# - Downloads modules
# - Installs providers
# - Initializes the backend
# - Sets up the workspace
terraform init

# terraform get only downloads modules:
# - Does NOT install providers
# - Does NOT initialize the backend
# - Faster when you only need to update modules
terraform get
```

Use `terraform get` when you have already initialized your workspace and just need to update or add modules. Use `terraform init` when setting up a workspace for the first time or after changing provider versions.

## Downloading from Different Sources

The `terraform get` command handles all the same sources that Terraform supports for modules.

### Git Repositories

```hcl
# HTTPS
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"
}

# SSH
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"
}

# Subdirectory within a repository
module "networking" {
  source = "git::https://github.com/myorg/terraform-modules.git//networking?ref=v2.0.0"
}
```

```bash
# Download the modules
terraform get

# Output:
# - module.vpc in .terraform/modules/vpc
```

### Terraform Registry

```hcl
# Public registry
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.5.0"
}

# Private registry
module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "1.0.0"
}
```

### S3 Buckets

```hcl
# S3 source
module "custom" {
  source = "s3::https://my-terraform-modules.s3.amazonaws.com/networking-v1.0.0.zip"
}
```

### Local Paths

```hcl
# Local paths do not need downloading, but get registers them
module "networking" {
  source = "./modules/networking"
}
```

## The -update Flag

By default, `terraform get` only downloads modules that are not already present. The `-update` flag forces a re-download of all modules, which is useful when you want to pick up changes.

```bash
# Only download missing modules (default behavior)
terraform get

# Force re-download of all modules
terraform get -update
```

When should you use `-update`?

- After someone pushes changes to a module repository and you want the latest
- When switching between branches that use different module versions
- When you suspect your local module cache is stale
- After changing a module source URL

```bash
# Example: You updated a module and pushed to Git
# Your teammate needs to pull the latest
terraform get -update

# This also works with terraform init
terraform init -upgrade
```

## Understanding the Module Cache

Downloaded modules live in `.terraform/modules/`. Here is what that directory looks like:

```bash
# List downloaded modules
ls -la .terraform/modules/

# Output:
# modules.json      - Index file tracking all installed modules
# vpc/              - Downloaded VPC module source
# compute/          - Downloaded compute module source
# database/         - Downloaded database module source
```

The `modules.json` file tracks module metadata:

```json
{
  "Modules": [
    {
      "Key": "",
      "Source": "",
      "Dir": "."
    },
    {
      "Key": "vpc",
      "Source": "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0",
      "Dir": ".terraform/modules/vpc"
    },
    {
      "Key": "compute",
      "Source": "git::https://github.com/myorg/terraform-aws-ecs.git?ref=v2.1.0",
      "Dir": ".terraform/modules/compute"
    }
  ]
}
```

## Troubleshooting Module Downloads

### Authentication Failures

```bash
# Git HTTPS authentication - configure credentials
git config --global credential.helper store

# Git SSH authentication - make sure your key is loaded
ssh-add ~/.ssh/id_rsa

# Terraform Cloud/Enterprise private registry
# Set the token in your CLI config
terraform login app.terraform.io

# Or use environment variables
export TF_TOKEN_app_terraform_io="your-token-here"
```

### Network Issues

```bash
# If downloads are slow or timing out, try verbose output
TF_LOG=DEBUG terraform get

# For S3 sources, check AWS credentials
aws sts get-caller-identity

# For Git sources, test connectivity
git ls-remote https://github.com/myorg/terraform-aws-vpc.git
```

### Corrupt Module Cache

```bash
# If modules seem corrupted, delete the cache and re-download
rm -rf .terraform/modules/
terraform get

# Or for a complete reset
rm -rf .terraform/
terraform init
```

## Using terraform get in CI/CD

In CI/CD pipelines, module download behavior matters for build speed and reliability.

```yaml
# GitHub Actions example
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      # Cache the module downloads between builds
      - uses: actions/cache@v4
        with:
          path: .terraform/modules
          key: terraform-modules-${{ hashFiles('**/*.tf') }}
          restore-keys: |
            terraform-modules-

      # Init will download modules if not cached
      - run: terraform init

      - run: terraform plan
```

## Module Download Behavior by Source Type

Different source types have different caching behavior:

```text
| Source Type       | Cached? | -update Behavior           |
|-------------------|---------|----------------------------|
| Local path        | No      | Always uses latest files   |
| Git (with ref)    | Yes     | Re-clones at specified ref |
| Git (no ref)      | Yes     | Re-clones default branch   |
| Registry          | Yes     | Re-downloads version       |
| S3                | Yes     | Re-downloads archive       |
| HTTP URL          | Yes     | Re-downloads archive       |
```

Local modules are never cached because Terraform reads them directly from the filesystem. This is one of the main advantages of local modules during development.

## Best Practices

1. **Always pin module versions.** Without a version pin, `terraform get -update` pulls whatever is latest, which can introduce breaking changes.

```hcl
# Good - version pinned
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"
}

# Risky - no version, gets latest
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git"
}
```

2. **Add .terraform/ to .gitignore.** The module cache should not be committed.

```text
# .gitignore
.terraform/
```

3. **Use terraform init -upgrade in CI/CD** instead of `terraform get -update`. It handles modules and providers together.

4. **Check modules.json into version control if you need reproducibility.** Some teams commit `.terraform/modules/modules.json` (but not the module source code) to track which versions are deployed.

## Conclusion

The `terraform get` command is a focused tool for downloading Terraform modules. While `terraform init` is the more common command in daily workflows, understanding `terraform get` gives you finer control over module management. Use `-update` when you need fresh module downloads, cache modules in CI/CD for faster builds, and always pin your module versions for reproducibility.

For more on module management, see our posts on [how to handle module source authentication in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-module-source-authentication-in-terraform/view) and [how to use local modules during development in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-local-modules-during-development-in-terraform/view).
