# How to Use Key Provider Aliasing in OpenTofu State Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to use key provider aliasing in OpenTofu state encryption to manage multiple encryption keys, support key rotation, and configure per-component encryption.

## Introduction

OpenTofu's encryption framework supports multiple key providers of the same type through aliasing. Each key provider is identified by its type and a name (alias). This enables patterns like using different keys for different components, maintaining old keys for fallback, or configuring per-environment keys.

## Understanding Key Provider Syntax

Key providers are referenced using the pattern `key_provider.<type>.<alias>`:

```hcl
terraform {
  encryption {
    # key_provider "<type>" "<alias>" { ... }
    key_provider "pbkdf2" "production"  { passphrase = "prod-passphrase-1234" }
    key_provider "pbkdf2" "staging"     { passphrase = "stage-passphrase-1234" }
    key_provider "aws_kms" "primary" {
      kms_key_id = "alias/primary"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }
    key_provider "aws_kms" "secondary" {
      kms_key_id = "alias/secondary"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }
  }
}
```

## Pattern 1: Multiple Keys for Different Environments

Use aliased providers to configure different keys per environment:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "prod_key" {
      kms_key_id = "alias/terraform-prod-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    key_provider "aws_kms" "staging_key" {
      kms_key_id = "alias/terraform-staging-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    # Choose the key provider in the method block
    method "aes_gcm" "environment_method" {
      keys = var.environment == "production" ? key_provider.aws_kms.prod_key : key_provider.aws_kms.staging_key
    }

    state {
      method = method.aes_gcm.environment_method
    }
  }
}
```

## Pattern 2: Key Rotation with Old and New Aliases

Use aliases to distinguish between current and previous keys during rotation:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "key_2026" {
      passphrase = var.passphrase_2026  # New key
    }

    key_provider "pbkdf2" "key_2025" {
      passphrase = var.passphrase_2025  # Old key (for fallback)
    }

    method "aes_gcm" "method_2026" {
      keys = key_provider.pbkdf2.key_2026
    }

    method "aes_gcm" "method_2025" {
      keys = key_provider.pbkdf2.key_2025
    }

    state {
      method   = method.aes_gcm.method_2026  # Write with new key
      enforced = true

      fallback {
        method = method.aes_gcm.method_2025  # Read with old key
      }
    }
  }
}
```

## Pattern 3: Multi-Region Key Providers

Use aliases to define AWS KMS multi-Region replica keys in multiple regions:

```hcl
terraform {
  encryption {
    # Primary multi-Region KMS key
    key_provider "aws_kms" "us_east_1" {
      kms_key_id = "alias/terraform-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    # Replica of the same multi-Region KMS key
    key_provider "aws_kms" "eu_west_1" {
      kms_key_id = "alias/terraform-state"
      region     = "eu-west-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "primary_region" {
      keys = key_provider.aws_kms.us_east_1
    }

    method "aes_gcm" "dr_region" {
      keys = key_provider.aws_kms.eu_west_1
    }

    state {
      method = method.aes_gcm.primary_region
      fallback {
        method = method.aes_gcm.dr_region
      }
    }
  }
}
```

## Pattern 4: Separate Aliases for State and Plan

Different keys for state files and plan files:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "state_key" {
      kms_key_id = "alias/terraform-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    key_provider "aws_kms" "plan_key" {
      kms_key_id = "alias/terraform-plans"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "for_state" {
      keys = key_provider.aws_kms.state_key
    }

    method "aes_gcm" "for_plans" {
      keys = key_provider.aws_kms.plan_key
    }

    state {
      method   = method.aes_gcm.for_state
      enforced = true
    }

    plan {
      method   = method.aes_gcm.for_plans
      enforced = true
    }
  }
}
```

## Pattern 5: Mixed Provider Types

Combine different key provider types using aliases:

```hcl
terraform {
  encryption {
    # AWS KMS for production
    key_provider "aws_kms" "production" {
      kms_key_id = "alias/terraform-prod"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    # PBKDF2 for development (no KMS cost)
    key_provider "pbkdf2" "development" {
      passphrase = var.dev_passphrase
    }

    # Choose the key provider in the method block
    method "aes_gcm" "environment_method" {
      keys = var.environment == "production" ? key_provider.aws_kms.production : key_provider.pbkdf2.development
    }

    state {
      method = method.aes_gcm.environment_method
    }
  }
}
```

## Conclusion

Key provider aliasing in OpenTofu gives you precise control over which encryption keys are used for different scenarios. This enables clean key rotation patterns using old/new aliases, per-environment key separation, multi-region disaster recovery with compatible multi-Region KMS keys, and mixing key provider types within a single configuration. Design your alias naming convention to be self-documenting - including the year, environment, or purpose in the alias name makes the configuration easy to understand and maintain.
