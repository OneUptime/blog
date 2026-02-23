# How to Create GCP KMS Keys with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, KMS, Encryption, Security, Infrastructure as Code

Description: Learn how to create and manage Google Cloud KMS key rings, crypto keys, and key versions using Terraform for encryption at rest and in transit.

---

Encryption is table stakes for any production system, and Google Cloud KMS (Key Management Service) is how you manage encryption keys on GCP. Whether you are encrypting data in Cloud Storage, BigQuery, Compute Engine disks, or your own application data, KMS gives you centralized key management with hardware-backed security.

Managing KMS with Terraform is particularly valuable because key configuration is something you want reviewed, version-controlled, and consistent across environments. A misconfigured key rotation policy or an overly permissive IAM binding can undermine your entire encryption strategy. This guide covers creating key rings, crypto keys, key rotation, and IAM for KMS resources.

## Enabling the KMS API

```hcl
# Enable Cloud KMS API
resource "google_project_service" "kms" {
  project = var.project_id
  service = "cloudkms.googleapis.com"

  disable_on_destroy = false
}
```

## Key Rings and Crypto Keys

KMS has a hierarchy: key rings contain crypto keys, and crypto keys contain key versions. Key rings are regional resources, and once created, they cannot be deleted (only the keys within them can be destroyed).

```hcl
# Create a key ring - this is a container for keys
# Key rings cannot be deleted, so choose the name carefully
resource "google_kms_key_ring" "main" {
  name     = "main-keyring"
  location = var.region
  project  = var.project_id

  depends_on = [google_project_service.kms]
}

# Create a symmetric encryption key for general-purpose encryption
resource "google_kms_crypto_key" "database_encryption" {
  name     = "database-encryption"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ENCRYPT_DECRYPT"

  # Rotate the key every 90 days
  rotation_period = "7776000s"  # 90 days in seconds

  # Version template defines the algorithm for new key versions
  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  labels = {
    environment = var.environment
    use_case    = "database"
  }

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}
```

## HSM-Backed Keys

For workloads that require hardware security module (HSM) protection, change the protection level. This uses Cloud HSM, which is FIPS 140-2 Level 3 validated.

