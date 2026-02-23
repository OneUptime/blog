# How to Create GCP Certificate Manager with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Certificate Manager, SSL, TLS, Infrastructure as Code, Google Cloud

Description: A practical guide to managing SSL/TLS certificates on Google Cloud using Certificate Manager and Terraform for automated provisioning.

---

Managing SSL/TLS certificates is one of those tasks that nobody enjoys doing manually. Certificates expire, domains change, and keeping track of it all becomes a headache fast. Google Cloud's Certificate Manager provides a centralized way to handle certificates, and when you pair it with Terraform, you get automated, repeatable certificate management that practically runs itself.

This guide covers how to create and manage certificates using GCP Certificate Manager through Terraform, including both Google-managed and self-managed certificates.

## What is GCP Certificate Manager?

Certificate Manager is Google Cloud's dedicated service for provisioning and managing TLS certificates. It replaces the older approach of attaching certificates directly to load balancer proxies. With Certificate Manager, you can:

- Provision Google-managed certificates with automatic renewal
- Upload your own certificates for custom requirements
- Use certificate maps to bind certificates to load balancers
- Handle wildcard certificates and multi-domain setups

## Provider Setup

You need the Google provider and the Certificate Manager API enabled.

```hcl
# main.tf - Terraform and provider configuration
terraform {
  required_version = ">= 1.0"

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
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Default region"
  type        = string
  default     = "us-central1"
}

# Enable the Certificate Manager API
resource "google_project_service" "certificate_manager" {
  project = var.project_id
  service = "certificatemanager.googleapis.com"

  # Don't disable the API if the resource is destroyed
  disable_on_destroy = false
}
```

## Creating a DNS Authorization

Before Certificate Manager can issue a Google-managed certificate, it needs to verify that you own the domain. DNS authorization is the most common method.

```hcl
# dns_auth.tf - DNS authorization for domain verification
resource "google_certificate_manager_dns_authorization" "default" {
  name        = "example-dns-auth"
  description = "DNS authorization for example.com"
  domain      = "example.com"

  depends_on = [google_project_service.certificate_manager]
}

# Output the CNAME record you need to add to your DNS
output "dns_auth_record" {
  description = "Add this CNAME record to your DNS zone"
  value = {
    name   = google_certificate_manager_dns_authorization.default.dns_resource_record[0].name
    type   = google_certificate_manager_dns_authorization.default.dns_resource_record[0].type
    data   = google_certificate_manager_dns_authorization.default.dns_resource_record[0].data
  }
}
```

If you manage your DNS in Cloud DNS, you can automate the verification record.

```hcl
# Automatically create the verification record in Cloud DNS
resource "google_dns_record_set" "cert_verification" {
  name         = google_certificate_manager_dns_authorization.default.dns_resource_record[0].name
  managed_zone = "example-zone"  # Your existing Cloud DNS zone name
  type         = google_certificate_manager_dns_authorization.default.dns_resource_record[0].type
  ttl          = 300
  rrdatas      = [google_certificate_manager_dns_authorization.default.dns_resource_record[0].data]
}
```

## Creating a Google-Managed Certificate

With DNS authorization in place, you can create a Google-managed certificate that renews automatically.

```hcl
# certificate.tf - Google-managed certificate
resource "google_certificate_manager_certificate" "managed_cert" {
  name        = "example-managed-cert"
  description = "Google-managed certificate for example.com"

  managed {
    domains = [
      "example.com",
      "www.example.com",
    ]

    # Reference the DNS authorization
    dns_authorizations = [
      google_certificate_manager_dns_authorization.default.id,
    ]
  }

  depends_on = [google_project_service.certificate_manager]
}
```

For wildcard certificates, you need to use DNS authorization (load balancer authorization will not work for wildcards).

```hcl
# Wildcard certificate covering all subdomains
resource "google_certificate_manager_certificate" "wildcard_cert" {
  name        = "example-wildcard-cert"
  description = "Wildcard certificate for *.example.com"

  managed {
    domains = [
      "example.com",
      "*.example.com",
    ]

    dns_authorizations = [
      google_certificate_manager_dns_authorization.default.id,
    ]
  }
}
```

## Creating a Self-Managed Certificate

If you have your own certificate (from a third-party CA or an internal CA), you can upload it.

