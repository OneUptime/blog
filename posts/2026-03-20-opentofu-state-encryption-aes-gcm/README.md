# How to Use AES-GCM Encryption Method for State in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how OpenTofu's AES-GCM encryption method works and how to configure it as part of the state encryption system.

## Introduction

AES-GCM (Advanced Encryption Standard in Galois/Counter Mode) is the encryption method used by OpenTofu's state encryption system. It provides both confidentiality (encryption) and integrity verification (authentication tag), making it resistant to tampering. Understanding the `aes_gcm` method block helps you configure state encryption correctly.

## The Encryption Architecture

OpenTofu's state encryption has two layers:

1. **Key provider** - supplies the encryption keys (PBKDF2, AWS KMS, GCP KMS, etc.)
2. **Method** - defines how those keys are used to encrypt data (AES-GCM is the only built-in method)

```text
Key Provider (supplies key material)
         ↓
AES-GCM Method (encrypts/decrypts state using the key)
         ↓
Encrypted state stored in backend
```

## Basic AES-GCM Configuration

```hcl
terraform {
  encryption {
    # Step 1: Configure a key provider
    key_provider "pbkdf2" "main" {
      passphrase = var.state_passphrase
    }

    # Step 2: Configure the AES-GCM method using that key provider
    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    # Step 3: Apply the method to state (and optionally plan files)
    state {
      method = method.aes_gcm.main
    }
  }
}
```

## AES-GCM with AWS KMS

```hcl
encryption {
  key_provider "aws_kms" "primary" {
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
    region     = "us-east-1"
    key_spec   = "AES_256"
  }

  method "aes_gcm" "primary" {
    keys = key_provider.aws_kms.primary
  }

  state {
    method = method.aes_gcm.primary
  }
}
```

## Multiple Methods for Key Rotation

During key rotation, configure two methods - the new key for encryption, old for decryption fallback:

```hcl
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

  method "aes_gcm" "new" {
    keys = key_provider.aws_kms.new_key
  }

  method "aes_gcm" "old" {
    keys = key_provider.aws_kms.old_key
  }

  state {
    method  = method.aes_gcm.new   # Encrypt new writes with new key
    fallback {
      method = method.aes_gcm.old  # Decrypt with old key if needed
    }
  }
}
```

## Applying AES-GCM to Plan Files

```hcl
state {
  method = method.aes_gcm.main
}

plan {
  method = method.aes_gcm.main  # Encrypt saved plan files
}
```

## enforced Flag

The `enforced` flag controls whether OpenTofu will read unencrypted state:

```hcl
state {
  method   = method.aes_gcm.main
  enforced = true   # Refuse to read unencrypted state (strict mode)
  # enforced = false  # Allow reading unencrypted state (migration mode)
}
```

Start with `enforced = false` when encrypting an existing unencrypted state, then switch to `true` once all state is encrypted.

## How AES-GCM Protects State

- **Confidentiality**: State data is encrypted and unreadable without the key
- **Integrity**: The GCM authentication tag detects any tampering with the ciphertext
- **Nonce**: A unique random nonce is generated for each encryption operation, preventing ciphertext reuse

## Conclusion

AES-GCM is OpenTofu's robust encryption method for state files. Pair it with any supported key provider (PBKDF2 for simplicity, cloud KMS for enterprise key management), apply it to both state and plan files, and use the `enforced` flag to control the migration window from unencrypted to encrypted state. The method handles all cryptographic details, leaving you to focus on key provider configuration.
