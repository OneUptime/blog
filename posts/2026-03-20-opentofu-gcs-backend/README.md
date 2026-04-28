# How to Configure the GCS Backend in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, GCP

Description: Learn how to configure the Google Cloud Storage (GCS) backend in OpenTofu to store state files with built-in locking and encryption.

## Introduction

The GCS backend stores OpenTofu state in Google Cloud Storage. It provides built-in state locking using a lock object in the bucket and automatic encryption using Google-managed or customer-managed keys. This is the standard remote backend for GCP-based infrastructure.

## Prerequisites

- Google Cloud project
- GCS bucket for state storage
- Authenticated GCP credentials

## Basic Configuration

```hcl
terraform {
  backend "gcs" {
    bucket = "my-tofu-state"
    prefix = "production"
  }
}
```

State is stored at: `gs://my-tofu-state/production/default.tfstate`

## Creating the GCS Bucket

```hcl
resource "google_storage_bucket" "tofu_state" {
  name          = "acme-corp-tofu-state"
  location      = "US"
  force_destroy = false

  versioning {
    enabled = true  # Keep state history
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 10
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access = true
}
```

## Authentication

```bash
# Application Default Credentials (local development)

gcloud auth application-default login

# Service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa-key.json"

# Workload Identity (GKE - no credentials needed)
```

## Multiple Environments

```hcl
# production/backend.tf
terraform {
  backend "gcs" {
    bucket = "acme-tofu-state"
    prefix = "production/infrastructure"
  }
}

# staging/backend.tf
terraform {
  backend "gcs" {
    bucket = "acme-tofu-state"
    prefix = "staging/infrastructure"
  }
}
```

State files:
```text
gs://acme-tofu-state/
├── production/infrastructure/default.tfstate
└── staging/infrastructure/default.tfstate
```

## Customer-Managed Encryption

```hcl
terraform {
  backend "gcs" {
    bucket             = "acme-tofu-state"
    prefix             = "production"
    kms_encryption_key = "projects/my-project/locations/us/keyRings/tofu-state/cryptoKeys/state-key"
  }
}
```

## IAM Permissions

```bash
# Grant state bucket access to the service account
gcloud storage buckets add-iam-policy-binding gs://acme-tofu-state \
  --member="serviceAccount:tofu@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

For read-only access (e.g., using `terraform_remote_state`):

```bash
gcloud storage buckets add-iam-policy-binding gs://acme-tofu-state \
  --member="serviceAccount:app@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

## Workspaces with GCS

```hcl
terraform {
  backend "gcs" {
    bucket = "acme-tofu-state"
    prefix = "app"
  }
}
```

With workspaces:
```text
gs://acme-tofu-state/
├── app/default.tfstate          (default workspace)
├── app/staging.tfstate          (staging workspace)
└── app/dev.tfstate              (dev workspace)
```

## Cloud Build Integration

```yaml
# cloudbuild.yaml
steps:
  - name: 'ghcr.io/opentofu/opentofu'
    args: ['init']
    # Cloud Build service account with GCS and KMS permissions

  - name: 'ghcr.io/opentofu/opentofu'
    args: ['apply', '-auto-approve']
```

## Conclusion

The GCS backend provides a reliable, encrypted state store with built-in versioning for GCP deployments. Create a dedicated bucket with versioning enabled, grant minimal IAM permissions, and use Workload Identity for keyless authentication in GKE and Cloud Build. The `prefix` parameter organizes multiple configurations within one bucket.
