# How to Use State Encryption Introduced in OpenTofu 1.7

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, State Encryption, Security, OpenTofu 1.7, Infrastructure as Code

Description: Learn how to enable and configure native state encryption introduced in OpenTofu 1.7 to protect sensitive values in your Terraform state files.

## Introduction

OpenTofu 1.7 introduced native state encryption as a first-class feature. State files often contain sensitive values like database passwords, API keys, and private keys. Encrypting the state at rest adds a critical security layer independent of your backend's encryption.

## Basic State Encryption with PBKDF2

The simplest encryption uses a passphrase with PBKDF2 key derivation.

```hcl
# main.tf

terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      # In OpenTofu 1.7, keep real passphrases out of committed HCL by
      # supplying equivalent configuration through TF_ENCRYPTION.
      passphrase = "replace-with-a-long-passphrase"

      # Key derivation parameters
      key_length   = 32  # 256-bit key
      iterations   = 600000
      salt_length  = 32
      hash_function = "sha512"
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    state {
      method = method.aes_gcm.main

      # Consider enabling this after the first successful encrypted write.
      # enforced = true
    }
  }
}
```

## Using AWS KMS for Key Management

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "main" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123"
      region     = "us-east-1"

      # Generate a 256-bit data key for AES-GCM
      key_spec = "AES_256"
    }

    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }

    state {
      method   = method.aes_gcm.main
      enforced = true
    }

    # Also encrypt plan files
    plan {
      method   = method.aes_gcm.main
      enforced = true
    }
  }
}
```

## Using GCP KMS

```hcl
terraform {
  encryption {
    key_provider "gcp_kms" "main" {
      kms_encryption_key = "projects/my-project/locations/us-east1/keyRings/my-ring/cryptoKeys/my-key"
      key_length         = 32
    }

    method "aes_gcm" "main" {
      keys = key_provider.gcp_kms.main
    }

    state {
      method   = method.aes_gcm.main
      enforced = true
    }
  }
}
```

## Key Rotation

Rotate encryption keys without decrypting and re-encrypting manually.

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "new_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/new-key-id"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    key_provider "aws_kms" "old_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/old-key-id"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "main" {
      # Use new key for writing; accept old key for reading during rotation
      keys = key_provider.aws_kms.new_key
    }

    method "aes_gcm" "fallback" {
      keys = key_provider.aws_kms.old_key
    }

    state {
      method = method.aes_gcm.main

      # Read state encrypted with old key
      fallback {
        method = method.aes_gcm.fallback
      }
    }
  }
}
```

## Migrating Existing Unencrypted State

```bash
# Step 1: Add method "unencrypted" "migrate" {}
# Step 2: Add fallback { method = method.unencrypted.migrate } to state
# Step 3: Run tofu apply to re-encrypt state
tofu apply

# Step 4: Remove the fallback block and consider setting enforced = true
# Step 5: Commit the updated configuration
```

## Summary

OpenTofu 1.7 native state encryption protects sensitive values in state files using PBKDF2 passphrases or cloud KMS keys. An `unencrypted` fallback controls migration from plaintext state, the `enforced` flag can prevent unencrypted writes after migration, and key fallbacks enable smooth key rotation. This feature adds encryption independent of backend storage, protecting state even if your S3 bucket or storage backend is compromised without access to your encryption key.
