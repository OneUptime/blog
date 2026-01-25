# How to Use Git Branches as Terraform Module Sources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, Git, Modules, Version Control, Infrastructure as Code

Description: Learn how to reference Terraform modules from specific Git branches, tags, and commits. This guide covers source syntax, authentication, versioning strategies, and best practices for module management.

Terraform modules can be sourced from various locations including Git repositories. Using Git branches as module sources enables development workflows where teams can test module changes before merging to main. This guide covers the syntax, authentication, and best practices for Git-based module sources.

## Basic Git Module Source Syntax

Terraform supports several formats for Git module sources:

```hcl
# HTTPS URL with branch
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//vpc?ref=feature/new-subnets"
}

# SSH URL with branch
module "vpc" {
  source = "git::git@github.com:myorg/terraform-modules.git//vpc?ref=develop"
}

# Shorthand GitHub syntax with branch
module "vpc" {
  source = "github.com/myorg/terraform-modules//vpc?ref=develop"
}

# Generic Git with tag
module "vpc" {
  source = "git::https://gitlab.com/myorg/modules.git//vpc?ref=v1.2.0"
}

# Git with specific commit
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=abc123def"
}
```

```mermaid
graph TD
    A[Module Source URL] --> B[Protocol]
    A --> C[Repository Path]
    A --> D[Module Path //path]
    A --> E[Reference ?ref=]
    B --> F[git::https://]
    B --> G[git::ssh://]
    B --> H[github.com/]
    E --> I[Branch name]
    E --> J[Tag name]
    E --> K[Commit SHA]
```

## Understanding the Source Syntax

The Git source format has four components:

```
git::<protocol>://<host>/<org>/<repo>.git//<path>?ref=<reference>
```

| Component | Description | Example |
|-----------|-------------|---------|
| Protocol | `https://` or `ssh://` | `git::https://` |
| Host/Path | Repository URL | `github.com/myorg/modules.git` |
| Module Path | Subdirectory containing module | `//vpc` |
| Reference | Branch, tag, or commit | `?ref=develop` |

## Authentication Methods

### SSH Key Authentication

For private repositories, SSH is often the simplest:

```hcl
# Requires SSH key configured for Git host
module "vpc" {
  source = "git::git@github.com:myorg/private-modules.git//vpc?ref=main"
}
```

Configure SSH in your environment:

```bash
# Ensure SSH key is loaded
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa

# Test connection
ssh -T git@github.com
```

### HTTPS with Credentials

Use Git credential helpers or environment variables:

```bash
# Configure credential helper
git config --global credential.helper store

# Or use environment variables in CI/CD
export GIT_ASKPASS=/path/to/credential-script
```

### GitHub Personal Access Token

```bash
# Configure Git to use token
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com".insteadOf "https://github.com"
```

In CI/CD pipelines:

```yaml
# GitHub Actions
- name: Configure Git for private modules
  run: |
    git config --global url."https://oauth2:${{ secrets.GITHUB_TOKEN }}@github.com".insteadOf "https://github.com"

- name: Terraform Init
  run: terraform init
```

### GitLab Deploy Tokens

```bash
# Configure for GitLab
git config --global url."https://gitlab-ci-token:${CI_JOB_TOKEN}@gitlab.com".insteadOf "https://gitlab.com"
```

## Development Workflow with Branches

### Feature Branch Testing

Test module changes before merging:

```hcl
# During development, reference your feature branch
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=feature/add-ipv6-support"

  vpc_cidr = "10.0.0.0/16"
  enable_ipv6 = true  # New feature being tested
}
```

### Environment-Specific Branches

Use different branches for different environments:

```hcl
# variables.tf
variable "module_ref" {
  type        = string
  description = "Git reference for modules (branch, tag, or commit)"
  default     = "main"
}

# main.tf
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=${var.module_ref}"

  vpc_cidr = var.vpc_cidr
}
```

Environment configurations:

```hcl
# environments/development/terraform.tfvars
module_ref = "develop"

# environments/staging/terraform.tfvars
module_ref = "release/v2.0"

# environments/production/terraform.tfvars
module_ref = "v2.0.1"  # Always use tags in production
```

## Version Pinning Strategies

### Development: Branch References

```hcl
# Acceptable in development - tracks latest branch changes
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=develop"
}
```

### Staging: Release Branches or Pre-release Tags

```hcl
# Release candidate
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=release/v2.0"
}

# Or pre-release tag
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v2.0.0-rc1"
}
```

### Production: Immutable References

```hcl
# Always use tags or commit SHAs in production
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v2.0.1"
}

# Most secure: specific commit SHA
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=abc123def456789"
}
```

