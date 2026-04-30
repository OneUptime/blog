# How to Set Up GCP Certificate Authority Service with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Certificate Authority, PKI, OpenTofu, Security, mTLS

Description: Learn how to create a GCP Certificate Authority Service with OpenTofu to issue and manage X.509 certificates for mTLS, internal services, and workload identity.

## Overview

GCP Certificate Authority Service provides a managed, scalable PKI for issuing X.509 certificates. OpenTofu manages CA pools, certificate authorities, and certificate templates for internal mTLS, IoT device authentication, and code signing.

## Step 1: Create a CA Pool

```hcl
# main.tf - CA Pool groups CAs for load balancing and policy

resource "google_privateca_ca_pool" "internal_ca_pool" {
  name     = "internal-ca-pool"
  location = "us-central1"
  tier     = "ENTERPRISE"  # ENTERPRISE or DEVOPS

  publishing_options {
    publish_ca_cert = true
    publish_crl     = true
  }

  issuance_policy {
    maximum_lifetime = "2592000s"  # 30 days max cert lifetime

    allowed_key_types {
      elliptic_curve {
        signature_algorithm = "ECDSA_P256"
      }
    }

    allowed_key_types {
      rsa {
        min_modulus_size = 2048
        max_modulus_size = 4096
      }
    }

    # Restrict SANs to internal DNS suffixes
    identity_constraints {
      allow_subject_passthrough           = true
      allow_subject_alt_names_passthrough = true

      cel_expression {
        expression = "subject_alt_names.all(san, san.type == DNS && (san.value == \"internal.example.com\" || san.value.endsWith(\".internal.example.com\") || san.value == \"svc.cluster.local\" || san.value.endsWith(\".svc.cluster.local\")))"
        title      = "Restrict internal DNS SANs"
      }
    }
  }
}
```

## Step 2: Create a Root Certificate Authority

```hcl
# Root CA for internal PKI
resource "google_privateca_certificate_authority" "root_ca" {
  pool                     = google_privateca_ca_pool.internal_ca_pool.name
  certificate_authority_id = "internal-root-ca"
  location                 = "us-central1"
  type                     = "SELF_SIGNED"

  config {
    subject_config {
      subject {
        organization        = "Example Corp"
        organizational_unit = "IT Security"
        common_name         = "Internal Root CA"
        country_code        = "US"
      }
    }

    x509_config {
      ca_options {
        is_ca                  = true
        max_issuer_path_length = 2
      }

      key_usage {
        base_key_usage {
          cert_sign = true
          crl_sign  = true
        }
        extended_key_usage {
          server_auth = false
          client_auth = false
        }
      }
    }
  }

  key_spec {
    algorithm = "EC_P384_SHA384"
  }

  lifetime                 = "315360000s"  # 10 years for root CA
  deletion_protection      = true
}
```

## Step 3: Create a Subordinate CA

```hcl
# Subordinate CA for issuing leaf certificates
resource "google_privateca_certificate_authority" "intermediate_ca" {
  pool                     = google_privateca_ca_pool.internal_ca_pool.name
  certificate_authority_id = "internal-intermediate-ca"
  location                 = "us-central1"
  type                     = "SUBORDINATE"
  desired_state            = "ENABLED"  # Activate the subordinate CA so it can issue certs

  subordinate_config {
    certificate_authority = google_privateca_certificate_authority.root_ca.name
  }

  config {
    subject_config {
      subject {
        organization = "Example Corp"
        common_name  = "Internal Intermediate CA"
      }
    }

    x509_config {
      ca_options {
        is_ca                       = true
        zero_max_issuer_path_length = true
      }

      key_usage {
        base_key_usage {
          cert_sign = true
          crl_sign  = true
        }
        extended_key_usage {}
      }
    }
  }

  key_spec {
    algorithm = "EC_P256_SHA256"
  }

  lifetime = "157680000s"  # 5 years
}
```

## Step 4: Issue a Certificate

```hcl
# Generate a key pair and issue a certificate for a service
resource "tls_private_key" "service_key" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"
}

resource "google_privateca_certificate" "service_cert" {
  pool                  = google_privateca_ca_pool.internal_ca_pool.name
  location              = "us-central1"
  certificate_authority = google_privateca_certificate_authority.intermediate_ca.certificate_authority_id
  name                  = "my-service-cert"
  lifetime              = "2592000s"  # 30 days

  config {
    subject_config {
      subject {
        common_name  = "my-service.internal.example.com"
        organization = "Example Corp"
      }

      subject_alt_name {
        dns_names = ["my-service.internal.example.com"]
      }
    }

    x509_config {
      ca_options {
        is_ca = false
      }

      key_usage {
        base_key_usage {
          digital_signature = true
        }
        extended_key_usage {
          server_auth = true
          client_auth = true
        }
      }
    }

    public_key {
      format = "PEM"
      key    = base64encode(tls_private_key.service_key.public_key_pem)
    }
  }
}
```

## Summary

GCP Certificate Authority Service with OpenTofu provides a fully managed PKI without server maintenance. Create CA pools for load balancing, issue short-lived leaf certificates (30 days or less), and use subordinate CAs to limit exposure of the root CA. Short certificate lifetimes reduce the window of exposure if a certificate is compromised.
