# How to Configure GCP Storage Bucket Lifecycle Rules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Storage, Lifecycle Rules, Cost Optimization, Infrastructure as Code

Description: A detailed guide to configuring GCP Cloud Storage bucket lifecycle rules with Terraform, covering storage class transitions, automatic deletion, versioning cleanup, and cost optimization strategies.

---

Cloud Storage lifecycle rules are one of the most effective ways to manage storage costs in Google Cloud. They automatically transition objects between storage classes as they age, delete old versions, and clean up incomplete uploads. Without lifecycle rules, storage costs tend to grow indefinitely because nobody remembers to clean up old data.

In this guide, we will cover every type of lifecycle rule you can configure with Terraform and show practical patterns for common use cases.

## Storage Class Overview

Before diving into lifecycle rules, it helps to understand the storage classes and their pricing model:

- **STANDARD** - For frequently accessed data. No minimum storage duration, no retrieval fee.
- **NEARLINE** - For data accessed less than once a month. 30-day minimum storage, small retrieval fee.
- **COLDLINE** - For data accessed less than once a quarter. 90-day minimum storage, moderate retrieval fee.
- **ARCHIVE** - For data accessed less than once a year. 365-day minimum storage, higher retrieval fee.

Lifecycle rules let you move objects down this chain as they age, automatically reducing your storage costs.

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

## Basic Lifecycle - Age-Based Storage Class Transition

The most common pattern is transitioning objects to cheaper storage classes as they age:

```hcl
# Bucket with tiered storage transitions
resource "google_storage_bucket" "tiered" {
  name          = "${var.project_id}-tiered-storage"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # After 30 days, move to Nearline
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  # After 90 days, move to Coldline
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # After 365 days, move to Archive
  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }
}
```

The `age` condition is in days and starts from when the object was created (or last modified, depending on the condition type). Objects are evaluated once a day, so transitions happen within 24 hours of meeting the condition.

## Lifecycle with Automatic Deletion

For temporary data like logs or build artifacts, you want objects deleted after a certain period:

```hcl
# Bucket for temporary data with automatic cleanup
resource "google_storage_bucket" "temp_data" {
  name          = "${var.project_id}-temp-data"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  force_destroy               = true  # Allow Terraform to delete non-empty bucket

  # Delete objects after 7 days
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  # Also clean up incomplete multipart uploads after 1 day
  lifecycle_rule {
    condition {
      age = 1
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }
}
```

The `AbortIncompleteMultipartUpload` action is often overlooked. Failed multipart uploads leave behind partial data that counts toward your storage bill. Cleaning these up regularly is free cost savings.

## Version Cleanup Rules

When versioning is enabled, old object versions accumulate. Lifecycle rules can manage this:

```hcl
# Bucket with versioning and version cleanup
resource "google_storage_bucket" "versioned" {
  name          = "${var.project_id}-versioned-data"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  # Keep only the 5 most recent versions of each object
  lifecycle_rule {
    condition {
      num_newer_versions = 5
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Delete non-current versions older than 90 days
  lifecycle_rule {
    condition {
      age        = 90
      with_state = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Move non-current versions to Coldline after 30 days
  lifecycle_rule {
    condition {
      age        = 30
      with_state = "ARCHIVED"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
}
```

The `with_state` condition is important here. `ARCHIVED` means non-current versions (previous versions of overwritten or deleted objects). `LIVE` means the current version. If you omit `with_state`, the rule applies to all versions.

The `num_newer_versions` condition means "delete this version if there are N newer versions of the same object." Setting it to 5 keeps the 5 most recent versions and deletes anything older.

## Conditional Rules with Prefix Matching

Different types of data in the same bucket might need different lifecycle policies:

```hcl
# Bucket with prefix-based lifecycle rules
resource "google_storage_bucket" "mixed" {
  name          = "${var.project_id}-mixed-data"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # Logs directory - delete after 30 days
  lifecycle_rule {
    condition {
      age                   = 30
      matches_prefix        = ["logs/"]
    }
    action {
      type = "Delete"
    }
  }

  # Temp directory - delete after 3 days
  lifecycle_rule {
    condition {
      age                   = 3
      matches_prefix        = ["tmp/", "temp/"]
    }
    action {
      type = "Delete"
    }
  }

  # Backups - transition to Archive after 90 days
  lifecycle_rule {
    condition {
      age                   = 90
      matches_prefix        = ["backups/"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # Reports - transition to Nearline after 7 days
  lifecycle_rule {
    condition {
      age                   = 7
      matches_prefix        = ["reports/"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}
```

The `matches_prefix` condition lets you apply rules to specific "directories" (prefixes) within a bucket. You can also use `matches_suffix` to match file extensions.

## Rules Based on Creation Date

Sometimes you want rules based on a specific date rather than object age:

