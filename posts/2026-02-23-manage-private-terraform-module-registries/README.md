# How to Manage Private Terraform Module Registries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Module, Registry, Private Registry, DevOps

Description: Learn how to set up and manage private Terraform module registries using Terraform Cloud, GitHub, GitLab, Artifactory, and self-hosted solutions for internal module distribution.

---

Once your team has more than a handful of Terraform modules, you need a way to discover, version, and distribute them. The public Terraform Registry works great for community modules, but your internal modules contain organization-specific logic, naming conventions, and security standards. These need a private registry.

This guide covers the main options for hosting a private Terraform module registry and the trade-offs between them.

## Why a Private Registry

A private registry gives you:

- **Discovery**: Teams can browse available modules instead of asking around or searching repos
- **Versioning**: Semantic versions tied to Git tags, so callers can pin to stable releases
- **Documentation**: Auto-generated docs from module READMEs and variable descriptions
- **Access control**: Only authorized users can access your internal modules
- **Consistency**: One official source for approved modules

Without a registry, module distribution usually happens through Git URLs:

```hcl
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//vpc?ref=v1.2.0"
}
```

This works but lacks discoverability. Nobody knows what modules exist unless they browse the repository.

## Option 1: Terraform Cloud / HCP Terraform

If you are already using Terraform Cloud or HCP Terraform, you get a private registry included:

```hcl
# Using modules from Terraform Cloud private registry

module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "~> 1.0"
}
```

Setting up a module in the private registry:

1. Go to your Terraform Cloud organization
2. Navigate to Registry > Modules
3. Click "Publish module"
4. Connect your VCS provider (GitHub, GitLab, Bitbucket)
5. Select the repository containing your module

Use the repository naming convention `terraform-<PROVIDER>-<NAME>` when possible. For example, `terraform-aws-vpc`. This keeps the module compatible with common registry tooling and makes the module name and provider obvious.

**Auto-publishing**: When you push a new Git tag (e.g., `v1.3.0`), Terraform Cloud automatically publishes a new version.

**Configuration**:

```hcl
# In your Terraform configuration, add the cloud block
terraform {
  cloud {
    organization = "myorg"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

**Pros**: Zero infrastructure to manage, built-in documentation, version history, tight integration with Terraform Cloud workspaces.

**Cons**: Requires a Terraform Cloud subscription, modules are tied to the platform.

## Option 2: GitHub/GitLab Releases

For teams that do not use Terraform Cloud, Git repositories with tags work as a lightweight registry:

```hcl
# GitHub with version tag
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.2.0"
}

# GitLab with version tag
module "vpc" {
  source = "git::https://gitlab.com/myorg/terraform-aws-vpc.git?ref=v1.2.0"
}

# SSH access (for private repos)
module "vpc" {
  source = "git::ssh://git@github.com/myorg/terraform-aws-vpc.git?ref=v1.2.0"
}
```

Automate releases with GitHub Actions:

```yaml
# .github/workflows/release.yml
name: Release Module

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - name: Validate module
        run: |
          terraform init -backend=false
          terraform validate

      - name: Run terraform-docs
        uses: terraform-docs/gh-actions@v1
        with:
          output-file: README.md
          output-method: inject
          git-push: false

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
```

**Pros**: Simple, no extra infrastructure, works with any Git hosting.

**Cons**: No module discovery UI, no dependency resolution, callers must know the exact repository URL.

## Option 3: GitLab Terraform Module Registry

GitLab has a built-in Terraform module registry:

```hcl
module "vpc" {
  source  = "gitlab.com/myorg/terraform-aws-vpc/aws"
  version = "1.2.0"
}
```

Set it up by publishing a package to GitLab's Terraform Module Registry with GitLab CI/CD or the package API. GitLab's CI/CD template can publish the module when you create a Git tag.

Configure authentication:

```bash
# In ~/.terraformrc or terraform.rc
credentials "gitlab.com" {
  token = "glpat-xxxxxxxxxxxx"
}
```

**Pros**: Built into GitLab, supports version constraints, has a UI for browsing modules.

**Cons**: Requires configuring package publishing through GitLab CI/CD or the package API.

## Option 4: JFrog Artifactory

For organizations already using Artifactory for artifact management:

```hcl
module "vpc" {
  source  = "myartifactory.example.com/terraform-modules__vpc/aws"
  version = "1.2.0"
}
```

Configure JFrog CLI to publish Terraform modules to Artifactory:

```bash
jf config add my-server
jf terraform-config \
  --server-id-deploy=my-server \
  --repo-deploy=terraform-modules
```

Publish modules using JFrog CLI from the module directory:

```bash
jf tf p \
  --namespace=myorg \
  --provider=aws \
  --tag=v1.2.0
```

**Pros**: Centralized artifact management, enterprise features like replication and access control.

**Cons**: Additional cost, more complex setup.

## Option 5: Self-Hosted Registry

You can run your own Terraform registry that implements the Module Registry Protocol. The protocol is straightforward HTTP with a few specific endpoints:

```text
GET /.well-known/terraform.json
GET /v1/modules/{namespace}/{name}/{system}/versions
GET /v1/modules/{namespace}/{name}/{system}/{version}/download
```

There are open-source implementations available:

```bash
# citizen - a self-hosted Terraform registry
docker run -d \
  -p 3000:3000 \
  -e CITIZEN_DATABASE_TYPE=mongodb \
  -e CITIZEN_DATABASE_URL=mongodb://mongo:27017/citizen \
  -e CITIZEN_STORAGE_PATH=/modules \
  outsideris/citizen
```

```hcl
# Using modules from your self-hosted registry
module "vpc" {
  source  = "registry.internal.example.com/myorg/vpc/aws"
  version = "1.2.0"
}
```

**Pros**: Full control, no external dependencies, can integrate with existing auth systems.

**Cons**: Infrastructure to manage, need to implement or run registry software.

## Module Naming Conventions

Regardless of which registry you choose, follow these naming conventions:

```text
terraform-<PROVIDER>-<NAME>

Examples:
terraform-aws-vpc
terraform-aws-ecs-service
terraform-google-gke-cluster
terraform-azurerm-resource-group
```

This convention is required by the public Terraform Registry and is a widely followed standard for private module repositories.

## Publishing Workflow

Set up a standard workflow for publishing modules:

```bash
# 1. Make changes and test
terraform init
terraform validate
terraform test  # Terraform 1.6+ native tests

# 2. Update version
git add .
git commit -m "feat: add support for custom tags"

# 3. Tag the release
git tag -a v1.3.0 -m "Add custom tag support"
git push origin v1.3.0

# 4. Registry picks up the new tag automatically
```

## Access Control

Control who can publish and consume modules:

- **Publish**: Only CI/CD pipelines or designated module maintainers
- **Consume**: Any team member with appropriate credentials
- **Review**: Require code review before merging to main branch (which triggers releases)

Use branch protection rules and required reviewers on your module repositories.

For more on module distribution, see [how to share Terraform modules across teams](https://oneuptime.com/blog/post/2026-02-23-share-terraform-modules-across-teams/view).
