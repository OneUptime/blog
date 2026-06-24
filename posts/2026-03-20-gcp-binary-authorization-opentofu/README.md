# How to Configure GCP Binary Authorization with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Binary Authorization, Container Security, OpenTofu, Supply Chain, Kubernetes

Description: Learn how to configure GCP Binary Authorization policies with OpenTofu at the project and cluster level to enforce container image attestation requirements.

## Overview

GCP Binary Authorization enforces deploy-time policies requiring container images to be attested (signed) before deployment to GKE. This post focuses on the project-level Binary Authorization policy and the IAM required for a CI/CD pipeline to create attestations automatically.

## Step 1: Enable Binary Authorization

```hcl
# main.tf - Enable Binary Authorization API

resource "google_project_service" "binary_authorization" {
  service = "binaryauthorization.googleapis.com"
}

resource "google_project_service" "container_analysis" {
  service = "containeranalysis.googleapis.com"
}

resource "google_project_service" "cloud_kms" {
  service = "cloudkms.googleapis.com"
}
```

## Step 2: Create KMS Signing Key

```hcl
# KMS keyring for attestor signing key
resource "google_kms_key_ring" "binauth_keyring" {
  name     = "binary-auth-keyring"
  location = "global"
}

resource "google_kms_crypto_key" "attestor_key" {
  name     = "ci-attestor-key"
  key_ring = google_kms_key_ring.binauth_keyring.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm = "EC_SIGN_P256_SHA256"
  }
}

data "google_kms_crypto_key_version" "attestor_key_version" {
  crypto_key = google_kms_crypto_key.attestor_key.id
}
```

## Step 3: Create Container Analysis Note and Attestor

```hcl
resource "google_container_analysis_note" "ci_build_note" {
  name = "ci-build-verified"

  attestation_authority {
    hint {
      human_readable_name = "CI/CD Build Verified"
    }
  }
}

# Attestor that CI/CD pipeline uses to sign images
resource "google_binary_authorization_attestor" "ci_attestor" {
  name = "ci-build-attestor"

  attestation_authority_note {
    note_reference = google_container_analysis_note.ci_build_note.name

    public_keys {
      id = data.google_kms_crypto_key_version.attestor_key_version.id

      pkix_public_key {
        public_key_pem      = data.google_kms_crypto_key_version.attestor_key_version.public_key[0].pem
        signature_algorithm = data.google_kms_crypto_key_version.attestor_key_version.public_key[0].algorithm
      }
    }
  }
}
```

## Step 4: Configure the Binary Authorization Policy

```hcl
# Project-level Binary Authorization policy
resource "google_binary_authorization_policy" "default_policy" {
  project = var.project_id

  # Default rule: require CI attestation for all images
  default_admission_rule {
    evaluation_mode  = "REQUIRE_ATTESTATION"
    enforcement_mode = "ENFORCED_BLOCK_AND_AUDIT_LOG"

    require_attestations_by = [
      google_binary_authorization_attestor.ci_attestor.name,
    ]
  }

  # Use the Google-maintained allowlist for GKE system images
  global_policy_evaluation_mode = "ENABLE"
}
```

## Step 5: Grant Required IAM Permissions

```hcl
# CI/CD pipeline service account can read the attestor, sign with KMS, and attach attestations
resource "google_container_analysis_note_iam_member" "ci_note_attacher" {
  project = var.project_id
  note    = google_container_analysis_note.ci_build_note.name
  role    = "roles/containeranalysis.notes.attacher"
  member  = "serviceAccount:${google_service_account.ci_sa.email}"
}

resource "google_kms_crypto_key_iam_member" "ci_kms_signer" {
  crypto_key_id = google_kms_crypto_key.attestor_key.id
  role          = "roles/cloudkms.signerVerifier"
  member        = "serviceAccount:${google_service_account.ci_sa.email}"
}

resource "google_binary_authorization_attestor_iam_member" "ci_attestor_viewer" {
  project  = var.project_id
  attestor = google_binary_authorization_attestor.ci_attestor.name
  role     = "roles/binaryauthorization.attestorsViewer"
  member   = "serviceAccount:${google_service_account.ci_sa.email}"
}

# Binary Authorization must be able to read attestations on the note at deploy time
resource "google_container_analysis_note_iam_member" "attestor_note_viewer" {
  project = var.project_id
  note    = google_container_analysis_note.ci_build_note.name
  role    = "roles/containeranalysis.notes.occurrences.viewer"
  member  = "serviceAccount:${google_binary_authorization_attestor.ci_attestor.attestation_authority_note[0].delegation_service_account_email}"
}
```

## Summary

GCP Binary Authorization with OpenTofu creates a cryptographic supply chain control that prevents unauthorized container images from running in production. The CI/CD pipeline signs images after successful builds, and the admission policy enforces that only signed images can be deployed to GKE clusters.
