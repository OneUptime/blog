# How to Configure Okta Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Okta, Identity, SSO, Infrastructure as Code

Description: A practical guide to configuring the Okta provider in Terraform for managing applications, users, groups, policies, and SSO configurations as code.

---

Okta is one of the most popular identity and access management platforms, used by thousands of organizations for single sign-on, multi-factor authentication, and user lifecycle management. As your Okta configuration grows - more applications, more groups, more policies - managing it through the admin console becomes error-prone and hard to audit. The Okta Terraform provider solves this by letting you define your identity infrastructure as code.

This guide covers setting up the Okta provider, authenticating with API tokens, and managing the most common Okta resources including applications, users, groups, and policies.

## Prerequisites

- Terraform 1.0 or later
- An Okta organization (developer or production)
- An API token with Super Admin permissions (or a service app with OAuth)

## Getting Your API Token

1. Log in to the Okta Admin Console
2. Go to Security > API > Tokens
3. Click Create Token
4. Give it a descriptive name (e.g., "Terraform")
5. Copy the token (it is only shown once)

## Declaring the Provider

```hcl
# versions.tf - Declare the Okta provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    okta = {
      source  = "okta/okta"
      version = "~> 4.8"
    }
  }
}
```

## Provider Configuration

### API Token Authentication

```hcl
# provider.tf - Configure with API token
provider "okta" {
  org_name  = var.okta_org_name
  base_url  = var.okta_base_url  # "okta.com" or "oktapreview.com"
  api_token = var.okta_api_token
}

variable "okta_org_name" {
  type        = string
  description = "Okta organization name (the subdomain)"
}

variable "okta_base_url" {
  type        = string
  default     = "okta.com"
  description = "Okta base URL (okta.com for production, oktapreview.com for preview)"
}

variable "okta_api_token" {
  type        = string
  sensitive   = true
  description = "Okta API token"
}
```

### OAuth 2.0 Service App Authentication

For production automation, OAuth-based authentication is preferred over API tokens.

```hcl
# OAuth 2.0 service app authentication
provider "okta" {
  org_name      = var.okta_org_name
  base_url      = "okta.com"
  client_id     = var.okta_client_id
  private_key   = var.okta_private_key
  scopes        = ["okta.apps.manage", "okta.groups.manage", "okta.users.manage"]
}
```

### Environment Variables

```bash
# Set Okta credentials via environment variables
export OKTA_ORG_NAME="your-org"
export OKTA_BASE_URL="okta.com"
export OKTA_API_TOKEN="your-api-token"
```

```hcl
# Provider picks up credentials from environment variables
provider "okta" {}
```

## Managing Groups

```hcl
# Create groups
resource "okta_group" "engineering" {
  name        = "Engineering"
  description = "Engineering department"
}

resource "okta_group" "devops" {
  name        = "DevOps"
  description = "DevOps team"
}

resource "okta_group" "managers" {
  name        = "Managers"
  description = "People managers"
}

# Create a group rule for automatic membership
resource "okta_group_rule" "engineering_rule" {
  name              = "Auto-assign Engineering"
  group_assignments = [okta_group.engineering.id]
  expression_type   = "urn:okta:expression:1.0"
  expression_value  = "user.department==\"Engineering\""
  status            = "ACTIVE"
}
```

## Managing Users

```hcl
# Create a user
resource "okta_user" "developer" {
  first_name = "Jane"
  last_name  = "Smith"
  login      = "jane.smith@example.com"
  email      = "jane.smith@example.com"

  department = "Engineering"
  title      = "Senior Developer"

  # Custom profile attributes
  custom_profile_attributes = jsonencode({
    team       = "Platform"
    start_date = "2025-01-15"
  })
}

# Add user to groups
resource "okta_group_memberships" "developer_groups" {
  user_id = okta_user.developer.id
  groups = [
    okta_group.engineering.id,
    okta_group.devops.id,
  ]
}
```

## Managing Applications

### SAML Application

```hcl
# Create a SAML application
resource "okta_app_saml" "internal_app" {
  label                    = "Internal Dashboard"
  sso_url                  = "https://dashboard.example.com/saml/acs"
  recipient                = "https://dashboard.example.com/saml/acs"
  destination              = "https://dashboard.example.com/saml/acs"
  audience                 = "https://dashboard.example.com"
  subject_name_id_template = "$${user.userName}"
  subject_name_id_format   = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
  response_signed          = true
  signature_algorithm      = "RSA_SHA256"
  digest_algorithm         = "SHA256"
  authn_context_class_ref  = "urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport"

  attribute_statements {
    type   = "EXPRESSION"
    name   = "email"
    values = ["user.email"]
  }

  attribute_statements {
    type   = "EXPRESSION"
    name   = "firstName"
    values = ["user.firstName"]
  }

  attribute_statements {
    type   = "EXPRESSION"
    name   = "lastName"
    values = ["user.lastName"]
  }
}

# Assign a group to the SAML app
resource "okta_app_group_assignments" "internal_app_groups" {
  app_id = okta_app_saml.internal_app.id

  group {
    id = okta_group.engineering.id
  }

  group {
    id = okta_group.managers.id
  }
}
```

### OIDC Application

```hcl
# Create an OIDC web application
resource "okta_app_oauth" "web_app" {
  label          = "My Web Application"
  type           = "web"
  grant_types    = ["authorization_code", "refresh_token"]
  response_types = ["code"]

  redirect_uris = [
    "https://app.example.com/auth/callback",
    "http://localhost:3000/auth/callback",
  ]

  post_logout_redirect_uris = [
    "https://app.example.com",
    "http://localhost:3000",
  ]

  token_endpoint_auth_method = "client_secret_post"

  lifecycle {
    ignore_changes = [groups]
  }
}

# Output the client credentials
output "web_app_client_id" {
  value = okta_app_oauth.web_app.client_id
}

output "web_app_client_secret" {
  value     = okta_app_oauth.web_app.client_secret
  sensitive = true
}
```

