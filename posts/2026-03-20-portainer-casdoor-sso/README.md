# How to Configure Casdoor SSO with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Casdoor, SSO, OAuth, Self-Hosted, Authentication

Description: Set up Casdoor as an OIDC provider for Portainer, enabling self-hosted SSO with Casdoor's multi-provider identity management.

## Introduction

Casdoor is an open-source centralized authentication/authorization platform with a web-based admin UI. It supports OIDC, OAuth 2.0, and SAML, and can federate with dozens of upstream providers. This guide configures Casdoor as Portainer's OIDC provider.

## Prerequisites

- Casdoor deployed and accessible
- Portainer running on HTTPS
- Casdoor admin access

## Step 1: Deploy Casdoor

Quick deployment with Docker:

```bash
docker run -p 8000:8000 casbin/casdoor-all-in-one
# Access at http://localhost:8000 (built-in/admin / 123)
```

## Step 2: Create an Application in Casdoor

1. Log in to Casdoor admin UI (`http://localhost:8000`) with `built-in/admin` / `123`
2. Go to **Applications** → **Add**

Fill in:
```sql
Name:          portainer
DisplayName:   Portainer
Organization:  your-org
Logo:          https://portainer.io/images/logos/portainer-icon.png

Redirect URLs:
  https://portainer.example.com/

Grant Types:
  ✓ Authorization Code

Providers:
  (select any upstream providers you want Casdoor to offer)

Sign-in Methods:
  ✓ Password
  ✓ LDAP (optional)
```

Use a regular organization such as `your-org` for Portainer users instead of `built-in`.

3. Save and note the **Client ID** and **Client Secret**

## Step 3: Get Casdoor OIDC Endpoints

```bash
CASDOOR_URL="https://casdoor.example.com"

# Discovery endpoint
curl -s "${CASDOOR_URL}/.well-known/openid-configuration" | python3 -m json.tool

# Casdoor endpoints:
# Authorization: ${CASDOOR_URL}/login/oauth/authorize
# Token:         ${CASDOOR_URL}/api/login/oauth/access_token
# UserInfo:      ${CASDOOR_URL}/api/userinfo
```

## Step 4: Configure Portainer for Casdoor

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

CASDOOR_URL="https://casdoor.example.com"
CLIENT_ID="your-casdoor-client-id"
CLIENT_SECRET="your-casdoor-client-secret"

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"${CLIENT_ID}\",
      \"ClientSecret\": \"${CLIENT_SECRET}\",
      \"AuthorizationURI\": \"${CASDOOR_URL}/login/oauth/authorize\",
      \"AccessTokenURI\": \"${CASDOOR_URL}/api/login/oauth/access_token\",
      \"ResourceURI\": \"${CASDOOR_URL}/api/userinfo\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"preferred_username\",
      \"Scopes\": \"openid profile email\",
      \"OAuthAutoCreateUsers\": true,
      \"SSO\": true
    }
  }"
```

Note: Casdoor's OIDC userinfo response exposes the username as `preferred_username`.

## Step 5: Add Users to Casdoor

1. In Casdoor admin → **Users** → **Add**
2. Create the user in the same regular Casdoor organization as the Portainer application (for example, `your-org`)

## Step 6: Configure Casdoor with LDAP (Optional)

Connect Casdoor to LDAP for corporate SSO:

1. In Casdoor, open your organization and add an LDAP server under **LDAPs**
2. Configure the LDAP connection settings
3. In the Portainer application, enable the **LDAP** sign-in method
4. Sync or import users from LDAP/AD if needed

This allows users to log in to Casdoor (and thus Portainer) with LDAP credentials.

## Testing the Integration

1. Log out of Portainer
2. Click the OAuth login button
3. Casdoor's login page appears
4. Log in with a Casdoor user
5. Should be redirected back to Portainer

```bash
# Verify Casdoor's userinfo endpoint returns expected claims
CASDOOR_ACCESS_TOKEN="your-test-token"
curl -H "Authorization: Bearer $CASDOOR_ACCESS_TOKEN" \
  "${CASDOOR_URL}/api/userinfo" | python3 -m json.tool
```

## Conclusion

Casdoor provides a versatile self-hosted SSO solution that can aggregate multiple identity sources (LDAP, social logins, etc.) and present a unified OIDC interface to Portainer. Its clean admin UI makes application and user management straightforward. When combined with Casdoor's LDAP federation, you get enterprise SSO without needing Keycloak's complexity.
