# How to Implement Infrastructure Versioning Strategy with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Versioning, Modules, Semantic Versioning, DevOps

Description: Learn how to implement a comprehensive infrastructure versioning strategy with Terraform, covering module versioning, provider pinning, state versioning, and release management for infrastructure code.

---

Infrastructure versioning is the practice of treating your Terraform code, modules, and configurations with the same versioning discipline as application code. Just as you would not deploy an unversioned application to production, you should not apply unversioned infrastructure changes. A proper versioning strategy provides traceability, rollback capability, and confidence in what is deployed.

In this guide, we will cover how to implement a comprehensive versioning strategy for Terraform infrastructure.

## The Three Pillars of Infrastructure Versioning

Infrastructure versioning has three key components: module versioning (the building blocks), configuration versioning (how modules are composed), and state versioning (the record of what is deployed).

## Module Versioning with Semantic Versioning

Every shared module should follow semantic versioning strictly:

```hcl
# modules/vpc/versions.tf
# This module follows semantic versioning:
# MAJOR.MINOR.PATCH
# - MAJOR: Breaking changes (renamed variables, removed features)
# - MINOR: New features, backward compatible
# - PATCH: Bug fixes, no API changes

# CHANGELOG.md for the VPC module
# ## [3.0.0] - 2026-02-15
# ### Breaking Changes
# - Renamed `enable_nat` to `nat_gateway_enabled`
# - Changed output `subnet_ids` to `private_subnet_ids`
# ### Migration Guide
# - Update variable references in your configurations
#
# ## [2.3.0] - 2026-01-20
# ### Added
# - Support for IPv6 CIDR blocks
# - VPC endpoint configuration
#
# ## [2.2.1] - 2026-01-10
# ### Fixed
# - NAT gateway route table association in multi-AZ setup
```

## Pinning Module Versions

Consumers should pin to specific version ranges:

```hcl
# environments/production/main.tf
# Pin modules with pessimistic version constraints

module "vpc" {
  source  = "app.terraform.io/myorg/vpc/aws"
  version = "~> 3.0"  # Allows 3.x.x but not 4.0.0

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}

module "ecs" {
  source  = "app.terraform.io/myorg/ecs-service/aws"
  version = "= 2.5.3"  # Exact version for maximum stability

  cluster_name = "production"
}

# For Git-sourced modules, use tags
module "monitoring" {
  source = "git::https://github.com/myorg/terraform-aws-monitoring.git?ref=v1.4.2"
}
```

## Provider Version Pinning

```hcl
# versions.tf
# Pin provider versions to prevent unexpected changes

terraform {
  # Pin Terraform itself
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # Allow patch updates but not minor or major
      version = "~> 5.35.0"
    }
  }
}

# Lock file (.terraform.lock.hcl) captures exact versions
# and checksums. Always commit this file to version control.
```

## Configuration Versioning with Git Tags

Tag your infrastructure repository to mark deployment milestones:

```bash
#!/bin/bash
# scripts/tag-release.sh
# Tag infrastructure releases

ENVIRONMENT=$1
VERSION=$2

# Validate inputs
if [ -z "$ENVIRONMENT" ] || [ -z "$VERSION" ]; then
    echo "Usage: ./tag-release.sh <environment> <version>"
    exit 1
fi

# Create an annotated tag
git tag -a "${ENVIRONMENT}-v${VERSION}" \
  -m "Infrastructure release ${VERSION} for ${ENVIRONMENT}"

# Push the tag
git push origin "${ENVIRONMENT}-v${VERSION}"

echo "Tagged and pushed: ${ENVIRONMENT}-v${VERSION}"
```

## State Versioning for Rollback

Enable state versioning so you can roll back to previous states:

```hcl
# backend-setup/state-versioning.tf
# S3 bucket with versioning for state rollback capability

resource "aws_s3_bucket" "terraform_state" {
  bucket = "myorg-terraform-state"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Keep old state versions for 1 year
resource "aws_s3_bucket_lifecycle_configuration" "state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    id     = "state-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}
```

```bash
#!/bin/bash
# scripts/rollback-state.sh
# Roll back to a previous state version

BUCKET="myorg-terraform-state"
KEY="production/terraform.tfstate"

# List available versions
echo "Available state versions:"
aws s3api list-object-versions \
  --bucket "$BUCKET" \
  --prefix "$KEY" \
  --query 'Versions[].{VersionId:VersionId,LastModified:LastModified}' \
  --output table

# Restore a specific version
VERSION_ID=$1
if [ -n "$VERSION_ID" ]; then
    aws s3api get-object \
      --bucket "$BUCKET" \
      --key "$KEY" \
      --version-id "$VERSION_ID" \
      restored-state.tfstate

    echo "State version $VERSION_ID restored to restored-state.tfstate"
    echo "Review the state, then push if correct:"
    echo "  terraform state push restored-state.tfstate"
fi
```

## Release Management Workflow

Implement a structured release process:

```yaml
# .github/workflows/infrastructure-release.yaml
name: Infrastructure Release

on:
  push:
    tags:
      - 'production-v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Extract Version
        id: version
        run: |
          VERSION=${GITHUB_REF#refs/tags/production-v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Terraform Plan
        working-directory: environments/production
        run: |
          terraform init
          terraform plan -out=tfplan

      - name: Terraform Apply
        working-directory: environments/production
        run: terraform apply tfplan

      - name: Create Release Notes
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: context.ref.replace('refs/tags/', ''),
              name: `Production Release v${{ steps.version.outputs.version }}`,
              body: `Infrastructure deployed to production.`,
              draft: false,
              prerelease: false
            });
```

## Module Upgrade Strategy

Plan how and when to upgrade module versions:

```yaml
# versioning/upgrade-strategy.yaml
# Module upgrade process

process:
  1_review:
    action: "Review changelog for new version"
    check: "Are there breaking changes?"

  2_test_dev:
    action: "Update version in dev environment"
    verify: "Run plan and apply in dev"
    duration: "1 week minimum in dev"

  3_test_staging:
    action: "Update version in staging"
    verify: "Run full test suite"
    duration: "1 week minimum in staging"

  4_production:
    action: "Update version in production"
    verify: "Monitor for 24 hours"
    rollback_plan: "Revert Git commit and re-apply"
```

## Best Practices

Always commit the .terraform.lock.hcl file. This file ensures that every team member and CI/CD pipeline uses exactly the same provider versions.

Use version constraints, not exact versions, for modules you actively maintain. This allows you to receive bug fixes without manual updates.

Tag every production deployment. This creates an audit trail and enables rollback to any previous state.

Test upgrades in lower environments first. Never upgrade module or provider versions directly in production.

Keep a changelog for every module. Consumers need to understand what changed before they upgrade.

## Conclusion

A comprehensive infrastructure versioning strategy with Terraform provides the traceability, stability, and rollback capability that production infrastructure demands. By versioning modules with semver, pinning providers, tagging releases, and maintaining state history, you create an environment where every infrastructure change is traceable and reversible. This discipline is what separates hobby Terraform usage from production-grade infrastructure management.
