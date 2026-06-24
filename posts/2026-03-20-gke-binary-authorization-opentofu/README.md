# How to Set Up GKE Binary Authorization with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GKE, Binary Authorization, Security, OpenTofu, Container Security, Supply Chain

Description: Learn how to configure GKE Binary Authorization with OpenTofu to enforce that only cryptographically verified container images are deployed to your clusters.

## Overview

GKE Binary Authorization is a deploy-time security control that helps ensure only trusted container images are deployed. Images must have attestations that are verifiable by authorized attestors before they can run on the cluster, helping prevent unauthorized or tampered images from being deployed. Binary Authorization doesn't enforce init containers.

## Step 1: Enable Required APIs

```hcl
# main.tf - Enable required APIs

resource "google_project_service" "binary_authorization" {
  service = "binaryauthorization.googleapis.com"
}

resource "google_project_service" "container_analysis" {
  service = "containeranalysis.googleapis.com"
}

resource "google_project_service" "cloud_kms" {
  service = "cloudkms.googleapis.com"
}

resource "google_project_service" "gke" {
  service = "container.googleapis.com"
}
```

## Step 2: Create an Attestor

```hcl
# Create a note (container analysis note for attestations)
resource "google_container_analysis_note" "build_attestor_note" {
  name = "build-verified-attestor-note"

  attestation_authority {
    hint {
      human_readable_name = "Build Verified by CI/CD"
    }
  }
}

# Create the attestor (used to verify image attestations)
resource "google_binary_authorization_attestor" "build_attestor" {
  name = "build-verified-attestor"

  attestation_authority_note {
    note_reference = google_container_analysis_note.build_attestor_note.name

    public_keys {
      id = data.google_kms_crypto_key_version.attestor_key_version.id

      pkix_public_key {
        public_key_pem      = data.google_kms_crypto_key_version.attestor_key_version.public_key[0].pem
        signature_algorithm = data.google_kms_crypto_key_version.attestor_key_version.public_key[0].algorithm
      }
    }
  }
}

# Allow Binary Authorization to read attestations attached to the note
resource "google_container_analysis_note_iam_member" "build_attestor_note_reader" {
  project = google_container_analysis_note.build_attestor_note.project
  note    = google_container_analysis_note.build_attestor_note.name
  role    = "roles/containeranalysis.notes.occurrences.viewer"
  member  = "serviceAccount:${google_binary_authorization_attestor.build_attestor.attestation_authority_note[0].delegation_service_account_email}"
}
```

## Step 3: Create KMS Key for Signing

```hcl
# KMS key ring and key for image signing
resource "google_kms_key_ring" "attestor_keyring" {
  name     = "attestor-keyring"
  location = "global"
}

resource "google_kms_crypto_key" "attestor_key" {
  name     = "attestor-signing-key"
  key_ring = google_kms_key_ring.attestor_keyring.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm = "EC_SIGN_P256_SHA256"
  }
}

data "google_kms_crypto_key_version" "attestor_key_version" {
  crypto_key = google_kms_crypto_key.attestor_key.id
}
```

## Step 4: Create Binary Authorization Policy

```hcl
# Binary Authorization policy for the project
resource "google_binary_authorization_policy" "policy" {
  # Trust Google-managed system images required by GKE
  global_policy_evaluation_mode = "ENABLE"

  # Default rule - require attestation for all other images
  default_admission_rule {
    evaluation_mode  = "REQUIRE_ATTESTATION"
    enforcement_mode = "ENFORCED_BLOCK_AND_AUDIT_LOG"

    require_attestations_by = [
      google_binary_authorization_attestor.build_attestor.name,
    ]
  }

  # Override for specific clusters - allow in development
  cluster_admission_rules {
    cluster                = "us-central1.dev-cluster"
    evaluation_mode        = "ALWAYS_ALLOW"
    enforcement_mode       = "ENFORCED_BLOCK_AND_AUDIT_LOG"
  }
}
```

## Step 5: Enable on GKE Cluster

```hcl
# GKE cluster with Binary Authorization enabled
resource "google_container_cluster" "secure_cluster" {
  name     = "binauth-cluster"
  location = "us-central1"
  initial_node_count = 1

  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # ... other cluster config
}
```

## Summary

GKE Binary Authorization with OpenTofu creates a supply chain security control that helps ensure only attested workload images are deployed to your clusters. A signer in your CI/CD pipeline signs the image digest to create an attestation, and the attestor stores the public key that Binary Authorization uses to verify it at deploy time. The admission policy rejects images that don't satisfy the required attestation policy, preventing unauthorized deployments.
