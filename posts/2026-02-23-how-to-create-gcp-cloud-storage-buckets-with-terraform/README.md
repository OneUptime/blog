# How to Create GCP Cloud Storage Buckets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Storage, Bucket, Infrastructure as Code, Object Storage

Description: Learn how to create and configure GCP Cloud Storage buckets with Terraform, including storage classes, access control, versioning, encryption, and CORS settings.

---

Cloud Storage is Google Cloud's object storage service. It is where you store everything from application assets and backups to data lake files and static website content. Buckets are the top-level containers in Cloud Storage, and getting their configuration right from the start saves you headaches down the road.

In this post, we will create Cloud Storage buckets with Terraform, covering storage classes, access controls, versioning, encryption, retention policies, and more.

## Provider Setup

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}
```

## Basic Cloud Storage Bucket

The simplest bucket configuration:

```hcl
# Basic Cloud Storage bucket
resource "google_storage_bucket" "basic" {
  name     = "${var.project_id}-basic-bucket"
  location = "US"

  # Prevent Terraform from destroying this bucket if it contains objects
  force_destroy = false

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Storage class for frequently accessed data
  storage_class = "STANDARD"
}
```

Bucket names must be globally unique across all of Google Cloud. A common pattern is to prefix them with your project ID. The `location` can be a multi-region (US, EU, ASIA), dual-region, or single region (us-central1, europe-west1, etc.).

## Production-Ready Bucket

Here is a bucket with all the settings you would want in production:

```hcl
# Production bucket with versioning, encryption, and access controls
resource "google_storage_bucket" "production" {
  name          = "${var.project_id}-production-data"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false

  # Enable uniform bucket-level access
  # This disables ACLs and uses IAM exclusively
  uniform_bucket_level_access = true

  # Enable object versioning to protect against accidental deletes
  versioning {
    enabled = true
  }

  # Encryption with a customer-managed key
  # encryption {
  #   default_kms_key_name = google_kms_crypto_key.bucket_key.id
  # }

  # Soft delete policy - retain deleted objects for 7 days
  soft_delete_policy {
    retention_duration_seconds = 604800  # 7 days
  }

  # Labels for cost tracking and organization
  labels = {
    environment = "production"
    team        = "platform"
    managed_by  = "terraform"
  }

  # Public access prevention
  public_access_prevention = "enforced"
}
```

The `public_access_prevention = "enforced"` setting prevents anyone from accidentally making objects in this bucket public. This is a must-have for buckets containing sensitive data.

## Bucket with Lifecycle Rules

Lifecycle rules automatically manage objects based on their age, storage class, or other conditions:

```hcl
# Bucket with lifecycle management
resource "google_storage_bucket" "managed" {
  name          = "${var.project_id}-managed-lifecycle"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  # Move objects to Nearline after 30 days
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  # Move objects to Coldline after 90 days
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Move objects to Archive after 365 days
  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # Delete non-current versions after 30 days
  lifecycle_rule {
    condition {
      num_newer_versions = 3
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Delete objects older than 2 years
  lifecycle_rule {
    condition {
      age = 730
    }
    action {
      type = "Delete"
    }
  }
}
```

For a more detailed look at lifecycle rules, check out our dedicated post on [configuring storage bucket lifecycle rules](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-gcp-storage-bucket-lifecycle-rules-in-terraform/view).

## Static Website Hosting Bucket

Cloud Storage can serve static websites directly:

```hcl
# Bucket for static website hosting
resource "google_storage_bucket" "website" {
  name          = "${var.project_id}-website"
  location      = "US"
  storage_class = "STANDARD"

  # Required for website hosting
  uniform_bucket_level_access = true

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  # CORS configuration for web assets
  cors {
    origin          = ["https://example.com"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type", "Cache-Control"]
    max_age_seconds = 3600
  }
}

# Make the bucket publicly readable for website hosting
resource "google_storage_bucket_iam_member" "website_public" {
  bucket = google_storage_bucket.website.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
```

## Bucket with Retention Policy

Retention policies prevent objects from being deleted or overwritten for a specified period. This is important for compliance:

```hcl
# Compliance bucket with retention policy
resource "google_storage_bucket" "compliance" {
  name          = "${var.project_id}-compliance-logs"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # Retention policy - objects cannot be deleted for 7 years
  retention_policy {
    is_locked        = false  # Set to true to make it permanent (irreversible!)
    retention_period = 220752000  # 7 years in seconds
  }

  # No versioning needed with retention - objects cannot be overwritten
  versioning {
    enabled = false
  }

  public_access_prevention = "enforced"
}
```

Warning: once you lock a retention policy (`is_locked = true`), it cannot be removed or shortened. The bucket cannot be deleted until every object has satisfied the retention period. Be very careful with this setting.

## Multi-Region Bucket with Turbo Replication

For critical data that needs fast cross-region replication:

```hcl
# Dual-region bucket with turbo replication
resource "google_storage_bucket" "dual_region" {
  name          = "${var.project_id}-dual-region"
  location      = "US"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # Custom placement for dual-region
  custom_placement_config {
    data_locations = ["US-CENTRAL1", "US-EAST1"]
  }

  # Enable turbo replication for faster RPO
  rpo = "ASYNC_TURBO"

  versioning {
    enabled = true
  }
}
```

Turbo replication guarantees a Recovery Point Objective (RPO) of 15 minutes, compared to the default 12-hour RPO. It costs more, so use it only for data where fast replication is worth the premium.

## IAM Access Control

Control who can access your buckets and what they can do:

```hcl
# Service account for application access
resource "google_service_account" "app" {
  account_id   = "app-storage-sa"
  display_name = "Application Storage Service Account"
}

# Grant read-only access to the production bucket
resource "google_storage_bucket_iam_member" "app_reader" {
  bucket = google_storage_bucket.production.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.app.email}"
}

# Grant write access to a specific prefix using IAM conditions
resource "google_storage_bucket_iam_member" "app_writer" {
  bucket = google_storage_bucket.production.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.app.email}"

  condition {
    title      = "uploads-only"
    expression = "resource.name.startsWith('projects/_/buckets/${google_storage_bucket.production.name}/objects/uploads/')"
  }
}

# Grant admin access to the DevOps team
resource "google_storage_bucket_iam_member" "devops_admin" {
  bucket = google_storage_bucket.production.name
  role   = "roles/storage.admin"
  member = "group:devops@example.com"
}
```

IAM conditions let you scope permissions to specific object prefixes (paths). This is a powerful way to give different teams or services access to different parts of a bucket without creating separate buckets.

## Bucket with Customer-Managed Encryption Key

For extra control over encryption:

```hcl
# KMS key ring and key for bucket encryption
resource "google_kms_key_ring" "storage" {
  name     = "storage-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "bucket_key" {
  name     = "bucket-encryption-key"
  key_ring = google_kms_key_ring.storage.id

  # Rotate the key every 90 days
  rotation_period = "7776000s"
}

# Grant the Cloud Storage service agent access to the key
data "google_storage_project_service_account" "gcs" {
}

resource "google_kms_crypto_key_iam_member" "gcs_key_access" {
  crypto_key_id = google_kms_crypto_key.bucket_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs.email_address}"
}

# Bucket with CMEK encryption
resource "google_storage_bucket" "encrypted" {
  name          = "${var.project_id}-encrypted-data"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.bucket_key.id
  }

  depends_on = [google_kms_crypto_key_iam_member.gcs_key_access]
}
```

## Outputs

```hcl
output "production_bucket_name" {
  value = google_storage_bucket.production.name
}

