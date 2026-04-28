# How to Migrate from Unencrypted to Encrypted State in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to safely migrate existing unencrypted OpenTofu state to encrypted state without disrupting your infrastructure management workflow.

## Introduction

Enabling state encryption on an existing configuration requires careful migration - you need to read the existing unencrypted state and write it back encrypted. OpenTofu supports this with a `fallback` block that references an `unencrypted` method, which allows reading unencrypted state during the transition period while writing it back encrypted with the primary method.

## Prerequisites

- OpenTofu version 1.7 or later
- A configured key provider (PBKDF2, AWS KMS, GCP KMS, etc.)
- Backup of the current state

## Step 1: Back Up Current State

```bash
# Create a backup before starting migration

tofu state pull > state-backup-pre-encryption-$(date +%Y%m%d).json

# Verify the backup
jq '.resources | length' state-backup-pre-encryption-*.json
```

## Step 2: Add Encryption Configuration with a Fallback Method

```hcl
# versions.tf
terraform {
  required_version = ">= 1.7"

  encryption {
    method "unencrypted" "migrate" {}

    key_provider "aws_kms" "main" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
      region     = "us-east-1"
    }

    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }

    state {
      method = method.aes_gcm.main
      fallback {
        method = method.unencrypted.migrate  # CRITICAL: allow reading unencrypted state during migration
      }
    }
  }
}
```

## Step 3: Re-Initialize

```bash
# Re-initialize with new encryption configuration
tofu init
```

## Step 4: Trigger State Re-Write

Run `tofu apply -refresh-only` to cause OpenTofu to read the existing unencrypted state and write it back encrypted:

```bash
tofu apply -refresh-only
# Confirm: yes
# Output: Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
```

The state is now encrypted on the backend.

## Step 5: Verify Encryption

```bash
# For S3 backend: download and check the state file
aws s3 cp s3://my-tofu-state/production/terraform.tfstate /tmp/check-state
file /tmp/check-state
# Expected: /tmp/check-state: data  (not JSON)

# Verify OpenTofu can still read it
tofu state list  # Should show all resources
```

## Step 6: Remove the Fallback and Enforce Encryption

Once you have confirmed encryption is working, remove the `fallback` block (and the `method "unencrypted" "migrate"` definition) and optionally add `enforced = true` to refuse reading unencrypted state going forward:

```hcl
state {
  method   = method.aes_gcm.main
  enforced = true  # Now refuse to read unencrypted state under any circumstance
}
```

```bash
tofu plan  # Should work normally
```

## PBKDF2 Migration Example

```hcl
encryption {
  method "unencrypted" "migrate" {}

  key_provider "pbkdf2" "main" {
    passphrase = var.state_passphrase
  }

  method "aes_gcm" "main" {
    keys = key_provider.pbkdf2.main
  }

  state {
    method = method.aes_gcm.main
    fallback {
      method = method.unencrypted.migrate  # Allow reading unencrypted during migration
    }
  }
}
```

## Rollback Plan

If something goes wrong during migration:

```bash
# Restore from pre-migration backup
tofu state push state-backup-pre-encryption-20260320.json

# Remove the encryption block from configuration
# Run tofu plan to confirm state is accessible
tofu plan
```

## Conclusion

Migrating to encrypted state is a safe two-step process: configure encryption with a `fallback` block referencing `method "unencrypted" "migrate"`, trigger a state rewrite with `tofu apply -refresh-only`, verify encryption, then remove the fallback (and optionally set `enforced = true`). The backup created in Step 1 provides a rollback path if anything goes wrong. After successful migration, protect the state passphrase or KMS key ARN as carefully as the state file itself.
