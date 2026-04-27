# How to Configure State Encryption with GCP KMS in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, GCP, Encryption

Description: Learn how to configure OpenTofu state encryption using Google Cloud KMS to protect state files with IAM-controlled envelope encryption.

## Introduction

Google Cloud KMS provides centralized key management with IAM access control for OpenTofu state encryption. Combined with a GCS backend, this gives you client-side encryption with GCP-native key management - the GCS bucket can be compromised without exposing plaintext state.

## Configuration

```hcl
# versions.tf

terraform {
  required_version = ">= 1.7"

  encryption {
    key_provider "gcp_kms" "main" {
      kms_encryption_key = "projects/my-project/locations/us-central1/keyRings/terraform-state/cryptoKeys/state-key"
      key_length         = 32
    }

    method "aes_gcm" "main" {
      keys = key_provider.gcp_kms.main
    }

    state {
      method = method.aes_gcm.main
    }
  }

  backend "gcs" {
    bucket = "my-tofu-state"
    prefix = "production"
  }
}
```

## Creating the KMS Resources

```hcl
# Create the KMS key ring and key
resource "google_kms_key_ring" "tofu_state" {
  name     = "terraform-state"
  location = "us-central1"
}

resource "google_kms_crypto_key" "state_key" {
  name     = "state-key"
  key_ring = google_kms_key_ring.tofu_state.id

  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}
```

## IAM Permissions

```hcl
# Grant the Terraform service account KMS encrypt/decrypt permissions
resource "google_kms_crypto_key_iam_member" "tofu_kms" {
  crypto_key_id = google_kms_crypto_key.state_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}
```

## Authentication

```bash
# Application Default Credentials (local development)
gcloud auth application-default login

# Service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa-key.json"

# Workload Identity (when running on GKE - no credentials file needed)
```

## Multi-Region Key for Redundancy

```hcl
key_provider "gcp_kms" "main" {
  # Use a multi-region key ring
  kms_encryption_key = "projects/my-project/locations/us/keyRings/terraform-state/cryptoKeys/state-key"
  key_length         = 32
}
```

## Encrypting Both State and Plans

```hcl
encryption {
  key_provider "gcp_kms" "main" {
    kms_encryption_key = "projects/my-project/locations/us-central1/keyRings/terraform-state/cryptoKeys/state-key"
    key_length         = 32
  }

  method "aes_gcm" "main" {
    keys = key_provider.gcp_kms.main
  }

  state {
    method = method.aes_gcm.main
  }

  plan {
    method = method.aes_gcm.main
  }
}
```

## CI/CD Configuration

```yaml
# Cloud Build configuration
steps:
  - name: 'hashicorp/opentofu'
    entrypoint: tofu
    args: ['plan']
    env:
      # Service account with KMS permissions is attached to the Cloud Build worker pool
      # No explicit credential configuration needed with Workload Identity
```

## Conclusion

GCP KMS state encryption integrates naturally with GCP-native deployments. Use Workload Identity for keyless authentication in GKE and Cloud Build, enable automatic key rotation, and restrict KMS access to only the service accounts that need to run OpenTofu. This ensures state data is protected even if the GCS bucket access controls are bypassed.
