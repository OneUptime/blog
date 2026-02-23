# How to Use OpenTofu State Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, State Encryption, Security, Infrastructure as Code

Description: Learn how to configure state encryption in OpenTofu to protect sensitive data in your state files, covering key providers, encryption methods, key rotation, and migration strategies.

---

Terraform state files contain sensitive information. Database passwords, API keys, private IP addresses, and resource ARNs are all stored in plain text in the state file. Terraform itself never offered built-in state encryption beyond what the backend provides. OpenTofu changed this by introducing native state encryption as a first-class feature. This guide covers how to set it up and manage it.

## Why State Encryption Matters

Even when you store state in encrypted backends like S3 with server-side encryption, the state is decrypted when it reaches your machine. Anyone with access to the filesystem, CI/CD logs, or the backend API can read sensitive values in plain text.

```bash
# Sensitive values are visible in unencrypted state
tofu state pull | grep -i password
# "password": "my-super-secret-password"

# Or
tofu state pull | grep -i api_key
# "api_key": "sk-1234567890abcdef"
```

OpenTofu state encryption adds a layer of client-side encryption. The state is encrypted before it is written to the backend and decrypted only when OpenTofu reads it. This means the state stored in S3, Azure Blob, or GCS is encrypted with keys you control, independent of the backend's own encryption.

## How State Encryption Works

OpenTofu uses a key provider to manage encryption keys and an encryption method to perform the actual encryption. You configure both in the `terraform` block.

The architecture has three components:

1. **Key Provider** - Manages the encryption key (PBKDF2 passphrase, AWS KMS, GCP KMS, etc.)
2. **Method** - The encryption algorithm (AES-GCM)
3. **Target** - What gets encrypted (state, plan files, or both)

## Basic Setup with Passphrase

The simplest way to enable state encryption uses a passphrase-based key:

```hcl
# main.tf
terraform {
  encryption {
    # Define a key provider using PBKDF2 passphrase derivation
    key_provider "pbkdf2" "main" {
      passphrase = var.state_encryption_passphrase
    }

    # Define the encryption method
    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    # Encrypt the state
    state {
      method = method.aes_gcm.main
    }

    # Optionally encrypt plan files too
    plan {
      method = method.aes_gcm.main
    }
  }
}

variable "state_encryption_passphrase" {
  type      = string
  sensitive = true
}
```

```bash
# Set the passphrase via environment variable
export TF_VAR_state_encryption_passphrase="my-very-strong-passphrase-at-least-32-chars"

# Initialize and apply
tofu init
tofu apply
```

## Using AWS KMS for Key Management

For production environments, use a proper key management service:

```hcl
terraform {
  encryption {
    # Use AWS KMS as the key provider
    key_provider "aws_kms" "main" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    method "aes_gcm" "main" {
      keys = key_provider.aws_kms.main
    }

    state {
      method = method.aes_gcm.main
    }

    plan {
      method = method.aes_gcm.main
    }
  }
}
```

The advantages of using KMS:
- Key material never leaves the KMS service
- Key access is controlled by IAM policies
- Key usage is audited via CloudTrail
- Key rotation can be automated

## Using GCP KMS

```hcl
terraform {
  encryption {
    key_provider "gcp_kms" "main" {
      kms_encryption_key = "projects/my-project/locations/us-central1/keyRings/opentofu/cryptoKeys/state-key"
      key_length         = 256
    }

    method "aes_gcm" "main" {
      keys = key_provider.gcp_kms.main
    }

    state {
      method = method.aes_gcm.main
    }
  }
}
```

## Encrypting Existing State

If you have existing unencrypted state and want to encrypt it, OpenTofu handles the migration:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    # Use a fallback with no encryption to read the existing unencrypted state
    method "unencrypted" "migrate" {}

    state {
      method = method.aes_gcm.main

      # The fallback method is tried when the primary method fails
      # This allows reading old unencrypted state
      fallback {
        method = method.unencrypted.migrate
      }
    }
  }
}
```

```bash
# Apply to re-encrypt the state
tofu apply