## Module Repository Structure

Organize modules in a monorepo:

```
terraform-modules/
├── vpc/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
├── rds/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
├── eks/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
└── examples/
    ├── complete-vpc/
    └── rds-with-vpc/
```

Reference specific modules:

```hcl
module "vpc" {
  source = "git::https://github.com/myorg/terraform-modules.git//vpc?ref=v1.0.0"
}

module "database" {
  source = "git::https://github.com/myorg/terraform-modules.git//rds?ref=v1.0.0"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Handling Module Updates

### Terraform Init with Upgrade

```bash
# Fetch latest version of modules
terraform init -upgrade
```

### Lock File Behavior

The `.terraform.lock.hcl` file doesn't track Git module versions. Document your module versions:

```hcl
# versions.tf
# Module versions:
# - vpc: v2.0.1 (git::https://github.com/myorg/modules.git//vpc?ref=v2.0.1)
# - rds: v1.5.0 (git::https://github.com/myorg/modules.git//rds?ref=v1.5.0)

terraform {
  required_version = ">= 1.5.0"
}
```

### Automated Version Updates

Use Renovate or Dependabot for module updates:

```json
// renovate.json
{
  "extends": ["config:base"],
  "terraform": {
    "enabled": true
  },
  "regexManagers": [
    {
      "fileMatch": ["\\.tf$"],
      "matchStrings": [
        "source\\s*=\\s*\"git::https://github.com/(?<depName>[^/]+/[^/]+)\\.git//[^?]+\\?ref=(?<currentValue>[^\"]+)\""
      ],
      "datasourceTemplate": "github-tags"
    }
  ]
}
```

## Caching Git Modules in CI/CD

Speed up pipelines by caching modules:

```yaml
# GitHub Actions
- name: Cache Terraform modules
  uses: actions/cache@v3
  with:
    path: |
      ~/.terraform.d/plugin-cache
      .terraform/modules
    key: terraform-${{ hashFiles('**/*.tf') }}
    restore-keys: |
      terraform-

- name: Terraform Init
  run: terraform init
```

## Common Issues and Solutions

### Issue: "could not download module"

Check authentication:

```bash
# Test Git access
git ls-remote https://github.com/myorg/terraform-modules.git

# For SSH
git ls-remote git@github.com:myorg/terraform-modules.git
```

### Issue: "reference not found"

Verify the branch/tag exists:

```bash
# List remote branches
git ls-remote --heads https://github.com/myorg/terraform-modules.git

# List remote tags
git ls-remote --tags https://github.com/myorg/terraform-modules.git
```

### Issue: Module path not found

Ensure the path exists in the repository:

```bash
# Clone and verify
git clone https://github.com/myorg/terraform-modules.git
ls terraform-modules/vpc/  # Verify module directory exists
```

### Issue: Stale module version

Force re-download:

```bash
# Remove cached modules
rm -rf .terraform/modules

# Re-initialize
terraform init
```

## Best Practices

### 1. Use Semantic Versioning for Tags

```bash
# Tag format: vMAJOR.MINOR.PATCH
git tag -a v1.2.3 -m "Release v1.2.3: Added IPv6 support"
git push origin v1.2.3
```

### 2. Protect Main/Release Branches

Configure branch protection rules to prevent direct pushes:

```yaml
# GitHub branch protection
- Require pull request reviews
- Require status checks to pass
- Require signed commits (optional)
```

### 3. Document Module Versions

```hcl
# Keep a versions comment or separate file
/*
Module Sources and Versions:
============================
vpc:      v2.1.0 - Added NAT Gateway HA
rds:      v1.8.2 - Security group fix
lambda:   v3.0.0 - Breaking: new variable structure
*/
```

### 4. Test Before Merge

```yaml
# CI pipeline for module repository
test:
  script:
    - cd examples/complete-vpc
    - terraform init
    - terraform validate
    - terraform plan
```

### 5. Use Consistent Reference Style

```hcl
# Pick one style and stick with it
# Option A: Always use tags in non-dev environments
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=v2.0.1"
}

# Option B: Use commit SHAs for maximum reproducibility
module "vpc" {
  source = "git::https://github.com/myorg/modules.git//vpc?ref=a1b2c3d"
}
```

## Conclusion

Git branches as Terraform module sources enable flexible development workflows while maintaining infrastructure stability. Use branch references during development, release branches or tags in staging, and always pin to specific tags or commit SHAs in production. Proper authentication setup and caching strategies ensure smooth operations in CI/CD pipelines. Remember that branches can change - when stability matters, prefer immutable references like tags or commit SHAs.
