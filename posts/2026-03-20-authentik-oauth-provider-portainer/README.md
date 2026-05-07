# How to Set Up Authentik as an OAuth Provider for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Authentik, OAuth, OIDC, SSO

Description: Configure Authentik as an OpenID Connect provider for Portainer to enable SSO with flexible access policies and user management.

---

Authentik is a self-hosted identity provider with a polished UI and powerful policy engine. Integrating it with Portainer provides SSO, user management, and fine-grained access control.

## Step 1: Create an OAuth2/OIDC Provider in Authentik

1. Log in to your Authentik admin interface
2. Navigate to **Applications > Providers**
3. Click **Create** > **OAuth2/OpenID Provider**
4. Configure:
   - **Name**: Portainer
   - **Authorization flow**: `default-provider-authorization-explicit-consent`
   - **Client type**: Confidential
   - **Client ID**: `portainer` (or auto-generated)
   - **Client Secret**: Auto-generated (copy this value)
   - **Redirect URIs**: `https://portainer.example.com/`
   - **Scopes**: openid, email, profile

## Step 2: Create an Application in Authentik

1. Navigate to **Applications > Applications**
2. Click **Create**
3. Configure:
   - **Name**: Portainer
   - **Slug**: portainer
   - **Provider**: Select the provider created above
4. Click **Create**

## Step 3: Get the Endpoint URLs

Find Authentik's OIDC endpoints from the discovery document:

```bash
# Authentik discovery URL format

curl https://authentik.example.com/application/o/portainer/.well-known/openid-configuration | \
  python3 -m json.tool | grep -E "authorization|token|userinfo"
```

## Step 4: Configure Portainer with Authentik

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

AUTHENTIK_BASE="https://authentik.example.com"

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"portainer-client-id\",
      \"ClientSecret\": \"your-authentik-client-secret\",
      \"AuthorizationURI\": \"$AUTHENTIK_BASE/application/o/authorize/\",
      \"AccessTokenURI\": \"$AUTHENTIK_BASE/application/o/token/\",
      \"ResourceURI\": \"$AUTHENTIK_BASE/application/o/userinfo/\",
      \"RedirectURI\": \"https://portainer.example.com/\",
      \"UserIdentifier\": \"email\",
      \"Scopes\": \"openid email profile\",
      \"OAuthAutoCreateUsers\": true
    }
  }" \
  --insecure
```

## Authentik OIDC Endpoints

| Portainer Field | Authentik Value |
|-----------------|----------------|
| Authorization URL | `https://authentik.example.com/application/o/authorize/` |
| Access Token URL | `https://authentik.example.com/application/o/token/` |
| Resource URL | `https://authentik.example.com/application/o/userinfo/` |
| User Identifier | `email` or `preferred_username` |

## Configure Group-Based Access via Authentik Bindings

In Authentik, use application bindings to restrict Portainer access:

1. In the Portainer application, go to **Policy/Group/User Bindings**
2. Add the `portainer-users` group as a binding for the application
3. Users who are not in that group will be denied access to the application

## Verify the Login Flow

1. Open Portainer in incognito mode
2. Click **Login with OAuth**
3. Sign in through Authentik's login portal
4. Verify you're redirected to Portainer

---

*Complement Authentik-secured access with infrastructure monitoring from [OneUptime](https://oneuptime.com).*
