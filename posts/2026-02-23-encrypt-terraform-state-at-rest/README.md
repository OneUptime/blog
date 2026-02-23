# How to Encrypt Terraform State at Rest

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Security, Encryption, DevOps

Description: Learn how to encrypt Terraform state files at rest using various backend options including S3, GCS, Azure Blob, and Terraform Cloud.

---

Terraform state files contain everything Terraform knows about your infrastructure. That includes resource IDs, IP addresses, database connection strings, and sometimes even passwords and API keys stored as resource attributes. If someone gets access to your state file, they get a detailed map of your infrastructure and potentially the keys to the kingdom.

Encrypting state at rest is a baseline security measure. Here's how to set it up across different backends.

## What's in a State File That Needs Protection

Before diving into encryption, it helps to understand what you're protecting. A typical state file might contain:

- Cloud resource IDs and ARNs
- IP addresses (public and private)
- Database endpoints and connection strings
- IAM role ARNs and policy documents
- TLS certificate details
- Output values (which might include secrets)
- Resource attributes that store sensitive provider data

Even if you use `sensitive = true` on outputs, the values are still stored in plain text in the state file. The `sensitive` flag only affects CLI output display - it does not encrypt anything.

## S3 Backend with Server-Side Encryption

AWS S3 is one of the most popular Terraform backends. Enabling encryption is straightforward:

```hcl
# backend.tf - S3 backend with AES-256 server-side encryption
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"

    # Enable server-side encryption using AES-256
    encrypt = true
  }
}
```

The `encrypt = true` flag tells Terraform to request SSE-S3 (AES-256) encryption when writing the state file. This uses AWS-managed keys.

### Using KMS for Stronger Control

For more control over the encryption keys, use AWS KMS:

```hcl
# backend.tf - S3 backend with KMS encryption
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true

    # Use a specific KMS key for encryption
    kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abcd1234-ef56-7890-abcd-ef1234567890"
  }
}
```

With KMS, you can:

- Rotate keys automatically.
- Audit who accessed the encryption key via CloudTrail.
- Restrict key usage to specific IAM roles.
- Use separate keys for different environments.

### Enforcing Encryption via Bucket Policy

Even with `encrypt = true`, someone could misconfigure a backend and write unencrypted state. Add a bucket policy to enforce encryption at the S3 level:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-terraform-state/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    },
    {
      "Sid": "DenyNonSSLRequests",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::my-terraform-state",
        "arn:aws:s3:::my-terraform-state/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

This policy does two things: it rejects any object uploads that aren't KMS-encrypted, and it blocks any non-HTTPS requests.

## Google Cloud Storage Backend

GCS encrypts all data at rest by default using Google-managed keys. But you can use customer-managed encryption keys (CMEK) for more control:

```hcl
# backend.tf - GCS backend with customer-managed encryption key
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"

    # Use a Cloud KMS key for encryption
    encryption_key = "projects/my-project/locations/us-central1/keyRings/terraform/cryptoKeys/state-key"
  }
}
```

Set up the KMS key first:

```bash
# Create a key ring and key for Terraform state encryption
gcloud kms keyrings create terraform \
  --location us-central1

gcloud kms keys create state-key \
  --location us-central1 \
  --keyring terraform \
  --purpose encryption \
  --rotation-period 90d
```

## Azure Blob Storage Backend

Azure Storage accounts support several encryption options. The backend configuration looks like this:

```hcl
# backend.tf - Azure backend (encryption is handled at the storage account level)
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "myterraformstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

Azure encrypts storage account data at rest by default using Microsoft-managed keys. To use customer-managed keys, configure the storage account:

```hcl
# Configure storage account with customer-managed encryption key
resource "azurerm_storage_account" "terraform_state" {
  name                     = "myterraformstate"
  resource_group_name      = azurerm_resource_group.state.name
  location                 = azurerm_resource_group.state.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Require HTTPS for all connections
  enable_https_traffic_only = true

  # Configure customer-managed key encryption
  identity {
    type = "SystemAssigned"
  }
}

resource "azurerm_storage_account_customer_managed_key" "terraform_state" {
  storage_account_id = azurerm_storage_account.terraform_state.id
  key_vault_id       = azurerm_key_vault.terraform.id
  key_name           = azurerm_key_vault_key.state_encryption.name
}
```

## Terraform Cloud and Terraform Enterprise

If you use Terraform Cloud or Enterprise, state encryption is handled for you automatically. HashiCorp encrypts state at rest using their internal encryption mechanisms. You can verify this in your workspace settings.

```hcl
# backend.tf - Terraform Cloud backend (encryption is automatic)
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "production"
    }
  }
}
```

Terraform Cloud also encrypts state in transit and provides detailed audit logs of who accessed the state.

## Encrypting Local State Files

If you must use local state (for testing or development), you can encrypt the file at the filesystem level:

### Using LUKS on Linux

```bash
# Create an encrypted volume for Terraform state
sudo cryptsetup luksFormat /dev/sdb1
sudo cryptsetup luksOpen /dev/sdb1 terraform-state
sudo mkfs.ext4 /dev/mapper/terraform-state
sudo mount /dev/mapper/terraform-state /mnt/terraform-state
```

### Using FileVault on macOS

FileVault encrypts the entire disk. You can also create an encrypted disk image:

```bash
# Create an encrypted disk image for state files
hdiutil create -size 100m -encryption AES-256 \
  -stdinpass -fs APFS \
  -volname "TerraformState" \
  ~/terraform-state.dmg
