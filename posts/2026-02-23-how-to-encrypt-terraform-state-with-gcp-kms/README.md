# How to Encrypt Terraform State with GCP KMS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, KMS, Encryption, Security, State Management

Description: A complete guide to encrypting Terraform state files with Google Cloud KMS and Cloud Storage, covering key ring setup, bucket encryption, IAM policies, key rotation, and audit logging.

---

Google Cloud Storage (GCS) is a common backend for Terraform state when you run on GCP. While GCS encrypts all data at rest by default using Google-managed keys, using Customer-Managed Encryption Keys (CMEK) through Cloud KMS gives you control over who can decrypt your state files. This guide covers the entire setup process.

## Default Encryption vs. CMEK

GCS encrypts all objects at rest using AES-256 by default. This is transparent and requires no configuration. However, with CMEK:

- You manage the encryption keys in Cloud KMS
- You control access through IAM policies
- You get audit logs for every key operation
- You can disable or destroy keys to make data inaccessible
- You can meet compliance requirements that mandate customer-managed keys

## Setting Up Cloud KMS

First, enable the required APIs and create a key ring and key:

```hcl
# Enable required APIs
resource "google_project_service" "kms" {
  service = "cloudkms.googleapis.com"
}

resource "google_project_service" "storage" {
  service = "storage.googleapis.com"
}

# Create a key ring (regional container for keys)
resource "google_kms_key_ring" "terraform_state" {
  name     = "terraform-state-keyring"
  location = "us-east1"

  depends_on = [google_project_service.kms]
}

# Create a crypto key for state encryption
resource "google_kms_crypto_key" "terraform_state" {
  name     = "terraform-state-key"
  key_ring = google_kms_key_ring.terraform_state.id

  # Rotation period (90 days)
  rotation_period = "7776000s"

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  # Version template
  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPT"
    protection_level = "SOFTWARE"  # Use "HSM" for hardware security modules
  }
}
```

## Granting Encryption Permissions

The GCS service agent needs permission to use the KMS key for encrypting and decrypting objects:

```hcl
# Get the GCS service agent email
data "google_storage_project_service_account" "gcs_account" {}

# Grant the GCS service agent permission to use the KMS key
resource "google_kms_crypto_key_iam_binding" "gcs_encrypt" {
  crypto_key_id = google_kms_crypto_key.terraform_state.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"

  members = [
    "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
  ]
}
```

## Creating the Encrypted Storage Bucket

Create a GCS bucket with CMEK encryption configured:

```hcl
# GCS bucket for Terraform state with CMEK encryption
resource "google_storage_bucket" "terraform_state" {
  name          = "my-project-terraform-state"
  location      = "US-EAST1"
  storage_class = "STANDARD"

  # Enable CMEK encryption
  encryption {
    default_kms_key_name = google_kms_crypto_key.terraform_state.id
  }

  # Enable versioning for state recovery
  versioning {
    enabled = true
  }

  # Lifecycle rule to clean up old versions
  lifecycle_rule {
    condition {
      num_newer_versions = 10  # Keep 10 versions
    }
    action {
      type = "Delete"
    }
  }

  # Prevent public access
  uniform_bucket_level_access = true

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }

  depends_on = [google_kms_crypto_key_iam_binding.gcs_encrypt]
}
```

## Configuring the Terraform Backend

Point Terraform to the encrypted bucket:

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket  = "my-project-terraform-state"
    prefix  = "production"

    # The bucket's default CMEK encryption applies automatically
    # No additional encryption configuration needed here
  }
}
```

If you want to specify the KMS key explicitly in the backend configuration:

```hcl
terraform {
  backend "gcs" {
    bucket               = "my-project-terraform-state"
    prefix               = "production"
    kms_encryption_key   = "projects/my-project/locations/us-east1/keyRings/terraform-state-keyring/cryptoKeys/terraform-state-key"
  }
}
```

## IAM Access Controls

Restrict who can access the state bucket and encryption keys:

```hcl
# Grant Terraform's service account access to the state bucket
resource "google_storage_bucket_iam_member" "terraform_state_admin" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}

# Grant Terraform's service account access to use the KMS key
resource "google_kms_crypto_key_iam_member" "terraform_encrypt" {
  crypto_key_id = google_kms_crypto_key.terraform_state.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}

# Read-only access for auditors (can view state but not modify)
resource "google_storage_bucket_iam_member" "auditor_read" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectViewer"
  member = "group:auditors@example.com"
}

# Auditors also need KMS decrypt permission to read encrypted state
resource "google_kms_crypto_key_iam_member" "auditor_decrypt" {
  crypto_key_id = google_kms_crypto_key.terraform_state.id
  role          = "roles/cloudkms.cryptoKeyDecrypter"
  member        = "group:auditors@example.com"
}
```

## Using VPC Service Controls

For extra security, you can restrict access to the state bucket and KMS key using VPC Service Controls:

```hcl
# Create an access policy
resource "google_access_context_manager_access_policy" "policy" {
  parent = "organizations/${var.org_id}"
  title  = "terraform-state-policy"
}

