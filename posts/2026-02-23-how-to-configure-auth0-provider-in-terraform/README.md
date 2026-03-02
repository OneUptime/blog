# How to Configure Auth0 Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Auth0, Authentication, Identity, Infrastructure as Code

Description: Learn how to configure the Auth0 provider in Terraform to manage applications, connections, roles, and authentication settings as code.

---

Auth0 is a widely used identity platform that handles authentication, authorization, and user management for applications. As your organization grows and you add more applications, managing Auth0 through the dashboard becomes unsustainable. The Auth0 Terraform provider lets you define your entire identity configuration as code - applications, connections, rules, roles, and more.

This approach brings several benefits: changes go through code review, configurations are consistent across environments, and you have a clear audit trail of who changed what and when.

## Prerequisites

- Terraform 1.0 or later
- An Auth0 tenant
- A Machine-to-Machine application in Auth0 with Management API permissions

## Setting Up API Credentials

To use the Terraform provider, you need a Machine-to-Machine (M2M) application with access to the Auth0 Management API.

1. Log in to the Auth0 Dashboard
2. Go to Applications > Applications
3. Click Create Application
4. Select Machine to Machine Applications
5. Authorize it for the Auth0 Management API
6. Select all scopes you need (for full management, select all)
7. Note the Domain, Client ID, and Client Secret

## Declaring the Provider

```hcl
# versions.tf - Declare the Auth0 provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    auth0 = {
      source  = "auth0/auth0"
      version = "~> 1.2"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Configure Auth0
provider "auth0" {
  domain        = var.auth0_domain
  client_id     = var.auth0_client_id
  client_secret = var.auth0_client_secret
}

variable "auth0_domain" {
  type        = string
  description = "Auth0 tenant domain (e.g., yourapp.us.auth0.com)"
}

variable "auth0_client_id" {
  type        = string
  description = "Auth0 M2M application client ID"
}

variable "auth0_client_secret" {
  type        = string
  sensitive   = true
  description = "Auth0 M2M application client secret"
}
```

### Environment Variables

```bash
# Set Auth0 credentials via environment variables
export AUTH0_DOMAIN="yourapp.us.auth0.com"
export AUTH0_CLIENT_ID="your-client-id"
export AUTH0_CLIENT_SECRET="your-client-secret"
```

```hcl
# Provider picks up credentials from environment variables
provider "auth0" {}
```

## Managing Applications (Clients)

### Single Page Application

```hcl
# Create a SPA (Single Page Application)
resource "auth0_client" "spa" {
  name        = "My React App"
  description = "React frontend application"
  app_type    = "spa"

  callbacks           = ["https://app.example.com/callback", "http://localhost:3000/callback"]
  allowed_logout_urls = ["https://app.example.com", "http://localhost:3000"]
  web_origins         = ["https://app.example.com", "http://localhost:3000"]

  # Token settings
  token_endpoint_auth_method = "none"  # SPAs use PKCE, not client secrets

  jwt_configuration {
    alg = "RS256"
  }

  grant_types = [
    "authorization_code",
    "implicit",
    "refresh_token",
  ]

  # Refresh token rotation
  refresh_token {
    rotation_type   = "rotating"
    expiration_type = "expiring"
    idle_token_lifetime = 1296000  # 15 days
    token_lifetime      = 2592000  # 30 days
  }
}
```

### Regular Web Application

```hcl
# Create a traditional web application
resource "auth0_client" "web_app" {
  name     = "My Web App"
  app_type = "regular_web"

  callbacks           = ["https://api.example.com/auth/callback"]
  allowed_logout_urls = ["https://api.example.com"]

  token_endpoint_auth_method = "client_secret_post"

  jwt_configuration {
    alg                 = "RS256"
    lifetime_in_seconds = 36000
  }

  grant_types = [
    "authorization_code",
    "client_credentials",
    "refresh_token",
  ]
}
```

### Machine-to-Machine Application

```hcl
# Create an M2M application for service-to-service auth
resource "auth0_client" "api_service" {
  name     = "Backend API Service"
  app_type = "non_interactive"

  token_endpoint_auth_method = "client_secret_post"

  grant_types = ["client_credentials"]
}

# Grant the M2M app access to an API
resource "auth0_client_grant" "api_service_grant" {
  client_id = auth0_client.api_service.id
  audience  = auth0_resource_server.api.identifier
  scopes    = ["read:data", "write:data"]
}
```

## API Configuration (Resource Servers)

```hcl
# Define an API (Resource Server)
resource "auth0_resource_server" "api" {
  name       = "My API"
  identifier = "https://api.example.com"

  signing_alg = "RS256"

  # Enable RBAC
  enforce_policies                = true
  token_dialect                   = "access_token_authz"
  skip_consent_for_verifiable_first_party_clients = true

  # Token lifetime
  token_lifetime         = 86400   # 24 hours
  token_lifetime_for_web = 7200    # 2 hours for web

  # Define scopes
  scopes {
    value       = "read:data"
    description = "Read data"
  }

  scopes {
    value       = "write:data"
    description = "Write data"
  }

  scopes {
    value       = "delete:data"
    description = "Delete data"
  }

  scopes {
    value       = "admin"
    description = "Full admin access"
  }
}
```

## Connections

### Database Connection