```

### Using SOPS for State Encryption

Mozilla SOPS can encrypt files at rest. While it's not natively integrated with Terraform, you can wrap your workflow:

```bash
# Encrypt the state file after each apply
terraform apply
sops --encrypt --kms "arn:aws:kms:us-east-1:123456789012:key/abcd1234" \
  terraform.tfstate > terraform.tfstate.enc

# Decrypt before the next operation
sops --decrypt terraform.tfstate.enc > terraform.tfstate
terraform plan
```

This is hacky and error-prone. Remote backends with built-in encryption are always preferable.

## Encryption in Transit

Encryption at rest only protects stored data. You also need encryption in transit. All major remote backends use HTTPS by default, but make sure you're not accidentally downgrading:

```hcl
# S3 backend - ensure HTTPS (this is the default)
terraform {
  backend "s3" {
    bucket   = "my-terraform-state"
    key      = "prod/terraform.tfstate"
    region   = "us-east-1"
    encrypt  = true

    # Explicitly skip insecure HTTP
    skip_metadata_api_check = false
  }
}
```

## Key Rotation

Encryption keys should be rotated regularly. With AWS KMS, you can enable automatic rotation:

```hcl
# KMS key with automatic annual rotation
resource "aws_kms_key" "terraform_state" {
  description             = "KMS key for Terraform state encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true  # Rotates annually

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowTerraformAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:role/terraform-role"
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "terraform_state" {
  name          = "alias/terraform-state"
  target_key_id = aws_kms_key.terraform_state.key_id
}
```

## Verifying Encryption

After setting up encryption, verify it's working:

```bash
# For S3, check the object's encryption metadata
aws s3api head-object \
  --bucket my-terraform-state \
  --key prod/terraform.tfstate \
  --query 'ServerSideEncryption'

# Should return "aws:kms" or "AES256"
```

## Wrapping Up

Encrypting Terraform state at rest is non-negotiable for production environments. The state file is a high-value target containing a complete inventory of your infrastructure. Use your cloud provider's native encryption features with customer-managed keys when possible, enforce encryption through bucket policies, and don't forget about encryption in transit.

For more on securing your Terraform workflow, check out our posts on [configuring state access controls](https://oneuptime.com/blog/post/2026-02-23-configure-state-access-controls-terraform/view) and [auditing state changes](https://oneuptime.com/blog/post/2026-02-23-audit-terraform-state-changes/view).
