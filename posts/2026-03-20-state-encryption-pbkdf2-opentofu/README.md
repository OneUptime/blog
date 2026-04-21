# How to Configure State Encryption with PBKDF2 in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to configure OpenTofu state file encryption using the PBKDF2 key provider to protect sensitive infrastructure data at rest.

## Introduction

OpenTofu 1.7+ introduced native state encryption, allowing you to encrypt state files and plan files at rest. The PBKDF2 (Password-Based Key Derivation Function 2) key provider derives an encryption key from a passphrase - making it a practical starting point that requires no external KMS service.

## How PBKDF2 Key Derivation Works

PBKDF2 takes a passphrase and derives a cryptographic key using:
- A salt (randomly generated)
- A hash function (SHA-256 or SHA-512)
- An iteration count (higher = more secure but slower)

The derived key is then used with AES-GCM encryption for the state file.

## Step 1: Configure the Encryption Block

For a new project with no existing state file, add an `encryption` block to your `terraform` configuration:

```hcl
# encryption.tf

terraform {
  required_version = ">= 1.7.0"

  encryption {
    # Define the PBKDF2 key provider
    key_provider "pbkdf2" "state_key" {
      passphrase = var.state_encryption_passphrase

      # Optional: customize the key derivation parameters
      # key_length   = 32       # 32 bytes = 256-bit key (default)
      # iterations   = 600000   # Higher = more secure (default for PBKDF2-SHA512)
      # salt_length  = 32       # Salt length in bytes (default)
      # hash_function = "sha512" # sha256 or sha512 (default: sha512)
    }

    # Define the encryption method using the key provider
    method "aes_gcm" "state_method" {
      keys = key_provider.pbkdf2.state_key
    }

    # Apply encryption to the state
    state {
      method = method.aes_gcm.state_method
    }

    # Optionally, also encrypt plan files
    plan {
      method = method.aes_gcm.state_method
    }
  }
}
```

## Step 2: Define the Passphrase Variable

```hcl
# variables.tf
variable "state_encryption_passphrase" {
  type        = string
  description = "Passphrase used to derive the state encryption key"
  sensitive   = true

  validation {
    condition     = length(var.state_encryption_passphrase) >= 16
    error_message = "Passphrase must be at least 16 characters long."
  }
}
```

## Step 3: Provide the Passphrase Securely

Never hardcode passphrases. Use environment variables or a secrets manager:

```bash
# Set via environment variable
export TF_VAR_state_encryption_passphrase="your-secure-passphrase-here"

# Or pass via CLI (less secure - shows in process list)
tofu apply -var="state_encryption_passphrase=your-secure-passphrase"

# Or use a tfvars file (excluded from git)
echo 'state_encryption_passphrase = "your-secure-passphrase"' > secrets.tfvars
echo 'secrets.tfvars' >> .gitignore
tofu apply -var-file=secrets.tfvars
```

## Step 4: Initialize and Apply

If this project already has an unencrypted state file, OpenTofu requires a temporary `unencrypted` fallback for the first migration apply. Add the `unencrypted` method inside the `encryption` block and use this migration version of the `state` block before running `tofu apply`:

```hcl
method "unencrypted" "migrate" {}

state {
  method = method.aes_gcm.state_method

  fallback {
    method = method.unencrypted.migrate
  }
}
```

After `tofu apply` rewrites the state, remove the `method "unencrypted"` block and the `fallback` block. Repeat the fallback in `plan {}` only if you need to migrate saved plan files.

```bash
# Initialize with the new encryption configuration
tofu init

# Run a plan
tofu plan

# Apply - the state will be encrypted on write
tofu apply
```

After applying, the state file in your backend is now encrypted with AES-GCM using the PBKDF2-derived key.

## Step 5: Verify Encryption

```bash
# For local backend, check the state file contains an encrypted envelope
cat terraform.tfstate  # Should show encrypted_data, not plain state JSON

# Verify you can still read state using OpenTofu
tofu state list  # Should work normally
```

## Using TF_ENCRYPTION Environment Variable

You can also configure encryption via an environment variable without modifying the HCL:

```bash
export TF_ENCRYPTION='
key_provider "pbkdf2" "state_key" {
  passphrase = "my-long-passphrase"
}
method "aes_gcm" "state_method" {
  keys = key_provider.pbkdf2.state_key
}
state {
  method = method.aes_gcm.state_method
}
'
```

## Customizing Key Derivation Strength

For high-security environments, increase the iteration count:

```hcl
key_provider "pbkdf2" "state_key" {
  passphrase    = var.state_encryption_passphrase
  iterations    = 1000000   # 1 million iterations for extra security
  hash_function = "sha512"  # Use SHA-512 for stronger hashing
}
```

## Conclusion

PBKDF2 key providers offer a straightforward way to add state encryption without external dependencies. The passphrase-based approach works well for smaller teams and personal projects. For production environments at scale, consider upgrading to a cloud KMS-based key provider (AWS KMS, GCP KMS, or Azure Key Vault) for better key management, rotation capabilities, and audit trails.
