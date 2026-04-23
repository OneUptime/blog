# How to Rotate Encryption Keys for OpenTofu State - State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to safely rotate encryption keys for OpenTofu state files without losing access to existing state data.

## Introduction

Regular key rotation is a security best practice that limits the exposure window if a key is compromised. OpenTofu's encryption framework supports key rotation through the `fallback` mechanism - you configure a new key while keeping the old key available for reading existing encrypted state, then migrate.

## Key Rotation Strategies

There are two approaches:

1. **Gradual rotation with fallback**: New state is encrypted with the new key; old state can still be read with the fallback key
2. **Forced rotation**: Re-encrypt all state with the new key in a single operation

## Step 1: Add the New Key While Keeping the Old

Update your encryption configuration to include both old and new keys:

```hcl
# encryption.tf

terraform {
  encryption {
    # New key (will be used for all new writes)
    key_provider "pbkdf2" "new_key" {
      passphrase = var.new_encryption_passphrase
    }

    # Old key (kept for reading existing encrypted state)
    key_provider "pbkdf2" "old_key" {
      passphrase = var.old_encryption_passphrase
    }

    # New method
    method "aes_gcm" "new_method" {
      keys = key_provider.pbkdf2.new_key
    }

    # Old method (for decryption fallback)
    method "aes_gcm" "old_method" {
      keys = key_provider.pbkdf2.old_key
    }

    state {
      method   = method.aes_gcm.new_method
      enforced = true

      # Fallback allows reading state encrypted with the old key
      fallback {
        method = method.aes_gcm.old_method
      }
    }

    plan {
      method   = method.aes_gcm.new_method
      enforced = true

      fallback {
        method = method.aes_gcm.old_method
      }
    }
  }
}
```

```hcl
# variables.tf
variable "new_encryption_passphrase" {
  type      = string
  sensitive = true
}

variable "old_encryption_passphrase" {
  type      = string
  sensitive = true
}
```

## Step 2: Provide Both Passphrases

```bash
export TF_VAR_new_encryption_passphrase="new-secure-passphrase-2026"
export TF_VAR_old_encryption_passphrase="old-secure-passphrase-2025"
```

## Step 3: Run a Plan and Apply

Running `tofu apply` re-encrypts the state with the new key:

```bash
# Plan to verify no infrastructure changes
tofu plan

# Apply (state will be re-encrypted with the new key)
tofu apply

# Even with no changes, apply re-writes state with the new encryption key
# Use a refresh-only apply if you need to force a state write without changing resources:
tofu apply -refresh-only
```

After apply, the state is encrypted with the new key.

## Step 4: Verify the Rotation

```bash
# Verify state is accessible with new key
tofu state list
tofu show

# Test that new key works without the fallback
# (temporarily remove the old_key and fallback to verify)
```

## Step 5: Remove the Old Key

Once you've confirmed the state is re-encrypted with the new key, remove the fallback:

```hcl
terraform {
  encryption {
    # Only the new key remains
    key_provider "pbkdf2" "new_key" {
      passphrase = var.new_encryption_passphrase
    }

    method "aes_gcm" "new_method" {
      keys = key_provider.pbkdf2.new_key
    }

    state {
      method   = method.aes_gcm.new_method
      enforced = true
      # Fallback removed - old key is no longer used
    }

    plan {
      method   = method.aes_gcm.new_method
      enforced = true
      # Fallback removed - old key is no longer used
    }
  }
}
```

## Rotating AWS KMS Keys

For KMS-based encryption, rotation is handled differently:

```hcl
# Step 1: AWS manages automatic rotation
resource "aws_kms_key" "state" {
  enable_key_rotation = true  # AWS rotates annually automatically
}
```

For manual rotation with a new KMS key:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "new_key" {
      kms_key_id = "arn:aws:kms:us-east-1:111122223333:key/11111111-1111-1111-1111-111111111111"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    key_provider "aws_kms" "old_key" {
      kms_key_id = "arn:aws:kms:us-east-1:111122223333:key/22222222-2222-2222-2222-222222222222"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "new_method" {
      keys = key_provider.aws_kms.new_key
    }

    method "aes_gcm" "old_method" {
      keys = key_provider.aws_kms.old_key
    }

    state {
      method = method.aes_gcm.new_method
      fallback {
        method = method.aes_gcm.old_method
      }
    }
  }
}
```

## Rotation Timeline Best Practices

- **Rotate every 90 days** for highly sensitive environments
- **Rotate every year** for standard production workloads
- **Rotate immediately** if a key is suspected to be compromised
- **Keep old keys available** for at least one full apply cycle before removing the fallback

## Conclusion

Key rotation in OpenTofu is a safe, gradual process thanks to the fallback mechanism. By configuring the new key as primary and the old key as a fallback, you can rotate without any disruption to ongoing operations. Once the state is re-encrypted with the new key via an apply, remove the fallback and retire the old key. Regular key rotation is a fundamental security practice that should be automated through your key management service's native rotation capabilities where possible.
