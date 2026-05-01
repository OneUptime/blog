# How to Configure Encryption for Remote State Data Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to configure OpenTofu to decrypt remote state data sources when reading encrypted state from other configurations using the remote_state_data_sources encryption block.

## Introduction

When using the `terraform_remote_state` data source to read state from another OpenTofu configuration, if that remote state is encrypted, you need to configure decryption in your consuming configuration. OpenTofu handles this through the `remote_state_data_sources` encryption block.

## The Problem

If a remote state is encrypted, reading it without decryption configuration will fail:

```text
Error: Failed to read remote state
  Unsupported state file format: This state file is encrypted and can not be read without an encryption configuration
```

## Step 1: Ensure the Source Configuration Has Encryption

The source configuration writes encrypted state:

```hcl
# networking/encryption.tf (source configuration)

terraform {
  encryption {
    key_provider "aws_kms" "networking_state_key" {
      kms_key_id = "alias/terraform-networking-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "networking_method" {
      keys = key_provider.aws_kms.networking_state_key
    }

    state {
      method   = method.aes_gcm.networking_method
      enforced = true
    }
  }
}
```

## Step 2: Configure remote_state_data_sources in the Consumer

In the consuming configuration, configure decryption for the remote state:

```hcl
# application/encryption.tf (consuming configuration)
terraform {
  encryption {
    # Key for THIS configuration's state
    key_provider "aws_kms" "app_state_key" {
      kms_key_id = "alias/terraform-app-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "app_method" {
      keys = key_provider.aws_kms.app_state_key
    }

    state {
      method   = method.aes_gcm.app_method
      enforced = true
    }

    # Configure decryption for the remote state data source
    remote_state_data_sources {
      # Default decryption for all terraform_remote_state sources
      default {
        method = method.aes_gcm.networking_method
      }
    }

    # Key for reading the networking state
    key_provider "aws_kms" "networking_state_key" {
      kms_key_id = "alias/terraform-networking-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "networking_method" {
      keys = key_provider.aws_kms.networking_state_key
    }
  }
}
```

## Step 3: Use the terraform_remote_state Data Source

```hcl
# application/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

## Named Remote State Configuration

If you read from multiple remote configurations with different encryption keys, name them:

```hcl
terraform {
  encryption {
    # Keys and methods for different remote states
    key_provider "aws_kms" "networking_key" {
      kms_key_id = "alias/networking-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    key_provider "aws_kms" "database_key" {
      kms_key_id = "alias/database-state"
      region     = "us-east-1"
      key_spec   = "AES_256"
    }

    method "aes_gcm" "networking_method" {
      keys = key_provider.aws_kms.networking_key
    }

    method "aes_gcm" "database_method" {
      keys = key_provider.aws_kms.database_key
    }

    remote_state_data_sources {
      # Configure per data source using the data source name
      remote_state_data_source "networking" {
        method = method.aes_gcm.networking_method
      }

      remote_state_data_source "database" {
        method = method.aes_gcm.database_method
      }
    }
  }
}
```

## Using PBKDF2 for Remote State

If the source uses passphrase-based encryption:

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "remote_key" {
      passphrase = var.remote_state_passphrase
    }

    method "aes_gcm" "remote_method" {
      keys = key_provider.pbkdf2.remote_key
    }

    remote_state_data_sources {
      default {
        method = method.aes_gcm.remote_method
      }
    }
  }
}
```

## IAM Permissions for Cross-Account Remote State

When reading remote state from a different AWS account, use the source KMS key's key ARN or alias ARN in the consuming configuration, and ensure both the source KMS key policy and the consuming role policy allow access:

```hcl
# The consuming role needs KMS permissions for the source account's key
data "aws_iam_policy_document" "cross_account_kms" {
  statement {
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey",
      "kms:DescribeKey"
    ]
    resources = [
      "arn:aws:kms:us-east-1:OTHER_ACCOUNT:key/networking-key-id"
    ]
  }
}
```

## Conclusion

Configuring encryption for remote state data sources ensures that encrypted state from one configuration can be transparently decrypted by another. Use the `remote_state_data_sources` block to configure per-source or default decryption settings. When reading from multiple configurations with different keys, name each source configuration explicitly for precise control over which key is used for each remote state.
