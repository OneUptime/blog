# How to Enable State File Encryption in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Encryption, Security, Infrastructure as Code

Description: Comprehensive guide to encrypting Terraform state files across different backends, including S3, Azure, GCS, and local state, with best practices for protecting sensitive infrastructure data.

---

The Terraform state file is one of the most sensitive files in your infrastructure codebase. It contains the actual values of every attribute Terraform manages - including database passwords, API keys, private IP addresses, and other secrets. Encrypting your state file is not optional for any serious deployment. This guide covers how to enable encryption across every major backend.

## Why State Files Need Encryption

Let's be concrete about what is at stake. Here is what a typical state file might contain:

```json
{
  "resources": [
    {
      "type": "aws_db_instance",
      "name": "main",
      "instances": [
        {
          "attributes": {
            "password": "MyDatabaseP@ssw0rd!",
            "endpoint": "mydb.abc123.us-east-1.rds.amazonaws.com:5432",
            "username": "admin"
          }
        }
      ]
    },
    {
      "type": "aws_iam_access_key",
      "name": "deploy",
      "instances": [
        {
          "attributes": {
            "id": "AKIAIOSFODNN7EXAMPLE",
            "secret": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
          }
        }
      ]
    }
  ]
}
```

Anyone with access to this file has database credentials, IAM keys, and detailed infrastructure information. Encryption at rest ensures that even if someone gains access to the storage medium, they cannot read the state data without the encryption key.

## S3 Backend Encryption

### Server-Side Encryption with S3-Managed Keys (SSE-S3)

The simplest approach - Amazon manages the encryption keys:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"

    # Enable server-side encryption with S3-managed keys
    encrypt = true
  }
}
```

Setting `encrypt = true` applies AES-256 encryption to the state file. S3 handles key management automatically.

### Server-Side Encryption with KMS (SSE-KMS)

For more control, use a KMS key:

```bash
# Create a KMS key for Terraform state
aws kms create-key \
  --description "Terraform state encryption" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS

# Create an alias for easier reference
aws kms create-alias \
  --alias-name alias/terraform-state \
  --target-key-id <key-id-from-previous-command>
```

```hcl
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

    # Use a specific KMS key for encryption
    kms_key_id = "alias/terraform-state"
  }
}
```

KMS gives you several advantages over SSE-S3:
- Key rotation policies
- CloudTrail logging of key usage
- Fine-grained access control through key policies
- Ability to revoke access by disabling the key

### S3 Bucket Policy for Encryption Enforcement

Force all objects in the bucket to be encrypted:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-terraform-state/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "aws:kms"
        }
      }
    }
  ]
}
```

## Azure Blob Storage Encryption

Azure encrypts all Blob Storage data at rest by default using Microsoft-managed keys. No configuration needed in Terraform.

For customer-managed keys:

```bash
# Create a Key Vault
az keyvault create \
  --name tf-state-vault \
  --resource-group terraform-rg \
  --location eastus \
  --enable-purge-protection

# Create an encryption key
az keyvault key create \
  --vault-name tf-state-vault \
  --name tf-state-key \
  --protection software \
  --kty RSA \
  --size 2048
```

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-rg"
    storage_account_name = "tfstateaccount"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"

    # Azure handles encryption automatically
    # Customer-managed keys are configured at the storage account level
  }
}
```

## GCS Backend Encryption

### Google-Managed Keys (Default)

GCS encrypts all data at rest by default. No extra configuration:

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "terraform/state"

    # Encryption happens automatically
  }
}
```

### Customer-Managed Keys (CMEK)

Use Cloud KMS:

```hcl
terraform {
  backend "gcs" {
    bucket             = "my-terraform-state"
    prefix             = "terraform/state"

    # Cloud KMS key for encryption
    kms_encryption_key = "projects/my-project/locations/us-central1/keyRings/terraform/cryptoKeys/state-key"
  }
}
```

### Customer-Supplied Keys (CSEK)

Provide your own encryption key:

```bash
# Generate a 256-bit AES key
openssl rand -base64 32 > encryption_key.txt

# Set it as an environment variable
export GOOGLE_ENCRYPTION_KEY=$(cat encryption_key.txt)
```

```hcl
terraform {
  backend "gcs" {
    bucket         = "my-terraform-state"
    prefix         = "terraform/state"

    # Customer-supplied encryption key (passed via env var)
    encryption_key = "base64-encoded-key"
  }
}
```

With CSEK, you are responsible for managing the key. If you lose it, the state is unrecoverable.

## Consul Backend Encryption

