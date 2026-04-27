# How to Configure S3 Backend with Customer-Provided Encryption Keys in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, AWS, Security

Description: Learn how to configure the OpenTofu S3 backend with customer-provided encryption keys (SSE-C) for full control over state file encryption.

## Introduction

Customer-Provided Encryption Keys (SSE-C) for S3 allow you to provide the encryption key on each request rather than storing it in AWS. S3 encrypts and decrypts using your key but never persists the key itself. This provides maximum key control - AWS never has access to your encryption key.

## How SSE-C Works

```text
You provide key → S3 encrypts data → S3 discards key
You provide key → S3 decrypts data → S3 discards key
```

AWS stores only the MD5 checksum of your key for verification. If you lose the key, the data is permanently unrecoverable.

## S3 Backend SSE-C Configuration

```hcl
terraform {
  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"

    # Customer-provided encryption key (base64-encoded 256-bit key)
    # The algorithm is implicitly AES256 when sse_customer_key is set.
    sse_customer_key = var.state_encryption_key
  }
}
```

## Generating a Customer Key

```bash
# Generate a random 256-bit key

openssl rand -base64 32

# Output: base64-encoded 32-byte key
# Store this securely - loss means permanent data loss!

# Example: store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name "tofu-state-sse-key" \
  --secret-string "$(openssl rand -base64 32)"
```

## Variable Declaration

```hcl
# variables.tf
variable "state_encryption_key" {
  type        = string
  sensitive   = true
  description = "Base64-encoded AES-256 key for S3 SSE-C state encryption"
}
```

## CI/CD Configuration

```bash
# Retrieve the key from secrets manager in CI/CD
SSE_KEY=$(aws secretsmanager get-secret-value \
  --secret-id tofu-state-sse-key \
  --query SecretString \
  --output text)

export TF_VAR_state_encryption_key="$SSE_KEY"
tofu init
tofu plan
```

## Partial Backend Configuration

Keep the key out of version-controlled configuration files:

```hcl
# backend.tf - committed to source control (no key here)
terraform {
  backend "s3" {
    bucket = "my-tofu-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}
```

```bash
# Provide the SSE-C key at init time
tofu init \
  -backend-config="sse_customer_key=$(cat /secure/state-key.b64)"
```

## Key Rotation with SSE-C

SSE-C does not support automatic key rotation. To rotate manually:

```bash
# Step 1: Pull state with old key
export TF_VAR_state_encryption_key="$OLD_KEY"
tofu state pull > state-backup.json

# Step 2: Re-configure with new key
export TF_VAR_state_encryption_key="$NEW_KEY"

# Step 3: Push state (S3 re-encrypts with new key)
tofu state push state-backup.json
```

## SSE-C vs Other Encryption Options

| Option | Key Storage | Key Rotation | Complexity |
|---|---|---|---|
| SSE-S3 (`encrypt=true`) | AWS-managed | Automatic | Low |
| SSE-KMS (`kms_key_id`) | AWS KMS | Configurable | Medium |
| SSE-C | You manage | Manual | High |
| Native state encryption | You manage | Manual (fallback) | Medium |

## Important Warnings

- If you lose the SSE-C key, state data is **permanently unrecoverable**
- Store the key in a separate, highly-available secrets manager
- Test key retrieval and state access before relying on this in production
- Create redundant copies of the key in separate secure locations

## Conclusion

SSE-C provides maximum key control for the most security-conscious environments. AWS never stores your encryption key, ensuring complete key sovereignty. The trade-off is operational complexity - you must manage key storage, distribution, and rotation manually. Use SSE-KMS unless you have specific compliance requirements mandating customer key control.
