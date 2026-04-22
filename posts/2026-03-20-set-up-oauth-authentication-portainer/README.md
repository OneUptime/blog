# How to Set Up OAuth Authentication in Portainer - Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, SSO, Authentication, Business Edition

Description: Learn how to configure OAuth 2.0 authentication in Portainer Business Edition to allow users to log in with their existing identity provider credentials.

---

OAuth authentication in Portainer allows users to log in using their organization's identity provider (IdP) - such as GitHub, Google, Azure AD, or any OAuth 2.0 / OpenID Connect provider. This eliminates the need to manage separate Portainer passwords.

## Prerequisites

- Portainer Business Edition
- An OAuth 2.0 / OpenID Connect provider
- Admin access to both Portainer and the OAuth provider

## OAuth Configuration Fields

Portainer requires these OAuth settings:

| Field | Description |
|-------|-------------|
| Client ID | OAuth application identifier |
| Client Secret | OAuth application secret |
| Authorization URL | Provider's authorization endpoint |
| Access Token URL | Provider's token endpoint |
| Resource URL | Endpoint to fetch user profile |
| Redirect URL | Portainer's callback URL |
| User Identifier | Claim containing the username |
| Scopes | Requested OAuth scopes |

## General OAuth Setup Steps

### Step 1: Register Portainer as an OAuth Application

In your OAuth provider, create a new OAuth application with:
- **Redirect/Callback URL**: `https://portainer.example.com/`
- Required scopes: follow your provider's documentation; for OpenID Connect providers this is commonly `openid profile email`

### Step 2: Configure OAuth in Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Configure OAuth authentication

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "your-client-id",
      "ClientSecret": "your-client-secret",
      "AuthorizationURI": "https://provider.example.com/oauth/authorize",
      "AccessTokenURI": "https://provider.example.com/oauth/token",
      "ResourceURI": "https://provider.example.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "DefaultTeamID": 0
    }
  }' \
  --insecure
```

### Step 3: Configure via the UI

1. Navigate to **Settings > Authentication**
2. Select **OAuth** as the authentication method
3. Fill in the OAuth provider details
4. Set the **User Identifier** field to the claim your provider uses for usernames (usually `email` or `sub`)
5. Enable **Auto-create users** to provision accounts on first login
6. Click **Save settings**

## Test the OAuth Login

1. Log out of Portainer
2. On the login page, click the **Login with OAuth** button
3. You'll be redirected to your OAuth provider
4. Authenticate with your provider credentials
5. You'll be redirected back to Portainer and logged in

## Redirect URL Configuration

The redirect URL in Portainer must exactly match what's registered in your OAuth provider:

```text
https://portainer.example.com/
```

Note the trailing slash in this example - register the URL exactly as it appears in Portainer's Redirect URL field. If Portainer is accessed on a port in the URL:

```text
https://portainer.example.com:9443/
```

---

*Monitor your OAuth-secured Portainer instance with [OneUptime](https://oneuptime.com) uptime monitoring.*
