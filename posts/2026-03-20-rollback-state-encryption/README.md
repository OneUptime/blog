# How to Roll Back State Encryption in OpenTofu - Rollback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to safely roll back OpenTofu state encryption and return to unencrypted state when needed, such as for legacy tool compatibility or incident recovery.

## Introduction

There are situations where you need to roll back state encryption: a legacy tool can't read encrypted state, you're migrating to a different encryption approach, or you need to recover from a key loss by restoring a pre-encryption backup. When the current key is available, OpenTofu supports this through the reverse migration process - configuring an explicit unencrypted method while allowing reads of the currently encrypted state.

## Warning: Understand the Risks

Rolling back encryption means your state file will be stored unencrypted. This exposes sensitive values like database passwords, API keys, and private certificates. Only proceed if:
- You're migrating to a different encryption mechanism
- Your backend provides equivalent protection (e.g., S3 SSE-KMS)
- It's a temporary measure for incident recovery

## Step 1: Ensure You Have the Encryption Key

You must have the current encryption key to decrypt state:

```bash
# Verify you can read state with the current configuration

tofu state list

# If this fails, you may not have the correct key - stop here
```

## Step 2: Configure Decryption-Only Mode

Set up encryption to read encrypted state but write unencrypted:

```hcl
# encryption.tf
terraform {
  encryption {
    method "unencrypted" "migrate" {}

    key_provider "pbkdf2" "current_key" {
      passphrase = var.current_encryption_passphrase
    }

    method "aes_gcm" "current_method" {
      keys = key_provider.pbkdf2.current_key
    }

    state {
      # Write unencrypted through the explicit migration method
      method   = method.unencrypted.migrate
      enforced = false  # Allow unencrypted writes during rollback

      # The fallback handles reading existing encrypted state
      fallback {
        method = method.aes_gcm.current_method
      }
    }

    plan {
      method   = method.unencrypted.migrate
      enforced = false

      fallback {
        method = method.aes_gcm.current_method
      }
    }
  }
}
```

## Step 3: Run an Apply to Re-Write State Unencrypted

```bash
# Set the passphrase for decryption
export TF_VAR_current_encryption_passphrase="your-current-passphrase"

# Run refresh-only apply to re-write state
tofu apply -refresh-only

# OpenTofu will:
# 1. Read the encrypted state (via fallback method)
# 2. Write it back with the unencrypted migration method
```

## Step 4: Verify State is Unencrypted

```bash
# For local backend, verify state is readable JSON
python3 -m json.tool terraform.tfstate && echo "Valid plain JSON - unencrypted"

# For S3
aws s3 cp s3://my-bucket/prod/terraform.tfstate /tmp/check.tfstate
python3 -m json.tool /tmp/check.tfstate
# Should succeed and show readable JSON

# Verify OpenTofu can read the state
tofu state list
```

## Step 5: Remove Encryption Configuration

Once state is unencrypted, remove the encryption block entirely:

```hcl
# encryption.tf - simplified after rollback
terraform {
  required_version = ">= 1.7.0"

  # No encryption block - state is stored unencrypted
}
```

```bash
# Re-initialize to apply the changed configuration
tofu init -upgrade

# Verify state is still accessible
tofu state list
tofu plan  # Should show no changes
```

## Emergency Rollback When Key Is Lost

If you've lost the encryption key and can't decrypt state:

```bash
# Check S3 for previous unencrypted versions
aws s3api list-object-versions \
  --bucket my-terraform-state \
  --prefix prod/terraform.tfstate

# Look for versions from before encryption was enabled
# Download an older version
aws s3api get-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --version-id "PRE_ENCRYPTION_VERSION_ID" \
  recovered-state.tfstate

# Verify it's unencrypted JSON
python3 -m json.tool recovered-state.tfstate

# Remove the encryption block first so the recovered state is written unencrypted.
# Then push the recovered state.
tofu state push recovered-state.tfstate

# If OpenTofu rejects the push because the remote state has a higher serial,
# re-check that this is the version you want, then force the restore.
# tofu state push -force recovered-state.tfstate
```

If no backup exists, you'll need to rebuild state by re-importing all resources.

## Partial Rollback: Keep Encryption for New Features

If you want to roll back encryption for state but keep it for plans (or vice versa):

```hcl
terraform {
  encryption {
    method "unencrypted" "migrate" {}

    key_provider "pbkdf2" "key" {
      passphrase = var.passphrase
    }

    method "aes_gcm" "method" {
      keys = key_provider.pbkdf2.key
    }

    # Keep state unencrypted but encrypt plans
    state {
      method   = method.unencrypted.migrate
      enforced = false
      fallback {
        method = method.aes_gcm.method
      }
    }

    plan {
      method   = method.aes_gcm.method
      enforced = true
    }
  }
}
```

## Conclusion

Rolling back state encryption is a reversible operation as long as you retain the original encryption key. The unencrypted migration method and fallback mechanism make this safe - OpenTofu can decrypt existing state while writing new state unencrypted. Always have a plan for key custody before enabling encryption, and ensure backups exist at each stage of the process. After rolling back, implement compensating controls (backend-level encryption, strict access policies) to maintain security.
