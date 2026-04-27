# How to Configure State Encryption with PBKDF2 in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to configure OpenTofu state encryption using PBKDF2 key derivation to protect state files end-to-end with a passphrase-based key.

## Introduction

OpenTofu's native state encryption feature encrypts state before writing it to the backend, providing end-to-end protection even if the backend is compromised. PBKDF2 (Password-Based Key Derivation Function 2) derives an encryption key from a passphrase, making it the easiest key provider to configure without external services.

## Basic PBKDF2 Encryption

```hcl
# versions.tf

terraform {
  required_version = ">= 1.7"  # State encryption requires OpenTofu 1.7+

  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    state {
      method = method.aes_gcm.main
    }
  }

  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```hcl
# variables.tf
variable "state_passphrase" {
  type      = string
  sensitive = true
  description = "Passphrase for state file encryption"
}
```

## Providing the Passphrase

```bash
# Via environment variable (recommended for CI/CD)
export TF_VAR_state_passphrase="your-strong-passphrase-here"
tofu init
tofu plan

# Via .tfvars file (do not commit this file)
echo 'state_passphrase = "your-strong-passphrase"' > encryption.tfvars
tofu plan -var-file=encryption.tfvars
```

## Using TF_ENCRYPTION for Passphrase

```bash
# OpenTofu supports the TF_ENCRYPTION environment variable
export TF_ENCRYPTION='
key_provider "pbkdf2" "main" {
  passphrase = "your-strong-passphrase"
}
method "aes_gcm" "main" {
  keys = key_provider.pbkdf2.main
}
state {
  method = method.aes_gcm.main
}
'
```

## PBKDF2 Configuration Options

```hcl
key_provider "pbkdf2" "main" {
  passphrase = var.state_passphrase

  # Optional: tune key derivation parameters
  key_length   = 32       # 32 bytes = 256-bit AES key
  iterations   = 600000   # Higher = more CPU, more secure
  salt_length  = 32       # Salt length in bytes
  hash_function = "sha512" # sha256 or sha512
}
```

## Encrypting Plan Files Too

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    state {
      method = method.aes_gcm.main
    }

    # Also encrypt plan files
    plan {
      method = method.aes_gcm.main
    }
  }
}
```

## Migration: Enabling Encryption on Existing State

To migrate from unencrypted state, declare an `unencrypted` method and reference it in a `fallback` block. OpenTofu will read existing unencrypted state via the fallback and write back using the new encrypted method:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.state_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    # Allow reading existing unencrypted state during migration
    method "unencrypted" "migrate" {}

    state {
      method = method.aes_gcm.main
      fallback {
        method = method.unencrypted.migrate
      }
    }
  }
}
```

```bash
# Step 1: Apply to re-encrypt existing state with the new method
tofu apply

# Step 2: Remove the fallback block and the unencrypted method,
# then optionally add `enforced = true` to refuse unencrypted reads/writes
```

## Verifying Encryption

```bash
# Download the state file from S3
aws s3 cp s3://my-tofu-state/production/terraform.tfstate /tmp/state.json

# Verify it is not readable as JSON (should be binary/encrypted)
file /tmp/state.json
# /tmp/state.json: data  (not JSON)

# OpenTofu can still read it with the correct passphrase
tofu show
```

## Conclusion

PBKDF2 state encryption provides strong end-to-end protection without requiring external key management services. Configure it with a strong passphrase stored in a secrets manager, use a `fallback` block with an `unencrypted` method during migration from unencrypted state, and extend encryption to plan files for complete protection of sensitive infrastructure data.
