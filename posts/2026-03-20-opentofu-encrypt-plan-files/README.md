# How to Encrypt Plan Files in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to encrypt OpenTofu plan files to protect sensitive resource attribute values from being exposed in saved plan outputs.

## Introduction

OpenTofu plan files (`.tfplan`) contain the proposed changes to your infrastructure, including sensitive resource attributes that would be modified. If plan files are stored or transmitted insecurely, they can expose database passwords, API keys, and other sensitive values. OpenTofu's encryption system can protect plan files alongside state files.

## Why Encrypt Plan Files

Plan files contain:
- New resource attribute values (including sensitive ones like passwords)
- Modified attribute values before and after
- The full state of all managed resources

In a CI/CD workflow where plans are saved and applied separately, plan files may be stored in artifact repositories, S3 buckets, or passed between systems - all potential exposure points.

## Configuration

Add a `plan` block alongside the `state` block in your encryption configuration:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "main" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }

    # Encrypt state files
    state {
      method = method.aes_gcm.main
    }

    # Encrypt plan files
    plan {
      method = method.aes_gcm.main
    }
  }
}
```

## Saving and Applying Encrypted Plans

```bash
# Save an encrypted plan file

tofu plan -out=production.tfplan

# The file is now encrypted - not human-readable
file production.tfplan
# production.tfplan: data  (binary, not plain text)

# Apply the encrypted plan
tofu apply production.tfplan
```

## CI/CD Workflow with Encrypted Plans

```yaml
# GitHub Actions: plan in one job, apply in another
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.PLAN_ROLE_ARN }}

      - name: OpenTofu Plan
        run: |
          tofu init
          tofu plan -out=plan.tfplan

      - name: Upload encrypted plan
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: plan.tfplan
          # Plan file is encrypted - safe to store as artifact

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Download plan
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.APPLY_ROLE_ARN }}

      - name: OpenTofu Apply
        run: |
          tofu init
          tofu apply plan.tfplan
```

## Enforcing Plan Encryption

Use `enforced = true` to require all plan files to be encrypted:

```hcl
plan {
  method   = method.aes_gcm.main
  enforced = true  # Refuse to apply unencrypted plan files
}
```

With `enforced = true`, attempting to apply an unencrypted plan file fails with an error.

## Separate Methods for State and Plans

You can use different key providers for state and plan files:

```hcl
key_provider "aws_kms" "state_key" {
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/state-key"
  region     = "us-east-1"
  key_spec   = "AES_256"
}

key_provider "aws_kms" "plan_key" {
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/plan-key"
  region     = "us-east-1"
  key_spec   = "AES_256"
}

method "aes_gcm" "for_state" {
  keys = key_provider.aws_kms.state_key
}

method "aes_gcm" "for_plans" {
  keys = key_provider.aws_kms.plan_key
}

state {
  method = method.aes_gcm.for_state
}

plan {
  method = method.aes_gcm.for_plans
}
```

## Conclusion

Plan file encryption is a simple addition to your existing state encryption configuration - just add a `plan` block with the same method. This protects sensitive values in the plan from exposure in CI/CD artifact storage and ensures that only authorized systems with the decryption key can apply saved plans.