Consul supports encryption in transit (TLS) and at rest (through Consul's gossip encryption):

```hcl
terraform {
  backend "consul" {
    address   = "consul.example.com:8501"
    scheme    = "https"
    path      = "terraform/state"

    # TLS configuration for encryption in transit
    ca_file   = "/path/to/ca.pem"
    cert_file = "/path/to/client-cert.pem"
    key_file  = "/path/to/client-key.pem"
  }
}
```

For encryption at rest, configure Consul's gossip encryption:

```hcl
# consul-config.hcl
encrypt = "your-gossip-encryption-key"
```

## PostgreSQL Backend Encryption

For the PostgreSQL backend, encryption is handled at the database level:

```bash
# Use SSL for encryption in transit
export PG_CONN_STR="postgres://user:pass@host:5432/db?sslmode=verify-full"
```

For encryption at rest, use full-disk encryption on the database server or use a managed database service that provides encryption (like RDS with encryption enabled).

## Local State File Encryption

Local state files are the most vulnerable because they sit on disk in plain text. Here are your options:

### Full-Disk Encryption

The simplest approach is to enable full-disk encryption on your workstation:

- **macOS**: FileVault (System Preferences -> Security & Privacy -> FileVault)
- **Linux**: LUKS/dm-crypt during installation
- **Windows**: BitLocker

### GPG Encryption

Encrypt and decrypt the state file manually:

```bash
# Encrypt the state file before committing (if you must store it in git)
gpg --symmetric --cipher-algo AES256 terraform.tfstate

# Decrypt when needed
gpg --decrypt terraform.tfstate.gpg > terraform.tfstate
```

### SOPS Integration

Mozilla SOPS can encrypt specific files. While it does not integrate directly with Terraform state, you can use it as a wrapper:

```bash
# Encrypt the state file with SOPS
sops --encrypt --input-type json --output-type json \
  terraform.tfstate > terraform.tfstate.enc

# Decrypt when needed
sops --decrypt --input-type json --output-type json \
  terraform.tfstate.enc > terraform.tfstate
```

## In-Transit Encryption

Beyond encrypting state at rest, make sure state is encrypted when it travels over the network:

### Always Use HTTPS

```hcl
# HTTP backend - always use HTTPS
terraform {
  backend "http" {
    address = "https://state.example.com/terraform/state"
    # Never use http://
  }
}
```

### Consul TLS

```hcl
terraform {
  backend "consul" {
    scheme = "https"  # Not "http"
  }
}
```

### PostgreSQL SSL

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://user:pass@host/db?sslmode=verify-full"
    # sslmode=verify-full is the most secure
  }
}
```

## Key Rotation

Regularly rotate your encryption keys:

### S3 KMS Key Rotation

```bash
# Enable automatic annual rotation for a KMS key
aws kms enable-key-rotation --key-id alias/terraform-state

# Verify rotation is enabled
aws kms get-key-rotation-status --key-id alias/terraform-state
```

### GCS KMS Key Rotation

```bash
# Create a new key version (manual rotation)
gcloud kms keys versions create \
  --key terraform-state-key \
  --keyring terraform-state \
  --location us-central1 \
  --primary
```

### Azure Key Vault Rotation

```bash
# Create a new key version
az keyvault key rotate --vault-name tf-state-vault --name tf-state-key
```

## Auditing Access

Enable logging to track who accesses your encrypted state:

```bash
# S3 access logging
aws s3api put-bucket-logging --bucket my-terraform-state \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "my-access-logs",
      "TargetPrefix": "terraform-state/"
    }
  }'

# CloudTrail for KMS key usage
aws cloudtrail create-trail \
  --name terraform-state-audit \
  --s3-bucket-name my-audit-logs
```

## Sensitive Output Values

Even with encryption, be careful about outputs:

```hcl
# Mark sensitive outputs to prevent them from showing in CLI output
output "database_password" {
  value     = aws_db_instance.main.password
  sensitive = true
}
```

Note that marking an output as `sensitive` only hides it from the CLI. The actual value is still stored in the state file. Encryption is the real protection.

## Summary

State file encryption is a non-negotiable security requirement. Every major Terraform backend supports encryption - many enable it by default. The key decisions are whether to use provider-managed keys (simpler) or customer-managed keys (more control), and whether you need encryption at rest, in transit, or both (usually both). Start with the easiest option for your backend, then layer on additional controls like key rotation, access auditing, and bucket policies as your security requirements grow. For more on state security, check our guide on [understanding Terraform state file structure](https://oneuptime.com/blog/post/terraform-state-file-structure/view) to know exactly what sensitive data lives in your state.
