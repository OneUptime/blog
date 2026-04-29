# How to Handle Module Versioning Across Environments in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Module, Versioning, GitOps, Best Practice

Description: Learn how to manage module versions across dev, staging, and production environments in OpenTofu, ensuring changes are validated in lower environments before reaching production.

## Introduction

Module versioning ensures that infrastructure changes follow a promotion path: modules are tested in dev, validated in staging, and then promoted to production. This prevents untested changes from reaching production and enables rollback if issues arise.

## Version Pinning Strategies

### Git Tag Pinning

```hcl
# dev/main.tf - uses the latest commit on a branch for rapid iteration

module "vpc" {
  source = "git::https://github.com/your-org/opentofu-modules.git//vpc?ref=main"
  # ...
}

# staging/main.tf - pinned to a release candidate tag
module "vpc" {
  source = "git::https://github.com/your-org/opentofu-modules.git//vpc?ref=v2.1.0-rc1"
  # ...
}

# prod/main.tf - pinned to a stable release tag
module "vpc" {
  source = "git::https://github.com/your-org/opentofu-modules.git//vpc?ref=v2.0.5"
  # ...
}
```

### Registry Version Constraints

```hcl
# Using the OpenTofu/Terraform registry with semantic version constraints
module "vpc" {
  source  = "registry.opentofu.org/your-org/vpc/aws"
  version = "~> 2.0"  # Allow patch and minor updates within 2.x

  # Production: pin to exact version
  # version = "= 2.0.5"
}
```

## Version Manifest Pattern

Maintain a versions file to track which module version each environment uses:

```hcl
# versions.tf in each environment directory
locals {
  module_versions = {
    vpc              = "v2.0.5"
    database         = "v1.3.2"
    ecs_service      = "v3.1.0"
    security_groups  = "v1.5.1"
  }
}

module "vpc" {
  source = "git::https://github.com/your-org/modules.git//vpc?ref=${local.module_versions.vpc}"
  # ...
}
```

## Promotion Workflow

```bash
# Step 1: Update dev to use new module version
# Edit dev/versions.tf: vpc = "v2.1.0"
tofu -chdir=dev plan
tofu -chdir=dev apply

# Step 2: Validate in dev, then promote to staging
# Edit staging/versions.tf: vpc = "v2.1.0"
tofu -chdir=staging plan
# Review plan carefully before applying
tofu -chdir=staging apply

# Step 3: After staging validation, promote to production
# Edit prod/versions.tf: vpc = "v2.1.0"
tofu -chdir=prod plan
tofu -chdir=prod apply
```

## Automated Version Promotion with CI/CD

```yaml
# .github/workflows/promote-module.yml
name: Promote Module Version
on:
  workflow_dispatch:
    inputs:
      module_name:
        description: 'Module to promote'
        required: true
      version:
        description: 'Version to promote'
        required: true
      target_env:
        description: 'Target environment'
        required: true
        type: choice
        options: [staging, prod]

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update version
        run: |
          sed -i "s/${{ inputs.module_name }} = \".*\"/${{ inputs.module_name }} = \"${{ inputs.version }}\"/" \
            ${{ inputs.target_env }}/versions.tf
      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "Promote ${{ inputs.module_name }} ${{ inputs.version }} to ${{ inputs.target_env }}"
```

## Module Changelog in versions.tf

```hcl
# versions.tf - document why each version was chosen
locals {
  module_versions = {
    # v2.0.5: Patched NAT gateway route propagation issue (2026-03-15)
    vpc = "v2.0.5"

    # v1.3.2: Added support for PostgreSQL 16 (2026-02-28)
    database = "v1.3.2"
  }
}
```

## Conclusion

Module versioning across environments creates a safe promotion path for infrastructure changes. Pin dev to branches for rapid iteration, use release candidates in staging, and pin production to stable release tags. A versions manifest file centralizes all version decisions in one place, making it easy to see which version of each module is deployed where.
