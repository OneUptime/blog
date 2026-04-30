# How to Create GCP KMS Keyrings and Keys with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, KMS, Encryption, OpenTofu, Security, Key Management

Description: Learn how to create GCP Cloud KMS keyrings and cryptographic keys with OpenTofu for application-level encryption, data protection, and CMEK configurations.

## Overview

Google Cloud KMS provides centralized cryptographic key management for encrypting data at rest and in transit. OpenTofu manages key rings, crypto keys, key versions, and IAM bindings for controlled key access.

## Step 1: Create Key Rings

```hcl
# main.tf - Key rings organize cryptographic keys by environment/purpose

resource "google_kms_key_ring" "production_keyring" {
  name     = "production-keyring"
  location = "us-central1"  # For CMEK, match the protected resource's location
  project  = var.project_id
}

resource "google_kms_key_ring" "global_keyring" {
  name     = "global-keyring"
  location = "global"  # Global multi-region for distributed workloads
  project  = var.project_id
}
```

## Step 2: Create Symmetric Encryption Keys

```hcl
# Symmetric key for envelope encryption of application data
resource "google_kms_crypto_key" "app_encryption_key" {
  name     = "application-encryption-key"
  key_ring = google_kms_key_ring.production_keyring.id
  purpose  = "ENCRYPT_DECRYPT"  # Symmetric encryption

  # Automatic key rotation every 90 days
  rotation_period = "7776000s"  # 90 days in seconds

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "SOFTWARE"  # or "HSM" for hardware security module
  }

  # Prevent accidental key destruction
  lifecycle {
    prevent_destroy = true
  }
}
```

## Step 3: Create Asymmetric Keys

```hcl
# RSA key for digital signing
resource "google_kms_crypto_key" "signing_key" {
  name     = "document-signing-key"
  key_ring = google_kms_key_ring.production_keyring.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "RSA_SIGN_PKCS1_4096_SHA256"
    protection_level = "HSM"  # Hardware-protected for signing
  }
}

# RSA key for asymmetric encryption
resource "google_kms_crypto_key" "rsa_encrypt_key" {
  name     = "rsa-encryption-key"
  key_ring = google_kms_key_ring.production_keyring.id
  purpose  = "ASYMMETRIC_DECRYPT"

  version_template {
    algorithm = "RSA_DECRYPT_OAEP_2048_SHA256"
  }
}
```

## Step 4: IAM for Key Access

```hcl
# Grant encryption/decryption access to an application
resource "google_kms_crypto_key_iam_member" "app_encrypter" {
  crypto_key_id = google_kms_crypto_key.app_encryption_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.app_sa.email}"
}

# Grant signing access to CI/CD pipeline
resource "google_kms_crypto_key_iam_member" "ci_signer" {
  crypto_key_id = google_kms_crypto_key.signing_key.id
  role          = "roles/cloudkms.signerVerifier"
  member        = "serviceAccount:${google_service_account.ci_sa.email}"
}
```

## Step 5: CMEK for GCP Services

```hcl
# Use the symmetric KMS key as CMEK for a bucket in the same location
resource "google_storage_bucket" "cmek_bucket" {
  name     = "${var.project_id}-cmek-protected-bucket"
  location = "us-central1"
  project  = var.project_id

  encryption {
    default_kms_key_name = google_kms_crypto_key.app_encryption_key.id
  }
}

# Grant Cloud Storage service account access to the key
resource "google_kms_crypto_key_iam_member" "storage_encrypter" {
  crypto_key_id = google_kms_crypto_key.app_encryption_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:service-${var.project_number}@gs-project-accounts.iam.gserviceaccount.com"
}
```

## Summary

GCP KMS keyrings and keys with OpenTofu provide centralized cryptographic key management. Use symmetric keys with automatic rotation for data encryption, asymmetric keys for digital signatures, and HSM protection for high-security use cases. CMEK integration with Cloud Storage, BigQuery, and GKE gives you control over data encryption without managing key material directly, as long as the KMS key uses the same location as the protected resource.
