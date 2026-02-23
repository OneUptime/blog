# How to Create GCP Identity Platform with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Identity Platform, Authentication, Security, Infrastructure as Code

Description: Learn how to configure Google Cloud Identity Platform using Terraform for user authentication with email, social logins, and multi-factor authentication.

---

Google Cloud Identity Platform is a customer identity and access management (CIAM) service. It is the same backend that powers Firebase Authentication, but with additional enterprise features like multi-tenancy, SAML support, and blocking functions. You use it to add user sign-up, sign-in, and identity management to your applications without building an auth system from scratch.

Managing Identity Platform through the console works for getting started, but as your authentication configuration gets more complex - multiple identity providers, custom token claims, blocking functions, multi-factor authentication - you want it in code. Terraform lets you define your entire auth configuration as infrastructure, version it, and deploy it consistently across environments.

## Enabling Identity Platform

Identity Platform requires enabling the Identity Toolkit API, which is different from the IAM API.

```hcl
# Enable Identity Platform (Identity Toolkit)
resource "google_project_service" "identity_toolkit" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"

  disable_on_destroy = false
}

# Identity Platform also uses these APIs
resource "google_project_service" "identity_platform" {
  project = var.project_id
  service = "identityplatform.googleapis.com"

  disable_on_destroy = false
}
```

## Configuring Identity Platform

The `google_identity_platform_config` resource is the main configuration for Identity Platform.

```hcl
# Configure Identity Platform
resource "google_identity_platform_config" "auth" {
  project = var.project_id

  # Allow users to sign up
  sign_in {
    allow_duplicate_emails = false

    # Enable email/password authentication
    email {
      enabled           = true
      password_required = true
    }

    # Enable phone number authentication
    phone_number {
      enabled = true

      # Test phone numbers for development
      test_phone_numbers = var.environment != "production" ? {
        "+15555550100" = "123456"
        "+15555550101" = "654321"
      } : {}
    }

    # Anonymous sign-in
    anonymous {
      enabled = true
    }
  }

  # Authorized domains for OAuth redirects
  authorized_domains = [
    "localhost",
    var.app_domain,
    "${var.project_id}.firebaseapp.com",
    "${var.project_id}.web.app",
  ]

  # Multi-factor authentication settings
  mfa {
    enabled_providers = ["PHONE_SMS"]

    # MFA state
    state = var.environment == "production" ? "ENABLED" : "DISABLED"

    provider_configs {
      state = "ENABLED"
      totp_provider_config {
        adjacent_intervals = 1
      }
    }
  }

  depends_on = [
    google_project_service.identity_toolkit,
    google_project_service.identity_platform,
  ]
}
```

## Configuring OAuth Identity Providers

Identity Platform supports many OAuth providers. Here is how to configure the most common ones.

```hcl
# Google Sign-In
resource "google_identity_platform_default_supported_idp_config" "google" {
  project   = var.project_id
  idp_id    = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled       = true

  depends_on = [google_identity_platform_config.auth]
}

# GitHub authentication
resource "google_identity_platform_default_supported_idp_config" "github" {
  project   = var.project_id
  idp_id    = "github.com"
  client_id     = var.github_oauth_client_id
  client_secret = var.github_oauth_client_secret
  enabled       = true

  depends_on = [google_identity_platform_config.auth]
}

# Microsoft (Azure AD) authentication
resource "google_identity_platform_default_supported_idp_config" "microsoft" {
  project   = var.project_id
  idp_id    = "microsoft.com"
  client_id     = var.microsoft_oauth_client_id
  client_secret = var.microsoft_oauth_client_secret
  enabled       = true

  depends_on = [google_identity_platform_config.auth]
}

# Apple Sign-In
resource "google_identity_platform_default_supported_idp_config" "apple" {
  project   = var.project_id
  idp_id    = "apple.com"
  client_id     = var.apple_services_id
  client_secret = var.apple_client_secret
  enabled       = true

  depends_on = [google_identity_platform_config.auth]
}
```

## SAML Identity Provider

For enterprise SSO, you can configure SAML providers.

```hcl
# SAML provider for enterprise SSO
resource "google_identity_platform_inbound_saml_config" "corporate_sso" {
  project      = var.project_id
  name         = "saml.corporate-sso"
  display_name = "Corporate SSO"
  enabled      = true

  idp_config {
    idp_entity_id = "https://idp.example.com/saml"
    sign_request  = true
    sso_url       = "https://idp.example.com/saml/sso"

    # IDP certificates for signature verification
    idp_certificates {
      x509_certificate = var.saml_idp_certificate
    }
  }

  sp_config {
    sp_entity_id  = "https://auth.${var.app_domain}"
    callback_uri  = "https://auth.${var.app_domain}/__/auth/handler"
  }

  depends_on = [google_identity_platform_config.auth]
}
```

## OIDC Provider

For OpenID Connect providers not covered by the built-in options.

