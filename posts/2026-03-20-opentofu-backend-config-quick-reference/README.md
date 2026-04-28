# How to Use the OpenTofu Backend Configuration Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Backend, State, Quick Reference, Infrastructure as Code

Description: A quick reference for all major OpenTofu backend configurations including S3, Azure Blob, GCS, and HTTP backends.

## Introduction

The backend configuration determines where OpenTofu stores state files and how locking works. This quick reference covers the most common backends with production-ready configurations.

## S3 Backend (AWS)

```hcl
terraform {
  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "env/app/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/my-key"
    use_lockfile   = true  # native S3 locking (OpenTofu 1.10+, no DynamoDB needed)

    # IAM role assumption (optional)
    assume_role = {
      role_arn     = "arn:aws:iam::123456789012:role/OpenTofuStateRole"
      session_name = "opentofu-state"
    }
  }
}
```

## Azure Blob Storage Backend

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tofu-state-rg"
    storage_account_name = "mytofustate"
    container_name       = "tfstate"
    key                  = "prod/app/terraform.tfstate"

    # Authentication (uses environment, CLI, or managed identity)
    use_azuread_auth     = true  # use Azure AD auth instead of storage key
  }
}
```

## GCS Backend (Google Cloud)

```hcl
terraform {
  backend "gcs" {
    bucket          = "my-tofu-state"
    prefix          = "env/app"
    encryption_key  = var.gcs_encryption_key  # optional CSEK

    # Credentials from environment or Workload Identity
  }
}
```

## HTTP Backend (Custom / GitLab)

```hcl
terraform {
  backend "http" {
    address        = "https://gitlab.example.com/api/v4/projects/1/terraform/state/my-app"
    lock_address   = "https://gitlab.example.com/api/v4/projects/1/terraform/state/my-app/lock"
    unlock_address = "https://gitlab.example.com/api/v4/projects/1/terraform/state/my-app/lock"
    username       = "gitlab-ci-token"
    password       = var.gitlab_token
    lock_method    = "POST"
    unlock_method  = "DELETE"
    retry_wait_min = 5
  }
}
```

## Local Backend (Development Only)

```hcl
terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
# Note: Local backend uses system file locks, but state is not shared, so it is not suitable for team use

```

## Partial Backend Configuration

Use partial config to avoid committing sensitive backend values.

```hcl
# main.tf - partial config (safe to commit)
terraform {
  backend "s3" {
    # region and bucket provided at init time
    key     = "prod/app/terraform.tfstate"
    encrypt = true
  }
}
```

```bash
# Provide remaining config at init time
tofu init \
  -backend-config="bucket=my-tofu-state" \
  -backend-config="region=us-east-1" \
  -backend-config="kms_key_id=arn:aws:kms:..."

# Or via a backend config file
# backend.hcl (not committed)
# bucket = "my-tofu-state"
# region = "us-east-1"

tofu init -backend-config=backend.hcl
```

## Migrating Between Backends

```bash
# Change backend config, then re-initialize
tofu init -migrate-state

# OpenTofu will ask to copy state to new backend
# Verify migration
tofu state list
tofu plan  # should show no changes
```

## Backend State Key Conventions

```text
# Recommended key structure:
{organization}/{team}/{environment}/{service}/terraform.tfstate

# Examples:
mycompany/platform/prod/networking/terraform.tfstate
mycompany/platform/prod/eks/terraform.tfstate
mycompany/app-team/prod/api/terraform.tfstate
mycompany/app-team/staging/api/terraform.tfstate
```

## Summary

Use S3 backend for AWS environments with `use_lockfile = true` (no DynamoDB needed in OpenTofu 1.10+), Azure Blob for Azure environments, and GCS for GCP. Use partial backend configuration to avoid committing bucket names or endpoints to version control. Organize state keys hierarchically by organization, team, environment, and service for easy management and access control via IAM policies.
