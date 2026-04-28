# How to Use Key Provider Aliasing in OpenTofu State Encryption (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to use multiple named key providers in OpenTofu state encryption for key rotation, fallback configurations, and mixed encryption strategies.

## Introduction

Key provider aliasing in OpenTofu's state encryption system allows you to define multiple key providers with different names and use them independently for different purposes - such as primary encryption with one key and fallback decryption with another. This is essential for key rotation and multi-key strategies.

## Basic Aliasing Syntax

Each key provider and method block has a type and a name (alias):

```hcl
terraform {
  encryption {
    # Two different key providers with different aliases
    key_provider "aws_kms" "primary" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/primary-key"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    key_provider "aws_kms" "secondary" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/secondary-key"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    method "aes_gcm" "with_primary" {
      keys = key_provider.aws_kms.primary
    }

    method "aes_gcm" "with_secondary" {
      keys = key_provider.aws_kms.secondary
    }
  }
}
```

## Using Aliases for Key Rotation

During rotation, use the new key as primary and old key as fallback:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "new_pass" {
      passphrase = var.new_passphrase
    }

    key_provider "pbkdf2" "old_pass" {
      passphrase = var.old_passphrase
    }

    method "aes_gcm" "new" {
      keys = key_provider.pbkdf2.new_pass
    }

    method "aes_gcm" "old" {
      keys = key_provider.pbkdf2.old_pass
    }

    state {
      method = method.aes_gcm.new    # Encrypt new state writes with new key

      fallback {
        method = method.aes_gcm.old  # Decrypt existing state with old key
      }
    }
  }
}
```

## Mixed Key Provider Strategy

Use different key types for different purposes:

```hcl
terraform {
  encryption {
    # KMS for production state
    key_provider "aws_kms" "kms" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/prod-key"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    # PBKDF2 for plan files (developer access needed)
    key_provider "pbkdf2" "dev_key" {
      passphrase = var.plan_passphrase
    }

    method "aes_gcm" "kms_method" {
      keys = key_provider.aws_kms.kms
    }

    method "aes_gcm" "pbkdf2_method" {
      keys = key_provider.pbkdf2.dev_key
    }

    state {
      method = method.aes_gcm.kms_method       # State: KMS-encrypted
    }

    plan {
      method = method.aes_gcm.pbkdf2_method    # Plans: passphrase-encrypted
    }
  }
}
```

## Aliasing with Remote State Sources

Use different aliases for remote state and local state:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "local_state" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/this-config-key"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    key_provider "aws_kms" "remote_state" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/networking-config-key"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    method "aes_gcm" "local" {
      keys = key_provider.aws_kms.local_state
    }

    method "aes_gcm" "remote" {
      keys = key_provider.aws_kms.remote_state
    }

    state {
      method = method.aes_gcm.local
    }

    remote_state_data_sources {
      default {
        method = method.aes_gcm.remote
      }
    }
  }
}
```

## Reference Syntax

Always use `PROVIDER_TYPE.ALIAS` notation to reference key providers and methods:

```hcl
# Reference pattern: BLOCK_TYPE.PROVIDER_TYPE.ALIAS

keys   = key_provider.aws_kms.primary
method = method.aes_gcm.new
```

## Conclusion

Key provider aliasing gives you precise control over which keys are used for encryption, decryption, fallback, state, and plan files. Defining multiple named providers enables smooth key rotation with zero downtime, mixed encryption strategies across state types, and separate keys for different configuration layers. Use meaningful alias names to document the purpose of each key provider.
