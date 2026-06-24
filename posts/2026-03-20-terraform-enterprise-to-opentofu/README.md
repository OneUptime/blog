# How to Migrate from Terraform Enterprise to OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform Enterprise, Migration, OpenTofu Cloud, Infrastructure as Code, DevOps

Description: Learn how to migrate from Terraform Enterprise (TFE) or Terraform Cloud (TFC) to OpenTofu-compatible platforms - covering workspace migration, state transfer, and CI/CD updates.

## Introduction

HCP Terraform (formerly Terraform Cloud) is HashiCorp's managed platform, and Terraform Enterprise (TFE) is the self-hosted distribution for Terraform at scale. When migrating to OpenTofu, you can self-host OpenTofu with open-source tooling such as Atlantis, run it in CI, or use a commercial OpenTofu-compatible TACOS platform such as Spacelift or env0. This guide covers the migration path.

## Options After Leaving Terraform Enterprise

| Option | Description | Best For |
|--------|-------------|----------|
| Atlantis | Open-source PR automation, self-hosted | Teams wanting full control |
| Spacelift | Commercial, policy-as-code, audit logs | Enterprise features |
| env0 | Commercial, cost management, TTL destroy | FinOps-focused teams |
| Managed TACOS platform | Third-party managed OpenTofu-compatible service | HCP Terraform-style hosted workflows |
| GitHub Actions | DIY with tofu CLI | Simple pipelines |

## Step 1: Export State from HCP Terraform/Enterprise

```bash
# Install jq and use curl against HCP Terraform or your TFE hostname

TFC_TOKEN="your-terraform-cloud-token"
TFC_HOST="app.terraform.io" # For Terraform Enterprise, use your TFE hostname.
ORGANIZATION="my-org"
WORKSPACE="production-vpc"

# Get the workspace ID
WORKSPACE_ID=$(curl -s \
  -H "Authorization: Bearer $TFC_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://$TFC_HOST/api/v2/organizations/$ORGANIZATION/workspaces/$WORKSPACE" \
  | jq -r '.data.id')

# Get the current state version
STATE_URL=$(curl -s \
  -H "Authorization: Bearer $TFC_TOKEN" \
  -H "Content-Type: application/vnd.api+json" \
  "https://$TFC_HOST/api/v2/workspaces/$WORKSPACE_ID/current-state-version" \
  | jq -r '.data.attributes."hosted-state-download-url"')

# Download the state file
curl -s "$STATE_URL" > terraform.tfstate

echo "State exported for workspace: $WORKSPACE"
```

## Step 2: Upload State to New Backend

```bash
# Upload to S3 backend
aws s3 cp terraform.tfstate \
  s3://my-company-tofu-state/production/vpc/terraform.tfstate \
  --sse aws:kms \
  --sse-kms-key-id arn:aws:kms:us-east-1:123456789012:key/abc123

echo "State uploaded to S3"
```

## Step 3: Update Backend Configuration

```hcl
# Before: HCP Terraform cloud block
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production-vpc"
    }
  }
}
```

```hcl
# After: S3 backend for OpenTofu
terraform {
  backend "s3" {
    bucket         = "my-company-tofu-state"
    key            = "production/vpc/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abc123"
    dynamodb_table = "terraform-state-locks"
  }
}
```

## Step 4: Re-Initialize with OpenTofu

```bash
# Remove old backend metadata but keep the provider lock file
rm -rf .terraform/

# Initialize with new backend
tofu init -reconfigure

# Verify state is intact
tofu show | head -30

# Run plan - must show no changes
tofu plan
# Expected: No changes. Your infrastructure matches the configuration.
```

## Step 5: Migrate to Atlantis (PR Automation)

```yaml
# atlantis.yaml
version: 3
projects:
  - name: production-vpc
    dir: environments/production/vpc
    workspace: default
    terraform_distribution: opentofu
    terraform_version: 1.9.0

workflows:
  default:
    plan:
      steps:
        - init:
            extra_args: ["-input=false"]
        - plan:
            extra_args: ["-input=false"]
    apply:
      steps:
        - apply
```

## Step 6: Replace Sentinel with OPA

If your Terraform Enterprise policy sets use Sentinel, replace them with OPA/conftest:

```rego
# policies/require_encryption.rego (replaces Sentinel policy)
package main

deny contains msg if {
    some resource in input.resource_changes
    resource.type == "aws_s3_bucket_server_side_encryption_configuration"
    some action in resource.change.actions
    action in ["create", "update"]

    some rule in resource.change.after.rule
    some encryption in rule.apply_server_side_encryption_by_default
    encryption.sse_algorithm != "aws:kms"

    msg := sprintf("S3 bucket encryption configuration '%s' must use KMS encryption", [resource.address])
}
```

```bash
# Run in CI
tofu plan -out=tfplan.binary
tofu show -json tfplan.binary > tfplan.json
conftest test tfplan.json --policy policies/
```

## Step 7: Replace TFE Variables with CI Secrets

Terraform Enterprise stores workspace variables. Replace with CI/CD secrets:

```yaml
# GitHub Actions: TFE variables become GitHub secrets/vars
- name: OpenTofu Apply
  run: tofu apply -auto-approve
  env:
    TF_VAR_db_password: ${{ secrets.DB_PASSWORD }}
    TF_VAR_api_key: ${{ secrets.API_KEY }}
    TF_VAR_environment: ${{ vars.ENVIRONMENT }}
```

## Conclusion

Migrating from Terraform Enterprise to OpenTofu requires: exporting state from HCP Terraform/TFE via API, uploading it to your chosen backend (S3, GCS, AzureRM), updating backend configuration, and replacing Sentinel policies with OPA/conftest. Choose Atlantis for self-hosted PR automation, or Spacelift/env0 for managed enterprise features. For supported Terraform/OpenTofu version pairs, no separate state conversion step is usually needed.
