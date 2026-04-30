# How to Create GCP Identity Platform Tenants with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Identity Platform, Firebase Auth, Multi-Tenancy, Infrastructure as Code

Description: Learn how to create and configure GCP Identity Platform tenants for multi-tenant authentication using OpenTofu.

## Introduction

Identity Platform, the Google Cloud customer identity service built on Firebase Authentication, supports multi-tenancy, allowing you to create isolated authentication environments for different customers or applications. OpenTofu manages tenant creation and configuration as code.

## Enabling Identity Platform

First, enable Google Identity Platform for the project, then ensure the Identity Toolkit API is enabled in your project.

```hcl
resource "google_project_service" "identity_toolkit" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"
}
```

## Creating a Tenant

Google requires multi-tenancy to be enabled for the project before you create tenants.

```hcl
resource "google_identity_platform_tenant" "customer_a" {
  project      = var.project_id
  display_name = "Customer A"
  depends_on   = [google_project_service.identity_toolkit]

  # Allow email/password sign-in
  allow_password_signup = true

  # Disable email link sign-in
  enable_email_link_signin = false
}
```

## Configuring an OIDC Identity Provider for a Tenant

```hcl
resource "google_identity_platform_tenant_oauth_idp_config" "google_oidc" {
  project      = var.project_id
  tenant       = google_identity_platform_tenant.customer_a.name
  name         = "oidc.google-workspace"
  display_name = "Google Workspace"
  client_id    = var.google_client_id
  issuer       = "https://accounts.google.com"
  enabled      = true

  client_secret = var.google_client_secret
}
```

## Configuring an Inbound SAML Provider for a Tenant

```hcl
resource "google_identity_platform_tenant_inbound_saml_config" "okta_saml" {
  project      = var.project_id
  tenant       = google_identity_platform_tenant.customer_a.name
  name         = "saml.okta"
  display_name = "Okta"

  idp_config {
    idp_entity_id = "http://www.okta.com/${var.okta_app_id}"
    sign_request  = true

    sso_url = "https://${var.okta_domain}/app/${var.okta_app_id}/sso/saml"

    idp_certificates {
      x509_certificate = var.okta_x509_certificate
    }
  }

  sp_config {
    sp_entity_id = "https://myapp.example.com"
    callback_uri = "https://myapp.example.com/__/auth/handler"
  }

  enabled = true
}
```

## Project-Level Identity Platform Config

Google requires multi-tenancy to be enabled before tenant creation, and this resource manages the project-level Identity Platform settings.

```hcl
resource "google_identity_platform_config" "default" {
  project    = var.project_id
  depends_on = [google_project_service.identity_toolkit]

  multi_tenant {
    allow_tenants = true
  }

  sign_in {
    allow_duplicate_emails = false

    anonymous {
      enabled = false
    }

    email {
      enabled           = true
      password_required = true
    }
  }
}
```

## Variables and Outputs

```hcl
variable "project_id"          { type = string }
variable "google_client_id"    { type = string }
variable "google_client_secret" {
  type      = string
  sensitive = true
}
variable "okta_domain"         { type = string }
variable "okta_app_id"         { type = string }
variable "okta_x509_certificate" {
  type      = string
  sensitive = true
}

output "tenant_id" {
  description = "Tenant ID to pass to Firebase SDK"
  value       = google_identity_platform_tenant.customer_a.name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

GCP Identity Platform multi-tenancy enables isolated authentication for each of your customers. OpenTofu manages tenant creation, OIDC and SAML provider configurations, and project-level settings, making multi-tenant identity infrastructure reproducible and auditable.
