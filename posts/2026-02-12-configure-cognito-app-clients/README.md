# How to Configure Cognito App Clients

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Authentication, OAuth

Description: Learn how to create and configure Cognito User Pool app clients with the right authentication flows, token settings, and OAuth scopes for your application.

---

A Cognito app client is the connection point between your application and the User Pool. It defines how your app authenticates users - which flows are allowed, how long tokens last, what OAuth scopes are available, and which identity providers can be used. Getting the app client configuration right is critical for both security and functionality.

## What Is an App Client?

Every application that interacts with your Cognito User Pool needs an app client. The client has:

- A **Client ID** (always public, included in frontend code)
- An optional **Client Secret** (for server-side applications only)
- **Authentication flow** settings
- **Token validity** configurations
- **OAuth** settings

You can have multiple app clients per User Pool - one for your web app, one for your mobile app, one for your backend API, and so on.

## Creating a Basic App Client

Using Terraform:

```hcl
# Basic app client for a web application
resource "aws_cognito_user_pool_client" "web_app" {
  name         = "web-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Don't generate a client secret for browser-based apps
  generate_secret = false

  # Authentication flows
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",       # Secure Remote Password protocol
    "ALLOW_REFRESH_TOKEN_AUTH"   # Token refresh
  ]
}

output "web_client_id" {
  value = aws_cognito_user_pool_client.web_app.id
}
```

For a server-side application:

```hcl
# Server-side app client with a secret
resource "aws_cognito_user_pool_client" "backend" {
  name         = "backend-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # Generate a client secret for server-side apps
  generate_secret = true

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"  # Admin API authentication
  ]
}
```

## Authentication Flows

Each auth flow serves a different purpose. Enable only what you need.

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    # SRP - Secure Remote Password (recommended for most apps)
    # Password never sent to the server
    "ALLOW_USER_SRP_AUTH",

    # Refresh tokens to get new access/ID tokens
    "ALLOW_REFRESH_TOKEN_AUTH",

    # Direct username/password auth (less secure, simpler)
    # Only use for migration or testing
    "ALLOW_USER_PASSWORD_AUTH",

    # Admin auth - server-side only, requires IAM credentials
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",

    # Custom auth - Lambda-based challenge/response
    "ALLOW_CUSTOM_AUTH"
  ]
}
```

For most web and mobile apps, you need just two:

```hcl
explicit_auth_flows = [
  "ALLOW_USER_SRP_AUTH",
  "ALLOW_REFRESH_TOKEN_AUTH"
]
```

## Token Validity Settings

Control how long each token type remains valid:

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app"
  user_pool_id = aws_cognito_user_pool.main.id

  # ID token - contains user claims, used for identity
  id_token_validity = 1  # 1 hour

  # Access token - used for API authorization
  access_token_validity = 1  # 1 hour

  # Refresh token - used to get new ID/access tokens
  refresh_token_validity = 30  # 30 days

  # Specify the units
  token_validity_units {
    id_token     = "hours"
    access_token = "hours"
    refresh_token = "days"
  }
}
```

Token validity ranges:

| Token | Minimum | Maximum | Recommended |
|---|---|---|---|
| Access token | 5 minutes | 24 hours | 1 hour |
| ID token | 5 minutes | 24 hours | 1 hour |
| Refresh token | 1 hour | 3,650 days | 30 days |

Shorter access tokens are more secure. When they expire, the app uses the refresh token to get new ones silently.

## OAuth Configuration