```hcl
# Create a database connection for username/password login
resource "auth0_connection" "database" {
  name     = "Username-Password-Authentication"
  strategy = "auth0"

  options {
    brute_force_protection = true
    disable_signup         = false

    password_policy = "good"

    password_complexity_options {
      min_length = 10
    }

    password_no_personal_info {
      enable = true
    }

    mfa {
      active                 = true
      return_enroll_settings = true
    }
  }
}

# Enable the connection for specific clients
resource "auth0_connection_clients" "database_clients" {
  connection_id   = auth0_connection.database.id
  enabled_clients = [
    auth0_client.spa.id,
    auth0_client.web_app.id,
  ]
}
```

### Google Social Connection

```hcl
# Create a Google social connection
resource "auth0_connection" "google" {
  name     = "google-oauth2"
  strategy = "google-oauth2"

  options {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret

    allowed_audiences = ["https://api.example.com"]

    scopes = ["email", "profile"]
  }
}

resource "auth0_connection_clients" "google_clients" {
  connection_id   = auth0_connection.google.id
  enabled_clients = [auth0_client.spa.id]
}
```

### Enterprise Connection (SAML)

```hcl
# Create a SAML enterprise connection
resource "auth0_connection" "corporate_saml" {
  name           = "Corporate-SSO"
  strategy       = "samlp"
  display_name   = "Corporate SSO"

  options {
    sign_in_endpoint = "https://idp.example.com/sso/saml"
    signing_cert     = file("${path.module}/certs/idp-cert.pem")

    request_template = <<-EOT
      <samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
          AssertionConsumerServiceURL="@@AssertionConsumerServiceURL@@"
          Destination="@@Destination@@"
          ID="@@ID@@"
          IssueInstant="@@IssueInstant@@"
          ProtocolBinding="@@ProtocolBinding@@"
          Version="2.0">
      </samlp:AuthnRequest>
    EOT

    fields_map = jsonencode({
      email      = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      given_name = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"
      family_name = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"
    })
  }
}
```

## Roles and Permissions

```hcl
# Create roles
resource "auth0_role" "admin" {
  name        = "Admin"
  description = "Full administrative access"
}

resource "auth0_role" "editor" {
  name        = "Editor"
  description = "Can read and write data"
}

resource "auth0_role" "viewer" {
  name        = "Viewer"
  description = "Read-only access"
}

# Assign permissions to roles
resource "auth0_role_permissions" "admin_permissions" {
  role_id = auth0_role.admin.id

  permissions {
    resource_server_identifier = auth0_resource_server.api.identifier
    name                       = "read:data"
  }

  permissions {
    resource_server_identifier = auth0_resource_server.api.identifier
    name                       = "write:data"
  }

  permissions {
    resource_server_identifier = auth0_resource_server.api.identifier
    name                       = "delete:data"
  }

  permissions {
    resource_server_identifier = auth0_resource_server.api.identifier
    name                       = "admin"
  }
}

resource "auth0_role_permissions" "editor_permissions" {
  role_id = auth0_role.editor.id

  permissions {
    resource_server_identifier = auth0_resource_server.api.identifier
    name                       = "read:data"
  }

  permissions {
    resource_server_identifier = auth0_resource_server.api.identifier
    name                       = "write:data"
  }
}
```

## Actions (Post-Login)

```hcl
# Create a post-login action
resource "auth0_action" "add_roles_to_token" {
  name    = "Add Roles to Token"
  runtime = "node18"
  deploy  = true

  supported_triggers {
    id      = "post-login"
    version = "v3"
  }

  code = <<-EOT
    exports.onExecutePostLogin = async (event, api) => {
      const namespace = 'https://api.example.com';
      if (event.authorization) {
        api.idToken.setCustomClaim(namespace + '/roles', event.authorization.roles);
        api.accessToken.setCustomClaim(namespace + '/roles', event.authorization.roles);
      }
    };
  EOT
}

# Attach the action to the login flow
resource "auth0_trigger_actions" "post_login" {
  trigger = "post-login"

  actions {
    id           = auth0_action.add_roles_to_token.id
    display_name = auth0_action.add_roles_to_token.name
  }
}
```

## Tenant Settings

```hcl
# Configure tenant-level settings
resource "auth0_tenant" "config" {
  friendly_name = "My Application"
  support_email = "support@example.com"
  support_url   = "https://support.example.com"

  default_directory = auth0_connection.database.name

  session_lifetime = 168  # 7 days in hours
  idle_session_lifetime = 72  # 3 days in hours

  flags {
    enable_client_connections  = true
    enable_custom_domain_in_emails = false
  }
}
```

## Custom Domains

```hcl
# Set up a custom domain
resource "auth0_custom_domain" "main" {
  domain = "auth.example.com"
  type   = "auth0_managed_certs"
}
```

## Best Practices

1. Use a dedicated M2M application for Terraform with only the Management API scopes it needs.

2. Separate your Auth0 configuration by environment. Use Terraform workspaces or separate state files for dev, staging, and production tenants.

3. Use the `auth0_connection_clients` resource to explicitly control which applications can use each connection.

4. Enable RBAC on your APIs and manage permissions through Terraform for a complete audit trail.

5. Use Actions instead of Rules or Hooks. Actions are the modern replacement and are fully supported by the provider.

6. Store client secrets in a secrets manager rather than in Terraform state. Consider using Vault or AWS Secrets Manager.

## Wrapping Up

The Auth0 Terraform provider gives you full control over your identity platform configuration. By managing applications, connections, roles, and authentication flows as code, you get consistency across environments and a clear audit trail for security reviews. This is especially important for identity infrastructure, where misconfigurations can have serious security implications.

For monitoring your authentication flows and detecting issues with login endpoints, [OneUptime](https://oneuptime.com) provides synthetic monitoring and alerting that can catch authentication problems before your users do.
