# How to Use AES-GCM Encryption Method for State in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how AES-GCM works as the encryption method in OpenTofu state encryption and how to configure it with different key providers for authenticated encryption.

## Introduction

AES-GCM (Advanced Encryption Standard with Galois/Counter Mode) is the only currently supported encryption method in OpenTofu for state and plan file encryption at rest. It provides both confidentiality and data integrity (authenticated encryption), making it resistant to tampering. This guide explains the method configuration and its options.

## Why AES-GCM?

AES-GCM provides:
- **Confidentiality**: Data cannot be read without the key
- **Integrity**: Any modification to the ciphertext is detectable
- **Authentication**: Verifies the data came from someone with the key
- **Performance**: Hardware acceleration (AES-NI) on modern CPUs

## Basic AES-GCM Configuration

The `aes_gcm` method block appears between the key provider and the state/plan directives:

```hcl
terraform {
  encryption {
    # Key provider (provides the encryption key)
    key_provider "pbkdf2" "my_key" {
      passphrase = var.passphrase
    }

    # AES-GCM method (uses the key to encrypt/decrypt)
    method "aes_gcm" "my_method" {
      keys = key_provider.pbkdf2.my_key

      # Optional: additional authenticated data (AAD) as bytes
      # aad = [1, 2, 3, 4]
    }

    # Apply to state files
    state {
      method  = method.aes_gcm.my_method
      enforced = true  # Optional safeguard after migration is complete
    }

    # Apply to plan files
    plan {
      method  = method.aes_gcm.my_method
      enforced = true  # Optional safeguard after migration is complete
    }
  }
}
```

## Understanding Key Size

AES-GCM accepts 16-, 24-, or 32-byte keys. Here are two common 256-bit examples:

```hcl
# PBKDF2 with 256-bit key (default)

key_provider "pbkdf2" "key_256" {
  passphrase = var.passphrase
  key_length = 32  # 32 bytes = 256 bits
}

# AWS KMS example requesting a 256-bit data key
key_provider "aws_kms" "key" {
  kms_key_id = "alias/my-key"
  region     = "us-east-1"
  key_spec   = "AES_256"  # Request a 256-bit data key
}
```

## Using Multiple Methods for Migration

During key rotation, you can configure fallback methods:

```hcl
terraform {
  encryption {
    # New key provider
    key_provider "pbkdf2" "new_key" {
      passphrase = var.new_passphrase
    }

    # Old key provider (for reading old state)
    key_provider "pbkdf2" "old_key" {
      passphrase = var.old_passphrase
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
      method = method.aes_gcm.new_method

      # Fallback to old method for reading state encrypted with old key
      fallback {
        method = method.aes_gcm.old_method
      }
    }
  }
}
```

## Enforced vs Non-Enforced Encryption

The `enforced` parameter is optional. When set to `true`, it prevents unencrypted writes if encryption configuration is missing and forbids using the `unencrypted` method in a fallback chain:

```hcl
state {
  method   = method.aes_gcm.my_method
  enforced = true   # Optional safeguard after migration is complete
}

# During migration back to unencrypted state, disable or remove enforced
# and use the unencrypted method as the primary method.
method "unencrypted" "migrate" {}

state {
  method   = method.unencrypted.migrate
  enforced = false
  fallback {
    method = method.aes_gcm.my_method
  }
}
```

## Understanding the Encryption Process

When OpenTofu writes state:

1. The key provider derives, generates, or retrieves key material
2. AES-GCM encrypts the state payload with that key material
3. The encrypted payload and key provider metadata are stored together
4. A random nonce is generated for each encryption operation

When OpenTofu reads state:

1. The key provider metadata is extracted
2. The key provider reconstructs or retrieves the key material
3. AES-GCM decrypts and verifies the payload
4. OpenTofu parses the decrypted JSON

## Verifying the Encrypted State Format

```bash
# Inspect the stored encrypted state wrapper
head -20 terraform.tfstate

# Verify OpenTofu can still read it with the configured encryption block
tofu state list
tofu show
```

## Performance Considerations

AES-GCM is efficient, but exact performance depends on hardware, state size, and key provider configuration:
- PBKDF2 intentionally adds computational cost through its `iterations` setting
- Exact throughput depends on CPU capabilities and the selected key provider
- OpenTofu warns that AES-GCM has key-saturation limits, so long-lived keys should be rotated or derived securely

## Conclusion

AES-GCM is an excellent choice for state file encryption, providing both confidentiality and integrity guarantees. The OpenTofu encryption framework makes it straightforward to combine AES-GCM with any supported key provider. After migration, consider `enforced = true` in production to prevent unencrypted writes if encryption configuration is missing, and configure fallback methods during key rotation to maintain smooth operations.
