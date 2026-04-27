# How to Roll Back State Encryption in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to safely remove state encryption in OpenTofu and roll back to unencrypted state when needed.

## Introduction

While enabling state encryption is generally a one-way improvement, there may be scenarios where you need to roll back - during emergency recovery, when switching encryption strategies, or when migrating to a new configuration. OpenTofu supports decryption rollback using the fallback mechanism.

## When to Roll Back Encryption

- Emergency recovery when the key provider is unavailable
- Migrating from one key provider to another (decrypt first, then re-encrypt)
- Removing state encryption for a development environment
- Debugging encryption configuration issues

## Method: Fallback to Unencrypted

To roll back encryption, configure the encrypted method as a fallback while writing new state unencrypted:

```hcl
terraform {
  encryption {
    # Keep the old key provider for decryption
    key_provider "aws_kms" "old_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "encrypted" {
      keys = key_provider.aws_kms.old_key
    }

    # Explicit unencrypted method for the migration
    method "unencrypted" "migrate" {}

    state {
      method   = method.unencrypted.migrate  # No encryption for new writes
      enforced = false                       # Allow reading encrypted state

      fallback {
        method = method.aes_gcm.encrypted    # Decrypt existing state
      }
    }
  }
}
```

## Step-by-Step Rollback

### Step 1: Configure Fallback

Add the configuration above, defining a `method "unencrypted" "migrate" {}` block and pointing the state `method` at it while keeping the encrypted method in `fallback`.

### Step 2: Trigger State Rewrite

```bash
# Rewrite state without encryption

tofu apply -refresh-only
# Confirm: yes
```

State is now written back unencrypted.

### Step 3: Verify Decryption

```bash
# Download and verify state is readable as JSON
tofu state pull | jq '.resources | length'
# Should show the resource count as a number

# AWS S3 verification
aws s3 cp s3://my-tofu-state/production/terraform.tfstate /tmp/state-check
jq . /tmp/state-check  # Should succeed for unencrypted state
```

### Step 4: Remove Encryption Configuration

```hcl
# versions.tf - remove the encryption block entirely
terraform {
  required_version = ">= 1.7"

  # No encryption block
  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Re-initialize without encryption
tofu init
tofu plan  # Should work normally
```

## Emergency Recovery

If the key provider is unavailable and you have a backup:

```bash
# Use the pre-encryption backup (created before you enabled encryption)
tofu state push state-backup-pre-encryption.json

# Verify
tofu state list
tofu plan
```

## PBKDF2 Rollback

```hcl
encryption {
  key_provider "pbkdf2" "old" {
    passphrase = var.old_passphrase
  }

  method "aes_gcm" "old" {
    keys = key_provider.pbkdf2.old
  }

  method "unencrypted" "migrate" {}

  state {
    method   = method.unencrypted.migrate  # No new encryption
    enforced = false
    fallback {
      method = method.aes_gcm.old
    }
  }
}
```

## Important: Always Maintain Backups

Before rolling back:

```bash
# Pull current (encrypted) state as a backup
tofu state pull > encrypted-state-backup-$(date +%Y%m%d).json
```

If the rollback fails, you can restore from this backup using `tofu state push`.

## Conclusion

State encryption rollback uses the same fallback mechanism as key rotation: configure the old encryption method as a fallback while writing new state without encryption. Always maintain backups of the encrypted state before starting rollback, and verify state accessibility with `tofu plan` after completing the process.