# After successful apply, the state is now encrypted
# You can remove the fallback block
```

## Key Rotation

To rotate encryption keys, use the fallback mechanism to read state encrypted with the old key and re-encrypt with the new key:

```hcl
terraform {
  encryption {
    # New key
    key_provider "pbkdf2" "new" {
      passphrase = var.new_passphrase
    }

    # Old key (for reading existing state)
    key_provider "pbkdf2" "old" {
      passphrase = var.old_passphrase
    }

    method "aes_gcm" "new" {
      keys = key_provider.pbkdf2.new
    }

    method "aes_gcm" "old" {
      keys = key_provider.pbkdf2.old
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

```bash
# Run apply to re-encrypt with the new key
tofu apply

# After successful apply, update to use only the new key
# Remove the old key provider and fallback block
```

## Encrypting Plan Files

Plan files can also contain sensitive data. Encrypt them:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    state {
      method = method.aes_gcm.main
    }

    plan {
      method = method.aes_gcm.main
    }
  }
}
```

```bash
# Plan files are now encrypted
tofu plan -out=plan.bin

# The plan file is encrypted at rest
# Only someone with the encryption key can read it
tofu show plan.bin  # Works because tofu has the key
```

## Enforcing Encryption

To prevent accidentally running without encryption, set a strict policy:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    state {
      method   = method.aes_gcm.main
      enforced = true  # Fail if encryption cannot be applied
    }
  }
}
```

With `enforced = true`, OpenTofu will refuse to read or write state without encryption. This prevents someone from accidentally removing the encryption configuration and writing unencrypted state.

## CI/CD Integration

In CI/CD pipelines, pass the encryption key securely:

```yaml
# GitHub Actions example
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: 1.8.0

      - name: Init
        run: tofu init
        env:
          TF_VAR_state_encryption_passphrase: ${{ secrets.STATE_ENCRYPTION_KEY }}

      - name: Plan
        run: tofu plan -out=plan.bin
        env:
          TF_VAR_state_encryption_passphrase: ${{ secrets.STATE_ENCRYPTION_KEY }}

      - name: Apply
        run: tofu apply plan.bin
        env:
          TF_VAR_state_encryption_passphrase: ${{ secrets.STATE_ENCRYPTION_KEY }}
```

## Verifying Encryption

Confirm that your state is actually encrypted:

```bash
# Pull the raw state from the backend
# For S3:
aws s3 cp s3://my-state-bucket/production/terraform.tfstate ./raw-state.bin

# Try to read it as JSON (should fail or show encrypted content)
cat raw-state.bin
# Output will be binary/encrypted data, not readable JSON

# Through OpenTofu (with the key), it's readable
tofu state pull | python3 -m json.tool | head -20
# Shows normal JSON state
```

## Troubleshooting

**"Failed to decrypt state"** - The passphrase or KMS key does not match what was used to encrypt the state. Check your environment variables.

**"State encryption is not configured"** - You are trying to read encrypted state without the encryption block in your configuration.

**Key rotation issues** - Make sure the fallback block is configured with the old key before running apply. If you remove the old key too early, you will be locked out.

## Best Practices

**Store encryption keys separately from state.** Never put the encryption passphrase in the same repository as your OpenTofu code.

**Use KMS over passphrases for production.** KMS provides audit trails, automatic rotation, and access control that passphrases cannot.

**Always encrypt plan files alongside state.** Plan files can contain the same sensitive data as state files.

**Test key rotation in a staging environment first.** A failed rotation can lock you out of your state.

**Keep backup copies of encryption keys.** If you lose the key, you lose access to your state permanently.

State encryption is one of the strongest arguments for OpenTofu over Terraform. It addresses a real security gap that the Terraform community has been asking about for years.

For more details on the client-side approach, see [How to Use OpenTofu Client-Side State Encryption](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-client-side-state-encryption/view).
