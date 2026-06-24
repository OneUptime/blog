# How to Set Up Keycloak as an OAuth Provider for Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Keycloak, OAuth, OpenID Connect, Enterprise SSO, Self-Hosted

Description: Configure Keycloak as an OIDC provider for Portainer with client creation, role mapping, and group-based access control.

## Introduction

Keycloak is Red Hat's enterprise-grade identity and access management solution. It's widely used in enterprise environments and supports advanced features like user federation, identity brokering, and fine-grained authorization. This guide covers configuring Keycloak as Portainer's OIDC provider.

## Prerequisites

- Keycloak server running (version 21+)
- Portainer running on HTTPS (use Portainer Business Edition if you want automatic team membership from OAuth claims)
- Keycloak realm created for your organization

## Step 1: Create a Keycloak Client

1. Log in to Keycloak admin console
2. Select your realm (e.g., `myrealm`)
3. Go to **Clients** → **Create client**

```text
Client type:   OpenID Connect
Client ID:     portainer
Name:          Portainer
Description:   Container Management Platform

```

4. Click **Next** → Configure settings:

```text
Client authentication: On (Confidential)
Authorization:        Off
Authentication flow:
  ✓ Standard flow (Authorization Code)
  ✗ Direct access grants
  ✗ Implicit flow
```

5. Click **Next** → Set redirect URIs:

```text
Valid redirect URIs:
  https://portainer.example.com/

Valid post logout redirect URIs:
  https://portainer.example.com/

Web origins:
  https://portainer.example.com
```

6. Click **Save**

7. Go to **Credentials** tab → Copy the **Client secret**

## Step 2: Get Keycloak OIDC Endpoints

```bash
KEYCLOAK_URL="https://keycloak.example.com"
REALM="myrealm"

# Get discovery document

curl -s "${KEYCLOAK_URL}/realms/${REALM}/.well-known/openid-configuration" \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Authorization:', d['authorization_endpoint'])
print('Token:', d['token_endpoint'])
print('UserInfo:', d['userinfo_endpoint'])
print('Logout:', d['end_session_endpoint'])
"
```

Keycloak endpoints:
```text
Authorization URL: https://keycloak.example.com/realms/myrealm/protocol/openid-connect/auth
Access Token URL:  https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token
Resource URL:      https://keycloak.example.com/realms/myrealm/protocol/openid-connect/userinfo
Logout URL:        https://keycloak.example.com/realms/myrealm/protocol/openid-connect/logout
```

## Step 3: Configure Groups Claim (Optional)

To include group membership in the claims returned to Portainer:

1. Go to **Client Scopes** → create a new scope "groups" or use existing
2. Add a **Group Membership** mapper:

```text
Mapper Type:       Group Membership
Token Claim Name:  groups
Full group path:   Off (just group names)
Add to ID token:   On
Add to access token: On
Add to userinfo:   On
```

3. Add this scope to your Portainer client

## Step 4: Configure Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

KEYCLOAK_URL="https://keycloak.example.com"
REALM="myrealm"
CLIENT_ID="portainer"
CLIENT_SECRET="your-keycloak-client-secret"

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"${CLIENT_ID}\",
      \"ClientSecret\": \"${CLIENT_SECRET}\",
      \"AuthorizationURI\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth\",
      \"AccessTokenURI\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token\",
      \"ResourceURI\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/userinfo\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"preferred_username\",
      \"Scopes\": \"openid profile email groups\",
      \"OAuthAutoCreateUsers\": true,
      \"OAuthAutoMapTeamMemberships\": true,
      \"SSO\": true,
      \"LogoutURI\": \"${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout?client_id=${CLIENT_ID}&post_logout_redirect_uri=https://portainer.example.com/\",
      \"TeamMemberships\": {
        \"OAuthClaimName\": \"groups\"
      }
    }
  }"
```

## Step 5: Create Keycloak Groups and Map to Portainer Teams

```bash
# Keycloak Admin API - Create groups
KEYCLOAK_ADMIN_TOKEN=$(curl -s -X POST \
  "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli&username=admin&password=adminpassword&grant_type=password" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Create a group
curl -X POST \
  -H "Authorization: Bearer $KEYCLOAK_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  "${KEYCLOAK_URL}/admin/realms/${REALM}/groups" \
  -d '{"name": "portainer-devops"}'
```

With `OAuthAutoMapTeamMemberships` enabled and `TeamMemberships.OAuthClaimName` set to `groups`, Portainer Business Edition will add users to matching teams such as `portainer-devops`.

## Restricting Access to Specific Keycloak Users

Portainer does not use Keycloak Authorization Services to decide who can sign in. To restrict access:

1. Set `OAuthAutoCreateUsers` to `false` in the Portainer OAuth settings
2. In Portainer, create only the users you want to allow, using usernames that match the `UserIdentifier` claim (for this guide, `preferred_username`)
3. Keep Keycloak client Authorization disabled for this client; Keycloak Authorization Services are for protecting a resource server, not for gating Portainer OIDC login

## Conclusion

Keycloak's rich feature set makes it ideal for enterprise Portainer deployments. The OIDC configuration is standard, and Keycloak's group membership mapper combined with Portainer's OAuth team mapping enables precise access control. Combine Keycloak groups with Portainer team names for automatic team assignment, and leverage Keycloak's user federation for AD/LDAP backend integration.