```hcl
# HSM-protected key for compliance-sensitive workloads
resource "google_kms_crypto_key" "hsm_key" {
  name     = "compliance-encryption"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ENCRYPT_DECRYPT"

  rotation_period = "7776000s"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"  # Hardware Security Module
  }

  labels = {
    compliance  = "true"
    environment = var.environment
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Asymmetric Keys

KMS also supports asymmetric keys for signing and encryption. These are useful for code signing, JWT verification, and asymmetric encryption.

```hcl
# Asymmetric signing key for code signing
resource "google_kms_crypto_key" "signing_key" {
  name     = "code-signing"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "SOFTWARE"
  }

  # Asymmetric keys do not support automatic rotation
  # You need to manually create new versions

  labels = {
    use_case = "code-signing"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Asymmetric encryption key
resource "google_kms_crypto_key" "asymmetric_encrypt" {
  name     = "asymmetric-encryption"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ASYMMETRIC_DECRYPT"

  version_template {
    algorithm        = "RSA_DECRYPT_OAEP_2048_SHA256"
    protection_level = "SOFTWARE"
  }

  labels = {
    use_case = "asymmetric-encryption"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## IAM for KMS Keys

Controlling who can use, manage, and administer keys is essential. KMS has granular IAM roles.

```hcl
# Allow a service account to encrypt and decrypt with a specific key
resource "google_kms_crypto_key_iam_member" "encrypter_decrypter" {
  crypto_key_id = google_kms_crypto_key.database_encryption.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${var.app_service_account_email}"
}

# Allow a different service account to only encrypt (not decrypt)
resource "google_kms_crypto_key_iam_member" "encrypter_only" {
  crypto_key_id = google_kms_crypto_key.database_encryption.id
  role          = "roles/cloudkms.cryptoKeyEncrypter"
  member        = "serviceAccount:${var.logging_service_account_email}"
}

# Allow the security team to view key metadata but not use keys
resource "google_kms_crypto_key_iam_member" "viewer" {
  crypto_key_id = google_kms_crypto_key.database_encryption.id
  role          = "roles/cloudkms.viewer"
  member        = "group:security-team@example.com"
}

# Key ring level IAM - applies to all keys in the ring
resource "google_kms_key_ring_iam_member" "admin" {
  key_ring_id = google_kms_key_ring.main.id
  role        = "roles/cloudkms.admin"
  member      = "group:kms-admins@example.com"
}
```

## Customer-Managed Encryption Keys (CMEK)

One of the most common uses of KMS is CMEK - using your own keys to encrypt GCP resources instead of Google-managed keys.

```hcl
# Key for encrypting Cloud Storage objects
resource "google_kms_crypto_key" "storage_cmek" {
  name     = "storage-cmek"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ENCRYPT_DECRYPT"

  rotation_period = "7776000s"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Grant the Cloud Storage service agent permission to use the key
data "google_storage_project_service_account" "gcs_account" {
  project = var.project_id
}

resource "google_kms_crypto_key_iam_member" "gcs_cmek" {
  crypto_key_id = google_kms_crypto_key.storage_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}

# Create a bucket encrypted with the CMEK
resource "google_storage_bucket" "encrypted_bucket" {
  name          = "${var.project_id}-encrypted-data"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_cmek.id
  }

  uniform_bucket_level_access = true

  # Make sure the IAM binding exists before creating the bucket
  depends_on = [google_kms_crypto_key_iam_member.gcs_cmek]
}
```

## CMEK for BigQuery

```hcl
# Key for BigQuery encryption
resource "google_kms_crypto_key" "bigquery_cmek" {
  name     = "bigquery-cmek"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ENCRYPT_DECRYPT"

  rotation_period = "7776000s"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# Grant the BigQuery service agent access
data "google_bigquery_default_service_account" "bq_account" {
  project = var.project_id
}

resource "google_kms_crypto_key_iam_member" "bq_cmek" {
  crypto_key_id = google_kms_crypto_key.bigquery_cmek.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_bigquery_default_service_account.bq_account.email}"
}

# Create a BigQuery dataset with CMEK
resource "google_bigquery_dataset" "encrypted_dataset" {
  dataset_id = "encrypted_data"
  project    = var.project_id
  location   = var.region

  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.bigquery_cmek.id
  }

  depends_on = [google_kms_crypto_key_iam_member.bq_cmek]
}
```

## Multi-Region Key Rings

For globally distributed applications, you might need keys in multiple regions or a global key ring.

```hcl
# Global key ring
resource "google_kms_key_ring" "global" {
  name     = "global-keyring"
  location = "global"
  project  = var.project_id
}

# Regional key rings for data residency requirements
resource "google_kms_key_ring" "regional" {
  for_each = toset(["us-central1", "europe-west1", "asia-east1"])

  name     = "regional-keyring-${each.value}"
  location = each.value
  project  = var.project_id
}
```

## Key Destroy Scheduled Duration

You can control how long a key version stays in the "scheduled for destruction" state before being permanently destroyed. This gives you a window to recover if someone accidentally destroys a key.

```hcl
# Key with a longer destruction window
resource "google_kms_crypto_key" "careful_key" {
  name     = "careful-encryption"
  key_ring = google_kms_key_ring.main.id
  purpose  = "ENCRYPT_DECRYPT"

  rotation_period = "7776000s"

  # 30 days before permanent destruction (default is 24 hours)
  destroy_scheduled_duration = "2592000s"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Practical Tips

Always use `lifecycle { prevent_destroy = true }` on KMS keys. Destroying a key means any data encrypted with that key is permanently unrecoverable. This is not something you want to happen accidentally during a `terraform destroy`.

Key rings cannot be deleted. Once you create one, it exists forever. This means you should think carefully about naming and organization before creating them.

Automatic key rotation only works for symmetric encryption keys. For asymmetric keys, you need to create new versions manually and update your applications to use them.

When using CMEK, remember that the service agent for each GCP service needs the `cryptoKeyEncrypterDecrypter` role on the specific key. If you forget this binding, resource creation will fail with a permission error.

## Conclusion

KMS is a foundational security service that benefits enormously from infrastructure-as-code management. With Terraform, you can define your key hierarchy, rotation policies, and access controls in version-controlled files, review changes in pull requests, and deploy consistently across environments. Start with CMEK for your most sensitive data stores and expand from there.
