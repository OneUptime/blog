# How to Rotate Encryption Keys for OpenTofu State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to safely rotate encryption keys for OpenTofu state files using fallback methods to maintain continuous access during key transitions.

## Introduction

Key rotation is a security best practice that limits the exposure window if a key is compromised. OpenTofu's state encryption system supports key rotation through fallback method configuration - you can add a new key for encryption while keeping the old key available for decryption until all state is re-encrypted.

## Rotation Strategy

The rotation process has three phases:

1. **Add new key with fallback** - encrypt new writes with new key, decrypt old state with old key
2. **Re-encrypt state** - run `tofu apply -refresh-only` to rewrite state with new key
3. **Remove old key** - once state is fully re-encrypted, remove the fallback

## Phase 1: Configure New Key with Fallback

```hcl
terraform {
  encryption {
    # New key provider
    key_provider "aws_kms" "new_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/new-key-abc"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    # Old key provider (kept for decryption)
    key_provider "aws_kms" "old_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/old-key-xyz"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    method "aes_gcm" "new" {
      keys = key_provider.aws_kms.new_key
    }

    method "aes_gcm" "old" {
      keys = key_provider.aws_kms.old_key
    }

    state {
      method = method.aes_gcm.new    # Encrypt new writes with new key

      fallback {
        method = method.aes_gcm.old  # Decrypt existing state with old key
      }
    }

    plan {
      method = method.aes_gcm.new
      fallback {
        method = method.aes_gcm.old
      }
    }
  }
}
```

## Phase 2: Re-Encrypt Existing State

```bash
# Apply refresh-only to rewrite state with the new key

tofu apply -refresh-only
# Confirm: yes

# State is now encrypted with the new key
```

## Phase 3: Remove the Old Key

After verifying state was re-encrypted, remove the fallback:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "new_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/new-key-abc"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    method "aes_gcm" "new" {
      keys = key_provider.aws_kms.new_key
    }

    state {
      method = method.aes_gcm.new   # Only new key now
      # fallback block removed
    }
  }
}
```

## PBKDF2 Passphrase Rotation

The same pattern works for passphrase-based keys:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "new_passphrase" {
      passphrase = var.new_passphrase
    }

    key_provider "pbkdf2" "old_passphrase" {
      passphrase = var.old_passphrase
    }

    method "aes_gcm" "new" {
      keys = key_provider.pbkdf2.new_passphrase
    }

    method "aes_gcm" "old" {
      keys = key_provider.pbkdf2.old_passphrase
    }

    state {
      method = method.aes_gcm.new
      fallback {
        method = method.aes_gcm.old
      }
    }
  }
}
```

## Automated KMS Key Rotation

For AWS KMS, enable automatic key rotation to rotate the underlying key material automatically without configuration changes:

```hcl
resource "aws_kms_key" "tofu_state" {
  description         = "OpenTofu state encryption key"
  enable_key_rotation = true  # AWS rotates the key material annually
}
```

With automatic KMS rotation, the KMS key ID remains the same but the underlying cryptographic material rotates automatically.

## Conclusion

Key rotation for OpenTofu state uses a three-phase fallback approach: add the new key with the old key as fallback, re-encrypt state, then remove the fallback. For cloud KMS providers, enable automatic key rotation to handle cryptographic material rotation transparently. Always verify state is accessible after each phase before removing the old key.
