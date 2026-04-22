# How to Configure S3 Backend with Customer-Provided Encryption Keys in Open (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS, Security, Encryption

Description: Learn how to configure the OpenTofu S3 backend with customer-provided encryption keys (SSE-C) for full control over the encryption keys used to protect your state files.

## Introduction

SSE-C (Server-Side Encryption with Customer-Provided Keys) gives you complete control over the encryption keys used to protect your S3 objects. Unlike SSE-S3 or SSE-KMS, with SSE-C you manage the keys entirely - AWS handles the encryption and decryption but never stores your keys. This guide covers configuring SSE-C for the OpenTofu S3 backend.

As of April 2026, AWS is disabling SSE-C by default for new S3 general purpose buckets and for existing accounts without SSE-C encrypted data, so make sure SSE-C is not blocked for the state bucket before using this configuration.

## How SSE-C Works

With SSE-C:
1. You provide the encryption key in every S3 request
2. AWS uses your key to encrypt/decrypt the object
3. AWS does NOT store the key - it's used only during the request
4. If you lose the key, the data is permanently inaccessible

## Step 1: Generate an Encryption Key

OpenTofu's S3 backend expects a 256-bit (32-byte) AES key, base64-encoded:

```bash
# Generate a random 32-byte key and base64-encode it

openssl rand -base64 32

# Example output: mUbp9NXK8GNKvSvOCiSSWnBFN+pHAqBIJXnWkPMcuiI=

# Store this key securely in your secrets manager
aws secretsmanager create-secret \
  --name "terraform-state-ssec-key" \
  --secret-string "mUbp9NXK8GNKvSvOCiSSWnBFN+pHAqBIJXnWkPMcuiI="
```

**Critical**: Store this key in a secure location (AWS Secrets Manager, HashiCorp Vault). If lost, all encrypted state is permanently inaccessible.

## Step 2: Configure the S3 Backend with SSE-C

Set `AWS_SSE_CUSTOMER_KEY` before running `tofu init`; the S3 backend reads `sse_customer_key` from that environment variable.

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "prod/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true

    # Customer-provided encryption key is read from AWS_SSE_CUSTOMER_KEY.
    # Avoid putting sse_customer_key directly in this file because backend
    # configuration is persisted locally in plain text.
  }
}
```

## Step 3: Manage the Key Environment Variable

```bash
# Retrieve the key from Secrets Manager for the OpenTofu S3 backend
export AWS_SSE_CUSTOMER_KEY=$(aws secretsmanager get-secret-value \
  --secret-id "terraform-state-ssec-key" \
  --query 'SecretString' \
  --output text)

# Or set directly (less secure)
export AWS_SSE_CUSTOMER_KEY="mUbp9NXK8GNKvSvOCiSSWnBFN+pHAqBIJXnWkPMcuiI="
```

## Step 4: Initialize and Apply

```bash
tofu init

# Verify state is accessible with the key
tofu state list

# Apply - state written with SSE-C
tofu apply
```

## Key Rotation for SSE-C

SSE-C key rotation requires re-uploading all objects with the new key. If bucket versioning is enabled, each object version can have its own SSE-C key, so rotate the versions you still need or retain the old keys for those versions.

```bash
# Step 1: Load the old key and generate a new key
OLD_KEY=$(aws secretsmanager get-secret-value \
  --secret-id "terraform-state-ssec-key" \
  --query 'SecretString' \
  --output text)
NEW_KEY=$(openssl rand -base64 32)

# The AWS CLI s3 cp SSE-C flags expect raw key bytes, not base64 text
OLD_KEY_FILE=$(mktemp)
NEW_KEY_FILE=$(mktemp)
printf '%s' "$OLD_KEY" | base64 --decode > "$OLD_KEY_FILE"
printf '%s' "$NEW_KEY" | base64 --decode > "$NEW_KEY_FILE"

# Step 2: List all state files
aws s3 ls s3://my-terraform-state/ --recursive | grep terraform.tfstate

# Step 3: Copy each object with new key (AWS performs the key swap)
aws s3 cp \
  s3://my-terraform-state/prod/terraform.tfstate \
  s3://my-terraform-state/prod/terraform.tfstate \
  --sse-c AES256 \
  --sse-c-key fileb://"$NEW_KEY_FILE" \
  --sse-c-copy-source AES256 \
  --sse-c-copy-source-key fileb://"$OLD_KEY_FILE"

# Step 4: Update your secrets manager with the new key
aws secretsmanager update-secret \
  --secret-id "terraform-state-ssec-key" \
  --secret-string "$NEW_KEY"

# Step 5: Use the new key for subsequent OpenTofu commands
export AWS_SSE_CUSTOMER_KEY="$NEW_KEY"
rm -f "$OLD_KEY_FILE" "$NEW_KEY_FILE"
```

## Comparison with Other Encryption Options

| Feature | SSE-S3 | SSE-KMS | SSE-C |
|---------|--------|---------|-------|
| Key management | AWS | AWS KMS | You |
| CloudTrail key usage audit | No KMS key-use audit | KMS key-use events in CloudTrail | S3 data events only |
| Key rotation | Automatic | Configurable | Manual |
| Cost | Free | KMS charges | Free |
| Key loss risk | None | None | Total data loss |

## When to Use SSE-C

Use SSE-C when:
- Compliance requires keys never stored in AWS
- You need complete key custody
- Your organization has key management infrastructure outside AWS

Avoid SSE-C when:
- You don't have robust key management processes
- Multiple team members need to access state
- Automated key rotation is needed (complex with SSE-C)

## Conclusion

SSE-C for the S3 backend provides maximum control over your encryption keys - but also maximum responsibility. The key is never stored by AWS, giving you full custody, but also full risk. Only use SSE-C when your compliance requirements mandate it and when you have robust key management processes in place. For most production environments, SSE-KMS provides the right balance of control, auditability, and operational safety.