### SPA Application

```hcl
# Create an OIDC SPA
resource "okta_app_oauth" "spa" {
  label          = "React Frontend"
  type           = "browser"
  grant_types    = ["authorization_code"]
  response_types = ["code"]

  redirect_uris = [
    "https://app.example.com/callback",
    "http://localhost:3000/callback",
  ]

  post_logout_redirect_uris = [
    "https://app.example.com",
  ]

  # SPAs use PKCE
  token_endpoint_auth_method = "none"
  pkce_required              = true
}
```

### Bookmark Application

```hcl
# Create a bookmark app (for SSO portal links)
resource "okta_app_bookmark" "docs" {
  label = "Documentation Portal"
  url   = "https://docs.example.com"
}
```

## Authorization Servers

```hcl
# Create a custom authorization server
resource "okta_auth_server" "api" {
  name        = "API Authorization Server"
  description = "Custom authorization server for our APIs"
  audiences   = ["https://api.example.com"]
  status      = "ACTIVE"
}

# Create scopes
resource "okta_auth_server_scope" "read" {
  auth_server_id   = okta_auth_server.api.id
  name             = "read:data"
  description      = "Read access to data"
  consent          = "IMPLICIT"
  metadata_publish = "ALL_CLIENTS"
}

resource "okta_auth_server_scope" "write" {
  auth_server_id   = okta_auth_server.api.id
  name             = "write:data"
  description      = "Write access to data"
  consent          = "REQUIRED"
  metadata_publish = "ALL_CLIENTS"
}

# Create a claim
resource "okta_auth_server_claim" "groups" {
  auth_server_id = okta_auth_server.api.id
  name           = "groups"
  value_type     = "GROUPS"
  group_filter_type = "REGEX"
  value          = ".*"
  claim_type     = "IDENTITY"
  scopes         = [okta_auth_server_scope.read.name]
}

# Create an access policy
resource "okta_auth_server_policy" "default" {
  auth_server_id   = okta_auth_server.api.id
  name             = "Default Policy"
  description      = "Default access policy"
  priority         = 1
  client_whitelist = ["ALL_CLIENTS"]
  status           = "ACTIVE"
}

# Create a policy rule
resource "okta_auth_server_policy_rule" "default" {
  auth_server_id = okta_auth_server.api.id
  policy_id      = okta_auth_server_policy.default.id
  name           = "Default Rule"
  priority       = 1
  status         = "ACTIVE"

  grant_type_whitelist = ["authorization_code", "client_credentials"]
  scope_whitelist      = ["*"]

  access_token_lifetime_minutes  = 60
  refresh_token_lifetime_minutes = 10080  # 7 days
}
```

## MFA Policies

```hcl
# Create a sign-on policy
resource "okta_policy_signon" "mfa_required" {
  name        = "MFA Required"
  description = "Require MFA for all users"
  priority    = 1
  status      = "ACTIVE"

  groups_included = [okta_group.engineering.id]
}

# Create a sign-on policy rule
resource "okta_policy_rule_signon" "mfa_rule" {
  policy_id          = okta_policy_signon.mfa_required.id
  name               = "Require MFA"
  priority           = 1
  status             = "ACTIVE"
  access             = "ALLOW"
  mfa_required       = true
  mfa_remember_device = true
  mfa_lifetime       = 720  # 30 days

  factor_sequence {
    primary_criteria_factor_type = "token:software:totp"
    primary_criteria_provider    = "OKTA"
  }
}
```

## Trusted Origins

```hcl
# Add trusted origins for CORS and redirect
resource "okta_trusted_origin" "app" {
  name   = "Application Origin"
  origin = "https://app.example.com"
  scopes = ["CORS", "REDIRECT"]
}

resource "okta_trusted_origin" "dev" {
  name   = "Development Origin"
  origin = "http://localhost:3000"
  scopes = ["CORS", "REDIRECT"]
}
```

## Data Sources

```hcl
# Look up the default authorization server
data "okta_auth_server" "default" {
  name = "default"
}

# Look up a group by name
data "okta_group" "everyone" {
  name = "Everyone"
}

# Look up a user
data "okta_user" "admin" {
  search {
    name  = "profile.email"
    value = "admin@example.com"
  }
}
```

## Best Practices

1. Use OAuth-based authentication (service apps) instead of API tokens for production. API tokens expire and are tied to a user account.

2. Use group rules for automatic group membership instead of managing individual memberships.

3. Create custom authorization servers for your APIs instead of using the default "org" server.

4. Always assign applications to groups rather than individual users. This scales better as your organization grows.

5. Use `lifecycle { ignore_changes }` on attributes that might be modified outside of Terraform to prevent drift.

6. Separate your Okta configuration by tenant (dev, staging, production) using different Terraform workspaces or state files.

## Wrapping Up

The Okta Terraform provider brings infrastructure-as-code to your identity platform. By defining applications, groups, policies, and authentication flows in Terraform, you get version control, code review, and consistent deployments across environments. This is critical for identity infrastructure where security and audit compliance matter.

For monitoring your SSO login flows and detecting authentication failures, [OneUptime](https://oneuptime.com) provides synthetic monitoring and alerting that can catch identity provider issues early.