```hcl
# self_managed.tf - Upload your own certificate
resource "google_certificate_manager_certificate" "self_managed_cert" {
  name        = "example-self-managed-cert"
  description = "Self-managed certificate uploaded from local files"

  self_managed {
    pem_certificate = file("${path.module}/certs/cert.pem")
    pem_private_key = file("${path.module}/certs/key.pem")
  }
}
```

Keep in mind that self-managed certificates will not auto-renew. You are responsible for updating them before they expire.

## Setting Up Certificate Maps

Certificate maps are the glue between certificates and load balancers. A certificate map contains entries that match incoming requests to the right certificate.

```hcl
# certificate_map.tf - Map certificates to domains
resource "google_certificate_manager_certificate_map" "default" {
  name        = "example-cert-map"
  description = "Certificate map for example.com domains"

  depends_on = [google_project_service.certificate_manager]
}

# Map entry for the primary domain
resource "google_certificate_manager_certificate_map_entry" "primary" {
  name         = "example-primary-entry"
  description  = "Entry for example.com"
  map          = google_certificate_manager_certificate_map.default.name
  hostname     = "example.com"
  certificates = [google_certificate_manager_certificate.managed_cert.id]
}

# Map entry for the www subdomain
resource "google_certificate_manager_certificate_map_entry" "www" {
  name         = "example-www-entry"
  description  = "Entry for www.example.com"
  map          = google_certificate_manager_certificate_map.default.name
  hostname     = "www.example.com"
  certificates = [google_certificate_manager_certificate.managed_cert.id]
}

# Default entry that catches unmatched hostnames
resource "google_certificate_manager_certificate_map_entry" "default_entry" {
  name         = "example-default-entry"
  description  = "Default entry for unmatched hosts"
  map          = google_certificate_manager_certificate_map.default.name
  matcher      = "PRIMARY"
  certificates = [google_certificate_manager_certificate.managed_cert.id]
}
```

## Attaching the Certificate Map to a Load Balancer

To use the certificate map, attach it to a target HTTPS proxy.

```hcl
# load_balancer.tf - Attach certificate map to HTTPS proxy
resource "google_compute_target_https_proxy" "default" {
  name            = "example-https-proxy"
  url_map         = google_compute_url_map.default.id
  certificate_map = "//certificatemanager.googleapis.com/${google_certificate_manager_certificate_map.default.id}"
}

resource "google_compute_url_map" "default" {
  name            = "example-url-map"
  default_service = google_compute_backend_service.default.id
}
```

Notice the `//certificatemanager.googleapis.com/` prefix on the certificate map reference. This is required because the HTTPS proxy expects a full resource URI, not just the Terraform resource ID.

## Certificate Issuance Config

For more advanced setups, you can configure how certificates get issued.

```hcl
# issuance_config.tf - Configure certificate issuance settings
resource "google_certificate_manager_certificate_issuance_config" "default" {
  name        = "example-issuance-config"
  description = "Default issuance configuration"

  certificate_authority_config {
    certificate_authority_service_config {
      # Reference to a Certificate Authority Service CA pool
      ca_pool = "projects/${var.project_id}/locations/${var.region}/caPools/my-ca-pool"
    }
  }

  lifetime         = "2592000s"  # 30 days
  rotation_window_percentage = 66
  key_algorithm    = "ECDSA_P256"
}
```

## Checking Certificate Status

After applying, certificates take time to provision. You can check the status with:

```bash
# List all certificates
gcloud certificate-manager certificates list

# Describe a specific certificate to see provisioning status
gcloud certificate-manager certificates describe example-managed-cert
```

The certificate status should move from `PROVISIONING` to `ACTIVE` once DNS verification completes and the certificate is issued.

## Monitoring Certificate Expiry

Even with auto-renewal, it is good practice to monitor your certificates. If DNS records change or permissions get revoked, renewal can fail silently. Tools like [OneUptime](https://oneuptime.com) can monitor your SSL certificates and alert you before they expire, giving you time to fix any issues.

## Summary

GCP Certificate Manager with Terraform gives you a clean, automated approach to TLS certificate lifecycle management. The key resources are DNS authorizations for domain verification, certificates for the actual TLS certs, and certificate maps for binding certificates to load balancers. Google-managed certificates handle renewal automatically, while self-managed certificates give you full control when you need it.

For related infrastructure automation, see our guide on [how to create GCP Cloud CDN with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-cdn-with-terraform/view).
