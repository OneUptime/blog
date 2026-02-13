# How to Set Up Cognito OIDC Federation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, OIDC, Authentication, SSO

Description: Configure OpenID Connect federation in Amazon Cognito to integrate with any OIDC-compliant identity provider for single sign-on.

---

While SAML handles most enterprise SSO scenarios, some identity providers work better with OpenID Connect (OIDC). Cognito supports OIDC federation natively, letting you connect to any standards-compliant OIDC provider - Auth0, Ping Identity, Keycloak, or your own custom IdP.

OIDC is newer and simpler than SAML. It's built on top of OAuth 2.0, uses JSON instead of XML, and is generally easier to debug when things go wrong.

## OIDC vs SAML

Both protocols accomplish the same goal - federated authentication. The differences matter for implementation:

- **SAML**: XML-based, mature, widely supported in enterprise IdPs, more complex
- **OIDC**: JSON-based, built on OAuth 2.0, simpler, better for modern applications

If your identity provider supports both, OIDC is usually the easier integration.

## Prerequisites

To set up OIDC federation in Cognito, you need from your identity provider:

- **Client ID**: The application identifier registered with the IdP
- **Client Secret**: The secret for your application
- **Issuer URL**: The OIDC discovery endpoint (e.g., `https://idp.example.com`)
- **Scopes**: What user information to request (typically `openid email profile`)

The IdP's discovery document at `{issuer}/.well-known/openid-configuration` should contain the authorization, token, and userinfo endpoints.

## Step 1: Register Your App with the IdP

In your identity provider, create a new application/client with these settings:

- **Application type**: Web application
- **Redirect URI**: `https://your-domain.auth.us-east-1.amazoncognito.com/oauth2/idpresponse`
- **Scopes**: openid, email, profile

For example, in Auth0:

1. Create a new Regular Web Application
2. Set the callback URL to your Cognito idpresponse endpoint
3. Note the Domain, Client ID, and Client Secret

## Step 2: Configure the OIDC Provider in Cognito

Using Terraform:

```hcl
# OIDC identity provider
resource "aws_cognito_identity_provider" "oidc" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "MyOIDCProvider"
  provider_type = "OIDC"

  provider_details = {
    # Required settings
    client_id              = "your-oidc-client-id"
    client_secret          = "your-oidc-client-secret"
    oidc_issuer            = "https://idp.example.com"
    authorize_scopes       = "openid email profile"

    # How to send credentials when exchanging the code
    token_request_method   = "POST"

    # These are auto-discovered from the issuer, but can be set explicitly
    attributes_request_method = "GET"
    authorize_url          = "https://idp.example.com/authorize"
    token_url              = "https://idp.example.com/oauth/token"
    attributes_url         = "https://idp.example.com/userinfo"
    jwks_uri               = "https://idp.example.com/.well-known/jwks.json"
  }

  # Map IdP attributes to Cognito attributes
  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }

  idp_identifiers = ["myoidc"]
}
```

Via the AWS CLI:

```bash
# Create the OIDC identity provider
aws cognito-idp create-identity-provider \
  --user-pool-id us-east-1_XXXXXXXXX \
  --provider-name MyOIDCProvider \
  --provider-type OIDC \
  --provider-details '{
    "client_id": "your-oidc-client-id",
    "client_secret": "your-oidc-client-secret",
    "oidc_issuer": "https://idp.example.com",
    "authorize_scopes": "openid email profile",
    "token_request_method": "POST",
    "attributes_request_method": "GET"
  }' \
  --attribute-mapping '{
    "email": "email",
    "username": "sub",
    "name": "name"
  }'
```

## Step 3: Update the App Client

```hcl
resource "aws_cognito_user_pool_client" "app" {
  name         = "my-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  supported_identity_providers = ["MyOIDCProvider", "COGNITO"]

  allowed_oauth_flows                  = ["code"]
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  callback_urls = [
    "https://myapp.com/auth/callback",
    "http://localhost:3000/auth/callback"
  ]

  logout_urls = [
    "https://myapp.com/",
    "http://localhost:3000/"
  ]
}
```

## Step 4: Implement Sign-In

```javascript
// oidc-sign-in.js
import { signInWithRedirect } from 'aws-amplify/auth';

async function signInWithOIDC() {
  await signInWithRedirect({
    provider: {
      custom: 'MyOIDCProvider'
    }
  });
}
```

Direct URL construction:

