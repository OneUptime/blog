# How to Configure GCS Buckets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCS, Google Cloud Storage, GCP, Infrastructure as Code, Storage

Description: Learn how to configure Google Cloud Storage buckets with OpenTofu - setting storage classes, retention policies, lifecycle rules, uniform bucket-level access, and VPC Service Controls.

## Introduction

Google Cloud Storage (GCS) stores objects in buckets with configurable storage classes, lifecycle rules, and access controls. OpenTofu manages bucket creation, IAM bindings, lifecycle policies, retention policies, and encryption - all as declarative configuration that integrates with GCP's resource hierarchy.

## Standard Bucket Configuration

```hcl
resource "google_storage_bucket" "app" {
  name          = "${var.project_id}-app-${var.environment}"
  location      = var.region
  storage_class = "STANDARD"

  # Security
  uniform_bucket_level_access = true  # Disables per-object ACLs
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}
```

## Lifecycle Rules

```hcl
resource "google_storage_bucket" "data" {
  name          = "${var.project_id}-data-${var.environment}"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 30  # Days since object creation
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  lifecycle_rule {
    condition {
      age = 2557  # 7 years
    }
    action {
      type = "Delete"
    }
  }

  # Clean up noncurrent versions
  lifecycle_rule {
    condition {
      num_newer_versions = 5
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }
}
```

## Retention Policy (Compliance)

```hcl
resource "google_storage_bucket" "compliance" {
  name          = "${var.project_id}-compliance-${var.environment}"
  location      = var.region
  storage_class = "COLDLINE"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  retention_policy {
    is_locked        = true   # Lock prevents the retention period from being reduced or removed
    retention_period = 220903200  # 7 years in seconds
  }
}
```

## Dual-Region Bucket for Availability

```hcl
resource "google_storage_bucket" "dual_region" {
  name          = "${var.project_id}-ha-${var.environment}"
  location      = "US"  # Location code for a configurable dual-region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # Configurable dual-region placement for higher availability
  custom_placement_config {
    data_locations = ["US-EAST1", "US-WEST1"]
  }
}
```

## IAM Bindings

```hcl
# Grant service account read access to a specific bucket

resource "google_storage_bucket_iam_member" "app_reader" {
  bucket = google_storage_bucket.app.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.app.email}"
}

# Grant write access for uploads
resource "google_storage_bucket_iam_member" "app_writer" {
  bucket = google_storage_bucket.app.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.app.email}"
}

# Grant admin access for backup service
resource "google_storage_bucket_iam_member" "backup_admin" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.admin"
  member = "serviceAccount:${google_service_account.backup.email}"
}
```

## Customer-Managed Encryption Key (CMEK)

```hcl
data "google_storage_project_service_account" "gcs_kms" {}

resource "google_kms_key_ring" "storage" {
  name     = "${var.environment}-storage-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "storage" {
  name     = "${var.environment}-storage-key"
  key_ring = google_kms_key_ring.storage.id

  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "encrypted" {
  name          = "${var.project_id}-encrypted-${var.environment}"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage.id
  }

  depends_on = [google_kms_crypto_key_iam_member.storage_kms]
}

# Grant GCS service account permission to use the KMS key
resource "google_kms_crypto_key_iam_member" "storage_kms" {
  crypto_key_id = google_kms_crypto_key.storage.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_kms.email_address}"
}
```

## Bucket Notification to Pub/Sub

```hcl
data "google_storage_project_service_account" "gcs_notifications" {}

resource "google_pubsub_topic" "storage_events" {
  name = "${var.environment}-storage-events"
}

resource "google_storage_notification" "uploads" {
  bucket         = google_storage_bucket.app.name
  payload_format = "JSON_API_V1"
  topic          = google_pubsub_topic.storage_events.id
  event_types    = ["OBJECT_FINALIZE", "OBJECT_DELETE"]

  custom_attributes = {
    environment = var.environment
  }

  depends_on = [google_pubsub_topic_iam_member.storage_publisher]
}

resource "google_pubsub_topic_iam_member" "storage_publisher" {
  topic  = google_pubsub_topic.storage_events.id
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_storage_project_service_account.gcs_notifications.email_address}"
}
```

## Conclusion

GCS buckets with OpenTofu generally should use `uniform_bucket_level_access = true` for production buckets - it disables per-object ACLs and simplifies IAM management. Use `public_access_prevention = "enforced"` to block public access through IAM policies or ACLs. Combine lifecycle rules to automatically transition objects from STANDARD to NEARLINE to COLDLINE to ARCHIVE as access patterns cool. For compliance data, set `is_locked = true` on the retention policy to prevent it from being removed or reduced, even by project owners.
