# How to Set Up a Custom OAuth Provider with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Custom IdP, OpenID Connect, Authentication

Description: Configure Portainer to use any OIDC-compatible OAuth provider including self-hosted options like Keycloak, Authentik, or Dex.

## Introduction

Portainer's custom OAuth option allows integration with any OAuth 2.0 / OpenID Connect provider. Whether you're using a self-hosted IdP like Keycloak, a cloud service like Okta, or a custom solution, the configuration process is the same - you need your client credentials, the provider's authorization/token/resource URLs, the claim Portainer should use as the user identifier, the scopes to request, and one redirect URI to register.

## What You Need from Your OAuth Provider

1. **Client ID**: Your application's identifier
2. **Client Secret**: Secret for server-to-server communication
3. **Authorization URL**: Where users are redirected to log in
4. **Token URL**: Where Portainer exchanges the auth code
5. **Resource URL**: Where Portainer fetches user profile data, often the OIDC UserInfo endpoint
6. **User Identifier**: The claim or field Portainer should use as the username, such as `sub`, `email`, or `preferred_username`
7. **Scopes**: The scopes Portainer should request, such as `openid profile email`
8. **OIDC Discovery URL** (optional): `/.well-known/openid-configuration` to look up the provider endpoints

## Finding Endpoints via OIDC Discovery

Most modern OIDC providers publish their endpoints at a well-known URL:

```bash
# Inspect the discovery document for the endpoints Portainer needs

ISSUER_URL="https://idp.example.com"
curl -s "${ISSUER_URL}/.well-known/openid-configuration" | python3 -m json.tool

# Common discovery URLs:
# Keycloak:    https://keycloak.example.com/realms/myrealm/.well-known/openid-configuration
# Authentik:   https://authentik.example.com/application/o/portainer/.well-known/openid-configuration
# Okta:        https://dev-123456.okta.com/.well-known/openid-configuration
# Auth0:       https://yourtenant.auth0.com/.well-known/openid-configuration
# Dex:         https://dex.example.com/.well-known/openid-configuration
```

The discovery document typically contains `authorization_endpoint`, `token_endpoint`, and `userinfo_endpoint`.

## Generic Custom OAuth Configuration

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "portainer-client-id",
      "ClientSecret": "portainer-client-secret",
      "AuthorizationURI": "https://idp.example.com/oauth/authorize",
      "AccessTokenURI": "https://idp.example.com/oauth/token",
      "ResourceURI": "https://idp.example.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "sub",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "SSO": true,
      "LogoutURI": "https://idp.example.com/oauth/logout?redirect_uri=https://portainer.example.com/"
    }
  }'
```

## Example: Okta Configuration

```bash
OKTA_DOMAIN="dev-123456.okta.com"
CLIENT_ID="okta-client-id"
CLIENT_SECRET="okta-client-secret"

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"${CLIENT_ID}\",
      \"ClientSecret\": \"${CLIENT_SECRET}\",
      \"AuthorizationURI\": \"https://${OKTA_DOMAIN}/oauth2/v1/authorize\",
      \"AccessTokenURI\": \"https://${OKTA_DOMAIN}/oauth2/v1/token\",
      \"ResourceURI\": \"https://${OKTA_DOMAIN}/oauth2/v1/userinfo\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"email\",
      \"Scopes\": \"openid profile email groups\",
      \"OAuthAutoCreateUsers\": true
    }
  }"
```

## Example: Auth0 Configuration

```text
AUTH0_DOMAIN="yourtenant.auth0.com"

# Portainer Settings
Authorization URL: https://${AUTH0_DOMAIN}/authorize
Access Token URL:  https://${AUTH0_DOMAIN}/oauth/token
Resource URL:      https://${AUTH0_DOMAIN}/userinfo
User Identifier:   email
Scopes:            openid profile email
```

Register in Auth0:
1. Create Application → Regular Web Application
2. Set Allowed Callback URLs: `https://portainer.example.com/`

## Mapping User Identifier Claims

Different providers use different claim names:

| Provider | Recommended Identifier | Claim Name |
|----------|----------------------|------------|
| Microsoft Entra ID / Azure AD | User principal name | `userPrincipalName` |
| Google | Email | `email` |
| GitHub | Username | `login` |
| Okta | Email | `email` |
| Keycloak | Username | `preferred_username` |
| Auth0 | Email | `email` |

## Testing Your Configuration

```bash
# Manual OAuth flow test
# Step 1: Get the authorization URL
curl -s "https://idp.example.com/.well-known/openid-configuration" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Auth URL:', d['authorization_endpoint'])"

# Step 2: Build authorization request manually
CLIENT_ID="your-client-id"
REDIRECT_URI="https://portainer.example.com/"
echo "https://idp.example.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid+email+profile"
```

## Conclusion

Custom OAuth configuration in Portainer follows the same pattern regardless of provider: collect the client credentials and the authorization, token, and resource URLs from the provider, register the redirect URI in the provider, and enter the user identifier and scopes in Portainer. The OIDC discovery URL makes this easier by exposing the provider endpoints in one place.
