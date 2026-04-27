# How to Configure Encryption for Remote State Data Sources in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to configure encryption for the terraform_remote_state data source in OpenTofu when consuming encrypted state from another configuration.

## Introduction

When you use the `terraform_remote_state` data source to read outputs from another OpenTofu configuration, and that configuration has state encryption enabled, you need to configure the same encryption settings to decrypt the remote state. OpenTofu provides the `remote_state_data_sources` block for this purpose.

## Basic Configuration

```hcl
# versions.tf - reading from another config with encrypted state

terraform {
  encryption {
    key_provider "aws_kms" "remote_state" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
      region     = "us-east-1"
    }

    method "aes_gcm" "remote_state" {
      keys = key_provider.aws_kms.remote_state
    }

    # Configure decryption for remote state data sources
    remote_state_data_sources {
      default {
        method = method.aes_gcm.remote_state
      }
    }
  }
}
```

## Using the Remote State Data Source

```hcl
# Read outputs from another configuration
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-tofu-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use the decrypted output
resource "aws_eks_cluster" "main" {
  vpc_config {
    subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
  }
}
```

## Per-Source Encryption Configuration

If you read from multiple remote states with different encryption keys:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "networking_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/networking-key"
      region     = "us-east-1"
    }

    key_provider "aws_kms" "database_key" {
      kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/database-key"
      region     = "us-east-1"
    }

    method "aes_gcm" "networking" {
      keys = key_provider.aws_kms.networking_key
    }

    method "aes_gcm" "database" {
      keys = key_provider.aws_kms.database_key
    }

    remote_state_data_sources {
      # Named source - matches the data source name in configuration
      remote_state_data_source "networking" {
        method = method.aes_gcm.networking
      }

      remote_state_data_source "database" {
        method = method.aes_gcm.database
      }
    }
  }
}
```

## With PBKDF2 Keys

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "remote_state" {
      passphrase = var.networking_state_passphrase
    }

    method "aes_gcm" "remote_state" {
      keys = key_provider.pbkdf2.remote_state
    }

    remote_state_data_sources {
      default {
        method = method.aes_gcm.remote_state
      }
    }
  }
}
```

## Common Pattern: Shared Key for All Remote States

For organizations where all configurations share the same KMS key:

```hcl
terraform {
  encryption {
    key_provider "aws_kms" "shared" {
      kms_key_id = var.org_shared_kms_key_arn
      region     = "us-east-1"
    }

    method "aes_gcm" "shared" {
      keys = key_provider.aws_kms.shared
    }

    state {
      method = method.aes_gcm.shared
    }

    remote_state_data_sources {
      default {
        method = method.aes_gcm.shared
      }
    }
  }
}
```

## Conclusion

Remote state data source encryption allows configurations to read outputs from other encrypted configurations. Configure the `remote_state_data_sources` block with the appropriate decryption key to match the encryption used by the producing configuration. Use a shared organizational KMS key to simplify cross-configuration state sharing while maintaining end-to-end encryption.
