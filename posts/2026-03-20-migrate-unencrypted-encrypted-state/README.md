# How to Migrate from Unencrypted to Encrypted State in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to safely migrate your existing unencrypted OpenTofu state files to encrypted state without disrupting infrastructure or losing state data.

## Introduction

If you've been running OpenTofu without state encryption, you can enable it without losing your existing state. The key is configuring a `fallback` block that points at the `unencrypted` method during migration. By default, OpenTofu refuses to read unencrypted state once encryption is configured (because it could have been tampered with), so the fallback explicitly opts in to reading the existing plaintext state. New state and plan files are always written using the primary (encrypted) method.

## Step 1: Back Up the Unencrypted State

Always back up before making changes:

```bash
# Pull and save the current unencrypted state

tofu state pull > unencrypted-state-backup.tfstate

# Verify the backup is valid
python3 -c "import json; json.load(open('unencrypted-state-backup.tfstate'))" && echo "Valid"

# Store in S3 with timestamp
aws s3 cp unencrypted-state-backup.tfstate \
  s3://my-backups/pre-encryption-backup-$(date +%Y%m%d).tfstate
```

## Step 2: Configure Encryption with a fallback to unencrypted

The critical piece is the `fallback` block pointing at an `unencrypted` method - this is what allows OpenTofu to read your existing unencrypted state during migration. Writes still go through the encrypted primary method:

```hcl
# encryption.tf
terraform {
  required_version = ">= 1.7.0"

  encryption {
    key_provider "pbkdf2" "state_key" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.pbkdf2.state_key
    }

    # Declare the unencrypted method so it can be referenced as a fallback
    method "unencrypted" "migrate" {}

    state {
      method = method.aes_gcm.state_method

      fallback {
        method = method.unencrypted.migrate  # CRITICAL: allows reading existing unencrypted state
      }
    }

    plan {
      method = method.aes_gcm.state_method

      fallback {
        method = method.unencrypted.migrate
      }
    }
  }
}
```

## Step 3: Initialize with New Configuration

```bash
# Set the encryption passphrase
export TF_VAR_state_encryption_passphrase="your-secure-passphrase-here"

# Re-initialize (encryption config is part of the backend init)
tofu init -upgrade
```

## Step 4: Write Encrypted State

Run an operation that writes state - even a no-op apply will re-encrypt the state:

```bash
# Option 1: Refresh-only apply (recommended - no infrastructure changes)
tofu apply -refresh-only

# OpenTofu will:
# 1. Read the existing unencrypted state (allowed by the unencrypted fallback)
# 2. Write the state back encrypted with the primary aes_gcm method

# Option 2: A regular plan to verify before applying
tofu plan
```

Confirm when prompted - the state will be written back encrypted.

## Step 5: Verify Encryption

```bash
# Verify the state is now encrypted
# For local backend:
file terraform.tfstate
# Should NOT be plain text JSON anymore

# Verify OpenTofu can still read the encrypted state
tofu state list
tofu show

# If using S3, download and check the file is not plain JSON
aws s3 cp s3://my-bucket/prod/terraform.tfstate /tmp/check-state.tfstate
cat /tmp/check-state.tfstate | python3 -m json.tool
# Should fail if encrypted (not valid plain JSON)
```

## Step 6: Remove the Fallback and Enable Strict Enforcement

Once the state has been re-written as encrypted, remove the `fallback` block (and the now-unused `unencrypted` method) so OpenTofu will no longer accept plaintext state. You can also set `enforced = true` to refuse to write unencrypted data even if the encryption configuration is later disabled or misconfigured:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "state_key" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.pbkdf2.state_key
    }

    state {
      method   = method.aes_gcm.state_method
      enforced = true  # Refuse to write unencrypted state
    }

    plan {
      method   = method.aes_gcm.state_method
      enforced = true
    }
  }
}
```

```bash
# Apply again to verify enforcement works
tofu apply -refresh-only

# Attempting to use an old unencrypted backup should now fail
tofu state push unencrypted-state-backup.tfstate
# Error: encountered unencrypted payload without unencrypted method
```

## Step 7: Migrate Remote Backend State

For remote backends like S3, the same process applies - the backend reads and writes the state through OpenTofu, which handles encryption/decryption transparently:

```bash
# The state in S3 is re-encrypted on next apply
tofu apply -refresh-only

# Verify by checking S3
aws s3api head-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate
# Metadata will show the encryption details
```

## Handling Team Migrations

When migrating a team's state, coordinate carefully:

1. Communicate the change to all team members
2. Apply the migration in a maintenance window
3. Update CI/CD pipelines to provide the encryption passphrase/key
4. Update any tooling that reads state directly

```bash
# CI/CD pipeline update
# Add to your pipeline environment:
export TF_VAR_state_encryption_passphrase="${STATE_ENCRYPTION_PASSPHRASE}"
# or
export TF_ENCRYPTION='...'
```

## Conclusion

Migrating from unencrypted to encrypted state is a smooth process when you configure an `unencrypted` fallback during the transition. The key insight is that OpenTofu handles the migration automatically - it reads the old unencrypted state via the fallback and writes it back encrypted using the primary method on the next apply. Once that has happened, remove the fallback and turn on `enforced = true` to lock things down. Always back up before migrating and verify encryption is working before tightening enforcement.