```javascript
function getOIDCSignInUrl() {
  const domain = 'your-domain.auth.us-east-1.amazoncognito.com';
  const clientId = 'your-cognito-app-client-id';
  const redirectUri = encodeURIComponent('https://myapp.com/auth/callback');

  return `https://${domain}/oauth2/authorize?` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `scope=openid+email+profile&` +
    `redirect_uri=${redirectUri}&` +
    `identity_provider=MyOIDCProvider`;
}
```

## Example: Keycloak OIDC Integration

Keycloak is a popular open-source identity provider. Here's the specific configuration:

```hcl
# Keycloak OIDC provider
resource "aws_cognito_identity_provider" "keycloak" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Keycloak"
  provider_type = "OIDC"

  provider_details = {
    client_id            = "cognito-client"
    client_secret        = "your-keycloak-client-secret"
    oidc_issuer          = "https://keycloak.example.com/realms/myrealm"
    authorize_scopes     = "openid email profile"
    token_request_method = "POST"
    attributes_request_method = "GET"
  }

  attribute_mapping = {
    email       = "email"
    username    = "sub"
    name        = "name"
    given_name  = "given_name"
    family_name = "family_name"
  }
}
```

In Keycloak, create a new client:
- Client type: OpenID Connect
- Client authentication: On
- Valid redirect URIs: Your Cognito idpresponse URL
- Web origins: Your Cognito domain

## Example: Auth0 OIDC Integration

```hcl
# Auth0 OIDC provider
resource "aws_cognito_identity_provider" "auth0" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Auth0"
  provider_type = "OIDC"

  provider_details = {
    client_id            = "your-auth0-client-id"
    client_secret        = "your-auth0-client-secret"
    oidc_issuer          = "https://your-tenant.auth0.com/"
    authorize_scopes     = "openid email profile"
    token_request_method = "POST"
    attributes_request_method = "GET"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
    picture  = "picture"
  }
}
```

Note the trailing slash in the Auth0 issuer URL - it's required.

## Multiple OIDC Providers

You can configure multiple OIDC providers for different customers:

```hcl
variable "oidc_providers" {
  type = map(object({
    client_id     = string
    client_secret = string
    issuer        = string
    domain        = string
  }))
}

resource "aws_cognito_identity_provider" "oidc" {
  for_each = var.oidc_providers

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "OIDC-${each.key}"
  provider_type = "OIDC"

  provider_details = {
    client_id            = each.value.client_id
    client_secret        = each.value.client_secret
    oidc_issuer          = each.value.issuer
    authorize_scopes     = "openid email profile"
    token_request_method = "POST"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
  }

  idp_identifiers = [each.value.domain]
}
```

## Debugging OIDC Issues

The most common problems with OIDC federation:

**Token exchange fails** - Check that `token_request_method` matches what your IdP expects. Some IdPs require POST, others accept GET.

**Attributes not populated** - Verify the `attributes_request_method` setting. Also check that the requested scopes include `profile` for name attributes.

**"Invalid issuer"** - The issuer URL must match exactly what's in the IdP's discovery document, including trailing slashes.

To debug, check the OIDC discovery document:

```bash
# Fetch the OIDC discovery document
curl https://idp.example.com/.well-known/openid-configuration | jq .
```

The response should contain:

```json
{
  "issuer": "https://idp.example.com",
  "authorization_endpoint": "https://idp.example.com/authorize",
  "token_endpoint": "https://idp.example.com/oauth/token",
  "userinfo_endpoint": "https://idp.example.com/userinfo",
  "jwks_uri": "https://idp.example.com/.well-known/jwks.json",
  "scopes_supported": ["openid", "email", "profile"],
  "response_types_supported": ["code"]
}
```

## Token Validation

After OIDC sign-in, Cognito issues its own tokens. Your application validates Cognito tokens, not the upstream IdP tokens:

```javascript
// validate-token.js
import { jwtDecode } from 'jwt-decode';

function validateCognitoToken(idToken) {
  const decoded = jwtDecode(idToken);

  // Check issuer
  const expectedIssuer = `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX`;
  if (decoded.iss !== expectedIssuer) {
    throw new Error('Invalid token issuer');
  }

  // Check expiration
  if (decoded.exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }

  // The identity provider info is in the token
  console.log('Identity provider:', decoded.identities?.[0]?.providerName);

  return decoded;
}
```

For SAML-based federation alternatives, see [Cognito SAML federation with Okta](https://oneuptime.com/blog/post/2026-02-12-cognito-saml-federation-okta/view) and [Cognito SAML federation with Azure AD](https://oneuptime.com/blog/post/2026-02-12-cognito-saml-federation-azure-ad/view).

## Summary

OIDC federation in Cognito is more straightforward than SAML for most modern identity providers. The auto-discovery mechanism means you usually just need the issuer URL, client ID, and client secret. For multi-tenant SaaS applications, OIDC is often the better choice because it's simpler for customers to configure on their end. The debugging experience is also better since you're working with JSON instead of XML.