```hcl
# Custom OIDC provider
resource "google_identity_platform_oauth_idp_config" "custom_oidc" {
  project      = var.project_id
  name         = "oidc.custom-provider"
  display_name = "Custom OIDC Provider"
  enabled      = true

  client_id     = var.oidc_client_id
  client_secret = var.oidc_client_secret
  issuer        = "https://oidc.example.com"

  depends_on = [google_identity_platform_config.auth]
}
```

## Multi-Tenancy

Identity Platform supports multi-tenancy, which lets you isolate user pools for different applications or customers.

```hcl
# Create a tenant for a specific customer or application
resource "google_identity_platform_tenant" "customer_a" {
  project      = var.project_id
  display_name = "Customer A"

  # Allow email/password sign-in for this tenant
  allow_password_signup = true

  # Enable email link sign-in
  enable_email_link_signin = true

  # Disable anonymous auth for this tenant
  disable_auth = false

  depends_on = [google_identity_platform_config.auth]
}

resource "google_identity_platform_tenant" "customer_b" {
  project      = var.project_id
  display_name = "Customer B"

  allow_password_signup    = true
  enable_email_link_signin = false
  disable_auth             = false

  depends_on = [google_identity_platform_config.auth]
}

# Configure a tenant-specific OAuth provider
resource "google_identity_platform_tenant_default_supported_idp_config" "customer_a_google" {
  project  = var.project_id
  tenant   = google_identity_platform_tenant.customer_a.name
  idp_id   = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled       = true
}
```

## Blocking Functions

Blocking functions let you run custom logic during authentication events - for example, to validate email domains or add custom claims.

```hcl
# Cloud Function for blocking authentication
resource "google_cloudfunctions2_function" "auth_blocking" {
  name     = "auth-blocking-function"
  project  = var.project_id
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "beforeSignIn"

    source {
      storage_source {
        bucket = var.functions_bucket
        object = var.blocking_function_source
      }
    }
  }

  service_config {
    max_instance_count = 10
    available_memory   = "256M"
    timeout_seconds    = 10

    environment_variables = {
      ALLOWED_DOMAINS = var.allowed_email_domains
    }
  }
}

# Register the blocking function with Identity Platform
resource "google_identity_platform_config" "auth_with_blocking" {
  project = var.project_id

  blocking_functions {
    triggers {
      event_type   = "beforeSignIn"
      function_uri = google_cloudfunctions2_function.auth_blocking.service_config[0].uri
    }

    triggers {
      event_type   = "beforeCreate"
      function_uri = google_cloudfunctions2_function.auth_blocking.service_config[0].uri
    }
  }

  sign_in {
    email {
      enabled           = true
      password_required = true
    }
  }

  depends_on = [
    google_project_service.identity_toolkit,
  ]
}
```

## Email Templates

Customize the emails sent for password reset, email verification, and email link sign-in.

```hcl
# Note: Email templates are typically configured through the Firebase Console
# or the Identity Platform REST API. Terraform support for email templates
# is limited, but you can configure the SMTP relay.

# For custom SMTP, configure it in the project settings
# This is typically done through the console or REST API
```

## Variables and Secrets

Store OAuth secrets securely using Terraform variables or Secret Manager.

```hcl
# variables.tf
variable "google_oauth_client_id" {
  description = "Google OAuth client ID"
  type        = string
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "github_oauth_client_id" {
  description = "GitHub OAuth client ID"
  type        = string
}

variable "github_oauth_client_secret" {
  description = "GitHub OAuth client secret"
  type        = string
  sensitive   = true
}

variable "app_domain" {
  description = "Application domain"
  type        = string
}

variable "environment" {
  description = "Environment (production, staging, development)"
  type        = string
}
```

## Outputs

```hcl
output "identity_platform_config" {
  description = "Identity Platform configuration"
  value = {
    project_id = var.project_id
    api_key    = google_identity_platform_config.auth.id
  }
}

output "tenant_ids" {
  description = "Map of tenant display names to IDs"
  value = {
    customer_a = google_identity_platform_tenant.customer_a.name
    customer_b = google_identity_platform_tenant.customer_b.name
  }
}
```

## Practical Advice

Identity Platform and Firebase Authentication share the same backend. If you have already configured Firebase Auth in a project, enabling Identity Platform will upgrade it. This is a one-way change and adds enterprise features.

OAuth client secrets should not be stored in your Terraform code or state file in plain text. Use a secrets manager and reference the values through variables.

Test phone numbers are invaluable for automated testing. They bypass real SMS delivery and return a predefined verification code. Only enable them in non-production environments.

Multi-tenancy is useful when you need isolated user pools, but it adds complexity. Start with a single tenant (the default) unless you have a clear multi-tenancy requirement.

Blocking functions add latency to the authentication flow. Keep them fast (under 5 seconds) and resilient. If a blocking function fails, authentication fails.

## Conclusion

Identity Platform gives you a production-ready authentication system without building one from scratch. Terraform lets you define the entire configuration - sign-in methods, OAuth providers, SAML federation, multi-tenancy, and MFA - as code. This means consistent auth configuration across environments, changes tracked in version control, and no more "who changed the OAuth callback URL in production" mysteries.
