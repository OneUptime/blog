# How to Configure AWS Cognito App Clients with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Cognito, OAuth2, Authentication, Infrastructure as Code

Description: Learn how to configure AWS Cognito User Pool App Clients for web, mobile, and machine-to-machine applications using OpenTofu.

## Introduction

App Clients define how an application authenticates with a Cognito User Pool. Each client has its own credentials, OAuth flows, allowed scopes, and callback URLs. To use Cognito OAuth 2.0 endpoints, you must also configure a user pool domain. OpenTofu lets you manage multiple app clients - for web frontends, mobile apps, and backend services - as code.

## Web Application Client

```hcl
resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.app_name}-web-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # OAuth 2.0 flows for web apps
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]  # authorization code flow
  allowed_oauth_scopes = [
    "openid",
    "email",
    "profile"
  ]

  callback_urls = ["https://app.example.com/callback"]
  logout_urls   = ["https://app.example.com/logout"]

  # Do not generate a client secret for public clients (SPAs, mobile)
  generate_secret = false

  # Token validity
  access_token_validity  = 1    # hours
  id_token_validity      = 1    # hours
  refresh_token_validity = 30   # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  # Allow SRP and refresh-token auth, but not USER_PASSWORD_AUTH
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}
```

## Backend / Machine-to-Machine Client

Server-side apps that use the client credentials flow need a client secret and a user pool domain.

```hcl
resource "aws_cognito_user_pool_client" "backend" {
  name         = "${var.app_name}-backend-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true  # server-side clients can store secrets

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["client_credentials"]
  allowed_oauth_scopes                 = aws_cognito_resource_server.api.scope_identifiers
}
```

Resource Server for Custom Scopes

```hcl
resource "aws_cognito_resource_server" "api" {
  identifier   = "https://api.example.com"
  name         = "Example API"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access to the API"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access to the API"
  }
}
```

## Mobile App Client

```hcl
resource "aws_cognito_user_pool_client" "mobile" {
  name         = "${var.app_name}-mobile-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = false

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  # Deep link callback for mobile apps
  callback_urls = ["myapp://callback"]
  logout_urls   = ["myapp://logout"]

  # Public mobile apps should use PKCE with the authorization code flow
  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]
}
```

## Outputs

```hcl
output "web_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "backend_client_secret" {
  value     = aws_cognito_user_pool_client.backend.client_secret
  sensitive = true
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Cognito App Clients are the bridge between your applications and the User Pool. OpenTofu lets you configure separate clients for web, mobile, and backend apps with appropriate OAuth flows, token validity, and scope restrictions - all version controlled and reproducible.