# Create a service perimeter
resource "google_access_context_manager_service_perimeter" "state" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/servicePerimeters/terraform_state"
  title  = "Terraform State Perimeter"

  status {
    restricted_services = [
      "storage.googleapis.com",
      "cloudkms.googleapis.com"
    ]

    resources = [
      "projects/${var.project_number}"
    ]

    # Allow access from specific IP ranges
    access_levels = [
      google_access_context_manager_access_level.trusted_networks.name
    ]
  }
}
```

## Audit Logging

Cloud Audit Logs automatically capture KMS operations. Enable Data Access logs for detailed tracking:

```hcl
# Enable data access audit logging for KMS
resource "google_project_iam_audit_config" "kms_audit" {
  project = var.project_id
  service = "cloudkms.googleapis.com"

  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }

  audit_log_config {
    log_type = "ADMIN_READ"
  }
}
```

Query audit logs to see key usage:

```bash
# View recent KMS operations using gcloud
gcloud logging read '
  resource.type="cloudkms_cryptokey" AND
  resource.labels.key_ring_id="terraform-state-keyring" AND
  resource.labels.crypto_key_id="terraform-state-key"
' --limit=20 --format=json

# Or use a log sink to export to BigQuery for analysis
```

```hcl
# Export KMS audit logs to BigQuery
resource "google_logging_project_sink" "kms_audit" {
  name        = "kms-audit-sink"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/security_audit"
  filter      = "resource.type=\"cloudkms_cryptokey\" AND resource.labels.key_ring_id=\"terraform-state-keyring\""

  unique_writer_identity = true
}

# Grant the sink writer identity access to BigQuery
resource "google_bigquery_dataset_iam_member" "kms_audit_writer" {
  dataset_id = google_bigquery_dataset.security_audit.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.kms_audit.writer_identity
}
```

## Key Rotation

Cloud KMS supports automatic key rotation. When you set a rotation period, new key versions are created automatically, and previous versions remain available for decryption:

```bash
# Check the current key version
gcloud kms keys describe terraform-state-key \
  --keyring=terraform-state-keyring \
  --location=us-east1 \
  --format='value(primary.name)'

# Manually trigger key rotation
gcloud kms keys update terraform-state-key \
  --keyring=terraform-state-keyring \
  --location=us-east1 \
  --rotation-period=7776000s \
  --next-rotation-time=$(date -u +"%Y-%m-%dT%H:%M:%SZ" -d "+1 day")

# List all key versions
gcloud kms keys versions list \
  --key=terraform-state-key \
  --keyring=terraform-state-keyring \
  --location=us-east1
```

## Using HSM-Protected Keys

For the highest level of security, use Cloud HSM keys:

```hcl
resource "google_kms_crypto_key" "terraform_state_hsm" {
  name     = "terraform-state-key-hsm"
  key_ring = google_kms_key_ring.terraform_state.id

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPT"
    protection_level = "HSM"  # Hardware Security Module
  }

  rotation_period = "7776000s"
}
```

HSM keys cost more but provide hardware-backed protection that satisfies strict compliance requirements like FIPS 140-2 Level 3.

## Disaster Recovery

Plan for key or bucket issues:

```bash
# If a key version is accidentally disabled, re-enable it
gcloud kms keys versions enable VERSION_NUMBER \
  --key=terraform-state-key \
  --keyring=terraform-state-keyring \
  --location=us-east1

# If a key version is scheduled for destruction (24-hour window to cancel)
gcloud kms keys versions restore VERSION_NUMBER \
  --key=terraform-state-key \
  --keyring=terraform-state-keyring \
  --location=us-east1

# Access previous state versions from GCS
gsutil ls -a gs://my-project-terraform-state/production/default.tfstate
```

## Monitoring Your Infrastructure

Encrypting state files protects your secrets, but you also need to monitor what those state files deploy. [OneUptime](https://oneuptime.com) offers comprehensive monitoring for GCP infrastructure, with alerting and incident management to keep your services running smoothly.

## Conclusion

Cloud KMS encryption for Terraform state on GCP is a straightforward process that significantly improves your security posture. Create a key ring and key, configure the GCS bucket to use it, set up proper IAM bindings, and enable audit logging. The automatic key rotation and deep integration with GCS make this a low-maintenance setup once configured.

For encryption guides on other clouds, see our posts on [AWS KMS encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-encrypt-terraform-state-with-aws-kms/view) and [Azure Key Vault encryption](https://oneuptime.com/blog/post/2026-02-23-how-to-encrypt-terraform-state-with-azure-key-vault/view).
