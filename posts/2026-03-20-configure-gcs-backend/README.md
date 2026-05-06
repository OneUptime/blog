# How to Configure the GCS Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, GCP, State Management

Description: Learn how to configure the OpenTofu GCS backend to store state files in Google Cloud Storage with versioning, encryption, and state locking.

## Introduction

The GCS (Google Cloud Storage) backend stores OpenTofu state in a GCS bucket. It supports state locking with a separate lock object in the bucket, server-side encryption with Google-managed or customer-managed keys, and bucket versioning for state history. This guide covers the complete setup.

## Step 1: Create the GCS Bucket

```hcl
# bootstrap/main.tf - Run once to create state storage

provider "google" {
  project = "my-project"
  region  = "us-central1"
}

resource "google_storage_bucket" "terraform_state" {
  name          = "my-terraform-state-bucket"  # Must be globally unique
  location      = "US"
  force_destroy = false  # Protect against accidental deletion

  # Enable versioning for state history
  versioning {
    enabled = true
  }

  # Lifecycle rule to manage old versions
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 10  # Keep 10 versions
      with_state         = "ARCHIVED"
    }
  }

  # Uniform bucket-level access (no ACLs)
  uniform_bucket_level_access = true

  # Prevent public access
  public_access_prevention = "enforced"

  # Set soft delete retention to 30 days
  soft_delete_policy {
    retention_duration_seconds = 2592000  # 30 days
  }
}
```

## Step 2: Configure the GCS Backend

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod"  # Optional: organizes state within the bucket

    # Optional: Impersonate a service account
    # impersonate_service_account = "terraform@my-project.iam.gserviceaccount.com"
  }
}
```

## Step 3: Organize State Files

The `prefix` parameter creates a directory-like prefix structure within the bucket:

```text
GCS bucket: my-terraform-state-bucket
├── prod/default.tfstate          ← production, default workspace
├── networking/default.tfstate    ← networking stack
└── shared/
    └── default.tfstate           ← shared infrastructure
```

For workspaces:

```text
GCS bucket:
├── prod/default.tfstate          ← default workspace
├── prod/staging.tfstate          ← staging workspace
└── prod/development.tfstate      ← dev workspace
```

## Step 4: Grant Access

```hcl
# Grant the service account access to the bucket
resource "google_storage_bucket_iam_member" "terraform_state" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"  # Read + Write + Delete
  member = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}

# For read-only access (e.g., for remote state reads)
resource "google_storage_bucket_iam_member" "terraform_state_viewer" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:readonly@my-project.iam.gserviceaccount.com"
}
```

## Authentication Options

### Application Default Credentials

```bash
# For local development
gcloud auth application-default login

# Or set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### Service Account Key (less preferred)

```hcl
terraform {
  backend "gcs" {
    bucket      = "my-terraform-state-bucket"
    prefix      = "prod"
    credentials = "/path/to/service-account.json"
  }
}
```

### Workload Identity (GKE)

When running on GKE with Workload Identity, credentials are automatic - no configuration needed.

## State Locking

OpenTofu supports state locking with the GCS backend. Lock metadata is stored as a separate object in the bucket with a `.tflock` extension.

```bash
# Remove a stuck lock using the lock ID reported by OpenTofu
tofu force-unlock LOCK_ID
```

## Customer-Managed Encryption Keys (CMEK)

```hcl
resource "google_storage_bucket" "terraform_state" {
  name = "my-terraform-state-bucket"

  encryption {
    default_kms_key_name = google_kms_crypto_key.state.id
  }
}

resource "google_kms_crypto_key_iam_member" "gcs_sa" {
  crypto_key_id = google_kms_crypto_key.state.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-PROJECT_NUMBER@gs-project-accounts.iam.gserviceaccount.com"
}
```

## Initializing the Backend

```bash
# Set up authentication
gcloud auth application-default login

# Initialize
tofu init

# Verify state is accessible
tofu state list
```

## Conclusion

The GCS backend provides a reliable, Google-native state storage solution with built-in versioning, CMEK support, and object-based locking. Uniform bucket-level access policies, disabled public access, and versioning should be standard configuration for any production state bucket. The `prefix` parameter provides flexible organization within a single bucket to serve multiple configurations or teams.