output "production_bucket_url" {
  value = google_storage_bucket.production.url
}

output "website_bucket_url" {
  value = "https://storage.googleapis.com/${google_storage_bucket.website.name}/index.html"
}

output "storage_service_account" {
  value = google_service_account.app.email
}
```

## Best Practices

**Always enable uniform bucket-level access.** ACLs are legacy and hard to audit. IAM-only access is simpler and more secure.

**Use `public_access_prevention = "enforced"` by default.** Only remove it for buckets that genuinely need public access, like static websites.

**Enable versioning for important data.** It protects against accidental deletes and overwrites. Combine it with lifecycle rules to clean up old versions.

**Choose the right storage class.** STANDARD for frequently accessed data, NEARLINE for monthly access, COLDLINE for quarterly access, ARCHIVE for yearly access. Use lifecycle rules to transition automatically.

**Use CMEK for sensitive data.** Customer-managed encryption keys give you control over key rotation and the ability to revoke access to your data.

## Conclusion

Cloud Storage buckets are straightforward to create but have a surprising number of configuration options. Getting the basics right - uniform access, public access prevention, versioning, and lifecycle rules - puts you in a strong position from day one. Terraform makes it easy to standardize these settings across all your buckets and ensures nothing gets misconfigured through manual clicks in the console.

For more on managing object lifecycles, see our detailed post on [configuring storage bucket lifecycle rules](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-gcp-storage-bucket-lifecycle-rules-in-terraform/view).