For hosted UI and social/enterprise sign-in, configure OAuth settings:

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app"
  user_pool_id = aws_cognito_user_pool.main.id

  # Which identity providers can be used
  supported_identity_providers = [
    "COGNITO",          # Username/password via Cognito
    "Google",           # Social sign-in
    "Okta"              # Enterprise SAML/OIDC
  ]

  # OAuth grant types
  allowed_oauth_flows = [
    "code"              # Authorization code flow (recommended)
    # "implicit"        # Legacy - don't use for new apps
  ]

  # Required for OAuth flows
  allowed_oauth_flows_user_pool_client = true

  # OAuth scopes
  allowed_oauth_scopes = [
    "openid",           # Required for OIDC
    "email",            # Access to email claim
    "profile",          # Access to profile claims
    "aws.cognito.signin.user.admin"  # Access to user attributes API
  ]

  # Where to redirect after sign-in
  callback_urls = [
    "https://myapp.com/auth/callback",
    "http://localhost:3000/auth/callback"  # Dev environment
  ]

  # Where to redirect after sign-out
  logout_urls = [
    "https://myapp.com/",
    "http://localhost:3000/"
  ]
}
```

## Client Secret Considerations

The client secret setting is an important security decision:

**No secret (generate_secret = false):**
- For browser-based SPAs, mobile apps, and any public client
- The client ID is embedded in frontend code where users can see it
- Security relies on redirect URI validation

**With secret (generate_secret = true):**
- For server-side applications where the secret stays on the server
- Required for some OAuth flows
- Never embed in frontend code or mobile apps

```hcl
# Frontend app - no secret
resource "aws_cognito_user_pool_client" "frontend" {
  name            = "frontend"
  user_pool_id    = aws_cognito_user_pool.main.id
  generate_secret = false
}

# Backend service - with secret
resource "aws_cognito_user_pool_client" "backend" {
  name            = "backend"
  user_pool_id    = aws_cognito_user_pool.main.id
  generate_secret = true
}
```

## Read/Write Attribute Permissions

Control which user attributes each app client can read and write:

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app"
  user_pool_id = aws_cognito_user_pool.main.id

  # Attributes the app can read
  read_attributes = [
    "email",
    "email_verified",
    "name",
    "given_name",
    "family_name",
    "custom:organization"
  ]

  # Attributes the app can write
  write_attributes = [
    "name",
    "given_name",
    "family_name",
    "custom:organization"
  ]

  # Note: email and email_verified are typically read-only
  # to prevent users from bypassing verification
}
```

## Machine-to-Machine App Clients

For service-to-service authentication, use the client credentials flow:

```hcl
# Resource server defines the API scopes
resource "aws_cognito_resource_server" "api" {
  identifier   = "https://api.myapp.com"
  name         = "MyApp API"
  user_pool_id = aws_cognito_user_pool.main.id

  scope {
    scope_name        = "read"
    scope_description = "Read access"
  }

  scope {
    scope_name        = "write"
    scope_description = "Write access"
  }
}

# M2M client using client credentials
resource "aws_cognito_user_pool_client" "m2m" {
  name         = "service-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret = true

  allowed_oauth_flows = ["client_credentials"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes = [
    "https://api.myapp.com/read",
    "https://api.myapp.com/write"
  ]

  supported_identity_providers = []  # No user sign-in needed

  depends_on = [aws_cognito_resource_server.api]
}
```

Getting a token for M2M:

```javascript
// m2m-auth.js - Client credentials flow
async function getServiceToken() {
  const clientId = 'your-m2m-client-id';
  const clientSecret = 'your-m2m-client-secret';
  const domain = 'your-domain.auth.us-east-1.amazoncognito.com';

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`https://${domain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.myapp.com/read https://api.myapp.com/write'
    })
  });

  const tokens = await response.json();
  return tokens.access_token;
}
```

## Prevent User Existence Errors

By default, Cognito returns different error messages for "user not found" vs "wrong password," which lets attackers enumerate valid usernames. Disable this:

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app"
  user_pool_id = aws_cognito_user_pool.main.id

  # Return generic errors - prevents username enumeration
  prevent_user_existence_errors = "ENABLED"
}
```

For more on customizing the sign-in experience, check out [customizing the Cognito hosted UI](https://oneuptime.com/blog/post/customize-cognito-hosted-ui/view).

## Summary

App client configuration controls the security boundary between your application and Cognito. The key decisions are: no client secret for frontend apps, SRP auth for password-based sign-in, short-lived access tokens with longer refresh tokens, and minimal attribute permissions. Create separate app clients for different application types rather than sharing one client across your frontend, backend, and services.