```hcl
# Bucket with date-based lifecycle rules
resource "google_storage_bucket" "date_based" {
  name          = "${var.project_id}-date-based"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # Delete objects created before a specific date
  lifecycle_rule {
    condition {
      created_before = "2025-01-01"
    }
    action {
      type = "Delete"
    }
  }

  # Move objects created before a date to Archive
  lifecycle_rule {
    condition {
      created_before = "2025-06-01"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }
}
```

This is useful for one-time migrations or cleanup of legacy data.

## Rules Based on Custom Time

Cloud Storage supports a custom time metadata field that you can set on objects. Lifecycle rules can use this for business-logic-based lifecycle management:

```hcl
# Bucket with custom time-based lifecycle
resource "google_storage_bucket" "custom_time" {
  name          = "${var.project_id}-custom-time"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  # Delete objects 30 days after their custom time
  lifecycle_rule {
    condition {
      days_since_custom_time = 30
    }
    action {
      type = "Delete"
    }
  }

  # Move to Archive 90 days after custom time
  lifecycle_rule {
    condition {
      days_since_custom_time = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }
}
```

You set the custom time when uploading an object. For example, you might set it to when a document expires or when a report period ends. This decouples the lifecycle from the upload date.

## Comprehensive Production Example

Here is a real-world bucket that combines multiple lifecycle strategies:

```hcl
# Production data bucket with comprehensive lifecycle management
resource "google_storage_bucket" "production" {
  name          = "${var.project_id}-production-data"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  # --- Current version transitions ---

  # Move current objects to Nearline after 60 days
  lifecycle_rule {
    condition {
      age        = 60
      with_state = "LIVE"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  # Move current objects to Coldline after 180 days
  lifecycle_rule {
    condition {
      age        = 180
      with_state = "LIVE"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Move current objects to Archive after 365 days
  lifecycle_rule {
    condition {
      age        = 365
      with_state = "LIVE"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  # --- Non-current version management ---

  # Move old versions to Coldline after 7 days
  lifecycle_rule {
    condition {
      age        = 7
      with_state = "ARCHIVED"
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  # Delete old versions after 90 days
  lifecycle_rule {
    condition {
      age        = 90
      with_state = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # Keep at most 3 non-current versions
  lifecycle_rule {
    condition {
      num_newer_versions = 3
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  # --- Cleanup ---

  # Clean up incomplete multipart uploads after 2 days
  lifecycle_rule {
    condition {
      age = 2
    }
    action {
      type = "AbortIncompleteMultipartUpload"
    }
  }

  labels = {
    environment = "production"
    managed_by  = "terraform"
  }
}
```

## Using Variables for Reusable Lifecycle Configuration

If you have multiple buckets with similar lifecycle needs, use variables:

```hcl
variable "lifecycle_config" {
  type = object({
    nearline_age = number
    coldline_age = number
    archive_age  = number
    delete_age   = number
    max_versions = number
  })
  default = {
    nearline_age = 30
    coldline_age = 90
    archive_age  = 365
    delete_age   = 730
    max_versions = 5
  }
}

resource "google_storage_bucket" "configurable" {
  name          = "${var.project_id}-configurable"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = var.lifecycle_config.nearline_age
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = var.lifecycle_config.coldline_age
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = var.lifecycle_config.archive_age
    }
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }
  }

  lifecycle_rule {
    condition {
      age = var.lifecycle_config.delete_age
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = var.lifecycle_config.max_versions
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }
}
```

## Outputs

```hcl
output "tiered_bucket_name" {
  value = google_storage_bucket.tiered.name
}

output "production_bucket_url" {
  value = google_storage_bucket.production.url
}
```

## Best Practices

**Always clean up incomplete multipart uploads.** Add the `AbortIncompleteMultipartUpload` rule to every bucket. These uploads are invisible in normal listings but cost money.

**Respect minimum storage durations.** Nearline has a 30-day minimum, Coldline 90 days, and Archive 365 days. If you transition an object to Coldline and then delete it after 10 days, you still pay for 90 days. Plan your transitions accordingly.

**Use `with_state` explicitly.** When versioning is enabled, always specify whether a rule applies to `LIVE` or `ARCHIVED` versions. Rules without `with_state` apply to both, which might not be what you want.

**Test lifecycle rules on non-production data.** Lifecycle rules are evaluated asynchronously and cannot be undone. Deleted objects are gone (unless versioning saves them).

**Combine version limits and age-based deletion.** Using both `num_newer_versions` and `age` for non-current versions gives you a belt-and-suspenders approach to version cleanup.

## Conclusion

Lifecycle rules are the single most important cost optimization tool for Cloud Storage. Without them, storage costs grow linearly with time as old data accumulates. With properly configured lifecycle rules, data automatically moves to cheaper storage tiers and gets deleted when it is no longer needed. Terraform makes these rules auditable and consistent across all your buckets.

For the bucket configuration that these lifecycle rules apply to, see our guide on [creating Cloud Storage buckets with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-storage-buckets-with-terraform/view).
