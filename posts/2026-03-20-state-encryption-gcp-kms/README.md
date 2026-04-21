# How to Configure State Encryption with GCP KMS in OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, GCP, Encryption

Description: Learn how to configure OpenTofu state file encryption using Google Cloud KMS for centralized key management and audit logging on GCP.

## Introduction

Google Cloud Key Management Service (Cloud KMS) provides a fully managed encryption key service for OpenTofu state encryption. It integrates with Google Cloud's IAM for access control and Cloud Audit Logs for comprehensive monitoring. This guide covers the complete setup.

## Step 1: Create a KMS Key Ring and Key

```hcl
# kms.tf

resource "google_kms_key_ring" "terraform_state" {
  name     = "terraform-state-keyring"
  location = "global"  # Or a specific region
}

resource "google_kms_crypto_key" "terraform_state" {
  name            = "terraform-state-key"
  key_ring        = google_kms_key_ring.terraform_state.id

  # Automatic key rotation every 90 days
  rotation_period = "7776000s"  # 90 days in seconds

  lifecycle {
    prevent_destroy = true  # Protect against accidental deletion
  }
}

# Grant the service account permission to use the key
resource "google_kms_crypto_key_iam_member" "terraform_sa" {
  crypto_key_id = google_kms_crypto_key.terraform_state.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}
```

## Step 2: Configure the GCP KMS Key Provider

```hcl
# encryption.tf
terraform {
  required_version = ">= 1.7.0"

  encryption {
    key_provider "gcp_kms" "state_key" {
      # Full resource name of the KMS crypto key
      kms_encryption_key = "projects/my-project/locations/global/keyRings/terraform-state-keyring/cryptoKeys/terraform-state-key"
      key_length         = 32

      # Optional: specify credentials file path
      # credentials = "/path/to/service-account.json"
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.gcp_kms.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }

    plan {
      method = method.aes_gcm.state_method
    }
  }
}
```

For an existing unencrypted state file, add an `unencrypted` fallback during the first migration so OpenTofu can read and rewrite the current state.

## Step 3: Configure GCP Authentication

```bash
# Application Default Credentials (recommended for local development)
gcloud auth application-default login

# Service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Service account impersonation (for local ADC testing)
gcloud auth application-default login \
  --impersonate-service-account=terraform@my-project.iam.gserviceaccount.com

# In CI/CD, prefer Workload Identity Federation or an attached service account.
```

## Step 4: Required IAM Permissions

The service account needs these permissions on the KMS key:

```hcl
# Grant encrypt/decrypt permission
resource "google_kms_crypto_key_iam_member" "terraform" {
  for_each = toset([
    "serviceAccount:terraform-ci@my-project.iam.gserviceaccount.com",
    "serviceAccount:terraform-admin@my-project.iam.gserviceaccount.com"
  ])

  crypto_key_id = google_kms_crypto_key.terraform_state.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = each.value
}
```

Required roles:
- `roles/cloudkms.cryptoKeyEncrypterDecrypter` - to encrypt and decrypt data
- `roles/cloudkms.viewer` - to view key metadata (optional but useful)

## Step 5: Using with GCS Backend

Combine KMS encryption with the GCS backend for full protection:

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "prod"

    # GCS-side encryption with CMEK. Use a key in the same location as the bucket.
    kms_encryption_key = "projects/my-project/locations/us/keyRings/gcs-keyring/cryptoKeys/gcs-key"
  }

  encryption {
    # OpenTofu client-side encryption with a separate key
    key_provider "gcp_kms" "state_key" {
      kms_encryption_key = "projects/my-project/locations/global/keyRings/terraform-state-keyring/cryptoKeys/terraform-state-key"
      key_length         = 32
    }

    method "aes_gcm" "state_method" {
      keys = key_provider.gcp_kms.state_key
    }

    state {
      method = method.aes_gcm.state_method
    }
  }
}
```

## Step 6: Verify Encryption with Cloud Audit Logs

Make sure Data Access audit logs are enabled for Cloud KMS encrypt and decrypt operations.

```bash
# View KMS usage in Cloud Audit Logs
gcloud logging read \
  'protoPayload.serviceName="cloudkms.googleapis.com" AND (protoPayload.methodName="Encrypt" OR protoPayload.methodName="Decrypt")' \
  --project=my-project \
  --freshness=1d \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.methodName)"
```

## Key Rotation

GCP KMS handles automatic key rotation. You can also manually rotate:

```bash
# Create a new key version
gcloud kms keys versions create \
  --key=terraform-state-key \
  --keyring=terraform-state-keyring \
  --location=global \
  --primary  # Make this the new primary version
```

OpenTofu will use the new primary version for encryption automatically on the next apply.

## Conclusion

GCP KMS integration for OpenTofu state encryption combines the simplicity of managed encryption keys with GCP's robust IAM and audit logging infrastructure. Automatic key rotation, centralized key policies, and detailed audit logs via Cloud Audit Logs make this the recommended approach for GCP-based production workloads. Pair it with CMEK on GCS for defense-in-depth protection.
