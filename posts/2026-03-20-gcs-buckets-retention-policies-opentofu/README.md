# How to Configure GCS Bucket Retention Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud Storage, GCS, Retention policy, Terraform, Compliance

Description: Learn how to create Google Cloud Storage buckets and configure retention policies with OpenTofu to enforce minimum object retention periods for compliance and data protection.

---

GCS retention policies prevent objects from being deleted or overwritten before a specified retention period expires. This is essential for regulatory compliance (GDPR, HIPAA, SOC2) where audit logs and records must be preserved for defined periods.

---

## Create a GCS Bucket with Retention Policy

```hcl
# providers.tf

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

# main.tf
resource "google_storage_bucket" "audit_logs" {
  name          = "company-audit-logs-${var.project_id}"
  location      = "US"
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  retention_policy {
    retention_period = 2592000  # 30 days in seconds
    is_locked        = false    # Set to true for WORM compliance
  }

  versioning {
    enabled = true
  }

  labels = {
    environment = "production"
    purpose     = "audit-logs"
    managed_by  = "opentofu"
  }
}
```

---

## Retention Period Values

```hcl
locals {
  # Common retention periods in seconds
  retention_30_days  = 2592000
  retention_90_days  = 7776000
  retention_1_year   = 31536000
  retention_3_years  = 94608000
  retention_7_years  = 220752000
}
```

---

## Locked Retention Policy (WORM)

A locked retention policy creates a Write-Once-Read-Many (WORM) bucket. Once locked, it cannot be reduced or removed - only extended:

```hcl
resource "google_storage_bucket" "compliance_archive" {
  name     = "compliance-archive-${var.project_id}"
  location = "US-EAST1"

  retention_policy {
    retention_period = 94608000  # 3 years
    is_locked        = true      # WORM - irreversible!
  }

  uniform_bucket_level_access = true

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 365  # Move to Coldline after 1 year
    }
  }
}
```

---

## Object Lifecycle + Retention

Combine lifecycle rules with retention policies for cost management:

```hcl
resource "google_storage_bucket" "logs_with_lifecycle" {
  name     = "app-logs-${var.project_id}"
  location = "US"

  retention_policy {
    retention_period = 7776000  # 90 days minimum retention
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365  # Delete after 1 year (after 90-day retention expires)
    }
  }
}
```

---

## IAM Policy for Retention-Protected Bucket

```hcl
# Grant read-only access to security team
resource "google_storage_bucket_iam_binding" "audit_viewer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectViewer"

  members = [
    "group:security@corp.example.com",
  ]
}

# Grant write-only uploads to the log writer without delete permission
resource "google_storage_bucket_iam_binding" "log_writer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectCreator"

  members = [
    "serviceAccount:log-writer@${var.project_id}.iam.gserviceaccount.com",
  ]
}
```

---

## Multiple Buckets with Different Retention Periods

```hcl
variable "buckets" {
  default = {
    "access-logs" = {
      retention_days = 90
      location       = "US"
      locked         = false
    }
    "audit-trail" = {
      retention_days = 2555  # 7 years
      location       = "US"
      locked         = true
    }
    "error-logs" = {
      retention_days = 30
      location       = "US"
      locked         = false
    }
  }
}

resource "google_storage_bucket" "log_buckets" {
  for_each = var.buckets

  name     = "${each.key}-${var.project_id}"
  location = each.value.location

  retention_policy {
    retention_period = each.value.retention_days * 86400
    is_locked        = each.value.locked
  }

  uniform_bucket_level_access = true
}
```

---

## Apply and Verify

```bash
tofu init
tofu plan
tofu apply

# Check retention policy via gcloud
gcloud storage buckets describe gs://company-audit-logs-my-project \
  --format="default(retention_policy)"

# Upload a test object
echo "test" > test.txt
gcloud storage cp test.txt gs://company-audit-logs-my-project/test.txt

# Try to delete it (should fail during retention period)
gcloud storage rm gs://company-audit-logs-my-project/test.txt
# Deletion fails with a 403 retention policy error until the retention period expires
```

---

## Best Practices

1. **Start unlocked** - test retention periods before locking, since locked policies are irreversible
2. **Combine with object versioning** for full protection against overwrites
3. **Use COLDLINE/ARCHIVE** storage class for long-retention archives to minimize cost
4. **Document retention decisions** - note the regulation that requires each retention period
5. **Enable Cloud Audit Logs** (including Data Access logs) for Cloud Storage access tracking during the retention period

---

## Conclusion

GCS retention policies with OpenTofu provide enforceable, version-controlled data retention for compliance. Use `is_locked = true` for WORM compliance, combine lifecycle rules to manage storage costs, and use `for_each` to apply consistent policies across multiple buckets.

---

*Monitor your GCS bucket health and access patterns with [OneUptime](https://oneuptime.com).*
