# How to Encrypt Plan Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to encrypt OpenTofu plan files to protect sensitive infrastructure details and prevent plan tampering in CI/CD workflows.

## Introduction

OpenTofu plan files contain detailed information about your infrastructure, including resource attributes with sensitive values. When plan files are stored in CI/CD artifacts, passed between pipeline stages, or stored for audit purposes, encrypting them helps protect that data at rest. OpenTofu 1.7+ supports native plan file encryption.

## Why Encrypt Plan Files?

Plan files may contain:
- Database connection strings from data sources
- Resource attributes with sensitive values
- Configuration details that reveal your architecture
- Potential attack vectors if tampered before apply

## Step 1: Configure Plan File Encryption

For a new project, or after you've completed the one-time migration for an existing one, add the `plan` block to your encryption configuration. If you're enabling encryption on an existing project, use an `unencrypted` fallback during the migration before setting `enforced = true`:

```hcl
# encryption.tf

terraform {
  required_version = ">= 1.7.0"

  encryption {
    key_provider "pbkdf2" "key" {
      passphrase = var.encryption_passphrase
    }

    method "aes_gcm" "method" {
      keys = key_provider.pbkdf2.key
    }

    # Encrypt state files
    state {
      method   = method.aes_gcm.method
      enforced = true
    }

    # Also encrypt plan files
    plan {
      method   = method.aes_gcm.method
      enforced = true
    }
  }
}
```

## Step 2: Save an Encrypted Plan

```bash
# Save an encrypted plan file
tofu plan -out=infrastructure.tfplan

# The plan file is now an encrypted artifact
file infrastructure.tfplan
# Treat it as opaque data, not a human-readable plan
```

## Step 3: Store the Plan File Securely

In CI/CD pipelines, store the encrypted plan file in a secure artifact store:

```yaml
# GitHub Actions example
jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Plan
        env:
          TF_VAR_encryption_passphrase: ${{ secrets.STATE_ENCRYPTION_PASSPHRASE }}
        run: |
          tofu init
          tofu plan -out=infrastructure.tfplan

      - name: Upload Plan
        uses: actions/upload-artifact@v4
        with:
          name: terraform-plan
          path: infrastructure.tfplan
          retention-days: 30

  apply:
    needs: plan
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Download Plan
        uses: actions/download-artifact@v4
        with:
          name: terraform-plan

      - name: Init
        env:
          TF_VAR_encryption_passphrase: ${{ secrets.STATE_ENCRYPTION_PASSPHRASE }}
        run: tofu init

      - name: Apply
        env:
          TF_VAR_encryption_passphrase: ${{ secrets.STATE_ENCRYPTION_PASSPHRASE }}
        run: tofu apply infrastructure.tfplan
```

## Step 4: Apply an Encrypted Plan

Applying an encrypted plan requires the same encryption configuration:

```bash
# Apply requires the same key that was used to create the plan
export TF_VAR_encryption_passphrase="correct-horse-battery-staple"

tofu apply infrastructure.tfplan

# If the plan was encrypted with a different key, apply fails:
# OpenTofu cannot decrypt the saved plan
```

## Using Different Keys for Plan and State

You can use separate keys for plan and state files:

```hcl
terraform {
  encryption {
    # Key for state
    key_provider "aws_kms" "state_key" {
      kms_key_id = "alias/terraform-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    # Separate key for plans
    key_provider "aws_kms" "plan_key" {
      kms_key_id = "alias/terraform-plans"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.aws_kms.state_key
    }

    method "aes_gcm" "plan_method" {
      keys = key_provider.aws_kms.plan_key
    }

    state {
      method   = method.aes_gcm.state_method
      enforced = true
    }

    plan {
      method   = method.aes_gcm.plan_method
      enforced = true
    }
  }
}
```

## Viewing Plan Contents Securely

To review an encrypted plan:

```bash
# Use tofu show (requires the encryption key to be configured)
tofu show -plan=infrastructure.tfplan

# Or for JSON output
tofu show -json -plan=infrastructure.tfplan | jq '.resource_changes[]'

# Get a human-readable diff
tofu show -plan=infrastructure.tfplan | grep -E '^[[:space:]]*[+~-]'
```

## Plan File Integrity

Encrypted plan files use authenticated encryption. If the encrypted file is modified, decryption should fail. This does not protect against replaying an older valid plan file:

```bash
# Modifying the encrypted file should cause decryption to fail
echo "tampered" >> infrastructure.tfplan
tofu apply infrastructure.tfplan
# OpenTofu should refuse to use the modified plan file
```

## Conclusion

Encrypting OpenTofu plan files adds an important layer of security to your CI/CD workflow. It reduces sensitive data leakage through artifact stores and creates a more secure hand-off between plan and apply stages. It also helps detect unauthorized modification of the encrypted artifact, though it does not protect against replaying an older valid plan file. Configure plan encryption alongside state encryption for comprehensive protection of all OpenTofu artifacts.
