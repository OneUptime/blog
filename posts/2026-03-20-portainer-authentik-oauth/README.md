# How to Set Up Authentik as an OAuth Provider for Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Authentik, OAuth, Self-Hosted, Authentication, SSO

Description: Configure Authentik as an OIDC provider for Portainer with a complete provider and application setup in the Authentik admin interface.

## Introduction

Authentik is a modern, feature-rich self-hosted identity provider. Its web-based admin UI makes OAuth application configuration straightforward. This guide walks through creating an Authentik OAuth2/OIDC provider and connecting it to Portainer.

## Prerequisites

- Authentik deployed and accessible
- Portainer running on HTTPS
- Authentik admin access

## Step 1: Create an OAuth2/OIDC Provider in Authentik

1. Log in to Authentik admin UI (`https://authentik.example.com/if/admin/`)
2. Go to **Applications** → **Providers**
3. Click **Create** → Select **OAuth2/OpenID Provider**

Configure the provider:

```text
Name:                  Portainer OIDC Provider
Authorization Flow:    default-provider-authorization-explicit-consent

Protocol Settings:
  Client type:         Confidential
  Client ID:           portainer (or auto-generated)
  Client Secret:       (auto-generated - copy this)

Redirect URIs/Origins:
  Strict:              https://portainer.example.com/

Scopes:
  ✓ openid
  ✓ email
  ✓ profile

Signing Key:           authentik Self-signed Certificate (or your cert)

Advanced Settings:
  Access Token Validity:   minutes=10
  Refresh Token Validity:  days=30
  Include Claims in ID Token: true
  Sub Mode:               Based on the User's UUID
```

4. Click **Finish**

## Step 2: Create an Application in Authentik

1. Go to **Applications** → **Applications**
2. Click **Create**

```text
Name:         Portainer
Slug:         portainer
Provider:     Portainer OIDC Provider (the one just created)
Launch URL:   https://portainer.example.com/
UI Settings:
  Icon:        https://portainer.io/images/logos/portainer-icon.png
  Description: Container Management Platform
```

3. Click **Create**

## Step 3: Get the OIDC Endpoints

```bash
# Authentik OIDC discovery URL format:

# https://authentik.example.com/application/o/{slug}/.well-known/openid-configuration

curl -s "https://authentik.example.com/application/o/portainer/.well-known/openid-configuration" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Issuer:', d['issuer'])
print('Authorization:', d['authorization_endpoint'])
print('Token:', d['token_endpoint'])
print('UserInfo:', d['userinfo_endpoint'])
"
```

Authentik's endpoints follow this pattern:
```text
Authorization URL: https://authentik.example.com/application/o/authorize/
Access Token URL:  https://authentik.example.com/application/o/token/
Resource URL:      https://authentik.example.com/application/o/userinfo/
```

## Step 4: Configure Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "portainer",
      "ClientSecret": "your-authentik-client-secret",
      "AuthorizationURI": "https://authentik.example.com/application/o/authorize/",
      "AccessTokenURI": "https://authentik.example.com/application/o/token/",
      "ResourceURI": "https://authentik.example.com/application/o/userinfo/",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "SSO": true
    }
  }'
```

## Step 5: Control Access with Authentik Bindings

In Authentik, bind a group to the Portainer application to control who can access it:

1. In the Portainer application, go to **Policy/Group/User Bindings** tab
2. Click **Group**
3. Select the group:

```text
Type:        Group
Group:       portainer-users  (Authentik group)
```

Only members of the `portainer-users` Authentik group can access Portainer.

## Step 6: Create an Authentik Group for Portainer Access

```bash
# Create a group in Authentik via API
AUTHENTIK_TOKEN="your-authentik-api-token"

curl -X POST \
  -H "Authorization: Bearer $AUTHENTIK_TOKEN" \
  -H "Content-Type: application/json" \
  https://authentik.example.com/api/v3/core/groups/ \
  -d '{
    "name": "portainer-users",
    "is_superuser": false,
    "attributes": {}
  }'
```

This creates an Authentik group you can bind to the Portainer application. It does not automatically create or map Portainer teams; automatic team membership requires additional claim mapping in Authentik and Portainer Business Edition.

## Conclusion

Authentik provides a polished admin UI for OAuth configuration that's easier to use than many alternatives. The combination of Authentik's policy engine and Portainer's OAuth integration gives you fine-grained control over who can access Portainer and with what level of authentication (basic, MFA, etc.). Group-based access controls in Authentik complement Portainer's team-based RBAC nicely.
