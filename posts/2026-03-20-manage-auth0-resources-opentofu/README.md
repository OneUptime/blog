# How to Manage Auth0 Resources with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Auth0, Identity, Authentication, Authorization

Description: Learn how to manage Auth0 applications, APIs, connections, rules, and tenant settings using OpenTofu for reproducible identity management across environments.

## Introduction

The Auth0 provider for OpenTofu manages the full lifecycle of Auth0 tenant resources: applications, APIs, database connections, social connections, actions, and tenant configuration. This enables treating your authentication infrastructure as code with the same version control and review processes as the rest of your stack.

## Provider Configuration

```hcl
terraform {
  required_providers {
    auth0 = {
      source  = "auth0/auth0"
      version = "~> 1.0"
    }
  }
}

provider "auth0" {
  domain        = var.auth0_domain         # e.g., "myapp.auth0.com"
  client_id     = var.auth0_client_id
  client_secret = var.auth0_client_secret
}
```

## Creating a Single-Page Application

```hcl
resource "auth0_client" "spa" {
  name            = "My SPA Application"
  description     = "Single-page React application"
  app_type        = "spa"
  oidc_conformant = true

  callbacks           = ["https://app.example.com/callback"]
  allowed_logout_urls = ["https://app.example.com"]
  web_origins         = ["https://app.example.com"]
  allowed_origins     = ["https://app.example.com"]

  jwt_configuration {
    alg = "RS256"
  }

  refresh_token {
    rotation_type   = "rotating"
    expiration_type = "expiring"
    token_lifetime  = 2592000  # 30 days
    leeway          = 0
    infinite_idle_token_lifetime = false
    idle_token_lifetime          = 1296000  # 15 days
  }
}
```

## Creating a Machine-to-Machine Application

```hcl
resource "auth0_client" "api_client" {
  name     = "Backend API Client"
  app_type = "non_interactive"

  jwt_configuration {
    alg = "RS256"
  }
}

# Register an API

resource "auth0_resource_server" "api" {
  name        = "My API"
  identifier  = "https://api.example.com"
  signing_alg = "RS256"

  token_lifetime                = 86400
  token_lifetime_for_web        = 7200
  skip_consent_for_verifiable_first_party_clients = true
}

# Define API scopes
resource "auth0_resource_server_scopes" "api_scopes" {
  resource_server_identifier = auth0_resource_server.api.identifier

  scopes {
    name        = "read:users"
    description = "Read user profiles"
  }
  scopes {
    name        = "write:users"
    description = "Create and update users"
  }
}

# Grant M2M client access to the API
resource "auth0_client_grant" "api_grant" {
  depends_on = [auth0_resource_server_scopes.api_scopes]

  client_id = auth0_client.api_client.id
  audience  = auth0_resource_server.api.identifier
  scopes    = ["read:users", "write:users"]
}
```

## Database Connection

```hcl
resource "auth0_connection" "database" {
  name     = "Username-Password-Authentication"
  strategy = "auth0"

  options {
    disable_signup          = false
    requires_username       = false
    password_policy         = "good"
    brute_force_protection  = true

    password_complexity_options {
      min_length = 12
    }

    password_dictionary {
      enable     = true
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
```

## Social Connection (Google)

```hcl
resource "auth0_connection" "google" {
  name     = "google-oauth2"
  strategy = "google-oauth2"

  options {
    client_id     = var.google_client_id
    client_secret = var.google_client_secret
    scopes        = ["email", "profile"]
  }
}

# Enable connection for the SPA
resource "auth0_connection_clients" "google_spa" {
  connection_id  = auth0_connection.google.id
  enabled_clients = [auth0_client.spa.id]
}
```

## Actions (Post-Login)

```hcl
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
      const namespace = 'https://myapp.example.com';
      const roles = event.authorization?.roles ?? [];
      api.idToken.setCustomClaim(`${namespace}/roles`, roles);
      api.accessToken.setCustomClaim(`${namespace}/roles`, roles);
    };
  EOT
}

resource "auth0_trigger_action" "add_roles_to_token_binding" {
  trigger   = "post-login"
  action_id = auth0_action.add_roles_to_token.id
}
```

## Conclusion

Auth0 managed with OpenTofu enables consistent authentication configuration across dev, staging, and production tenants. Use separate tenant per environment and use OpenTofu workspaces or separate configurations to deploy the same auth configuration to each. Actions can be version-controlled and deployed through the same CI/CD pipeline as your application code, ensuring auth logic changes are reviewed and audited.
