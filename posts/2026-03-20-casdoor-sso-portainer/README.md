# How to Configure Casdoor SSO with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Casdoor, OAuth, SSO, Self-Hosted

Description: Configure Casdoor as an OAuth/OIDC identity provider for Portainer single sign-on with user management and application control.

---

Casdoor is an open-source identity and access management platform with a web UI, supporting OAuth 2.0 and OpenID Connect. It's a lightweight alternative to Keycloak for self-hosted SSO.

## Step 1: Set Up Casdoor Application

1. Log in to your Casdoor admin panel
2. Navigate to **Applications**
3. Click **Add**
4. Configure:
   - **Name**: portainer
   - **Display name**: Portainer
   - **Redirect URLs**: the exact external URL of your Portainer instance, for example `https://portainer.example.com/`
   - **Grant types**: Authorization Code
   - **Response types**: code
   - **Token format**: JWT

5. After creating, note the **Client ID** and **Client Secret**

## Step 2: Get Casdoor OIDC Endpoints

```bash
CASDOOR_URL="https://casdoor.example.com"

# Casdoor discovery URL

curl "$CASDOOR_URL/.well-known/openid-configuration" | \
  python3 -c "
import sys, json
config = json.load(sys.stdin)
for k in ['authorization_endpoint', 'token_endpoint', 'userinfo_endpoint']:
    print(f'{k}: {config[k]}')
"
```

## Step 3: Configure Portainer with Casdoor

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

CASDOOR_URL="https://casdoor.example.com"
PORTAINER_URL="https://portainer.example.com/"

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"ClientID\": \"casdoor-client-id\",
      \"ClientSecret\": \"casdoor-client-secret\",
      \"AuthorizationURI\": \"$CASDOOR_URL/login/oauth/authorize\",
      \"AccessTokenURI\": \"$CASDOOR_URL/api/login/oauth/access_token\",
      \"ResourceURI\": \"$CASDOOR_URL/api/userinfo\",
      \"RedirectURI\": \"$PORTAINER_URL\",
      \"UserIdentifier\": \"preferred_username\",
      \"Scopes\": \"openid profile email\",
      \"OAuthAutoCreateUsers\": true
    }
  }" \
  --insecure
```

## Casdoor OIDC Endpoints

| Portainer Field | Casdoor Value |
|-----------------|--------------|
| Authorization URL | `https://casdoor.example.com/login/oauth/authorize` |
| Access Token URL | `https://casdoor.example.com/api/login/oauth/access_token` |
| Resource URL | `https://casdoor.example.com/api/userinfo` |
| User Identifier | `preferred_username` |

## Configure Casdoor User Properties

In Casdoor, ensure users have the required attributes:

1. Navigate to **Users** in Casdoor
2. For each user, set at minimum:
   - **Name** (used as the Portainer username if `UserIdentifier` is `preferred_username`)
   - **Email**
   - **Password**
3. Under **Organizations**, assign users to your organization

## Test the Login Flow

1. Open Portainer in a private browser
2. Click **Login with OAuth**
3. You'll be redirected to Casdoor's login page
4. Enter Casdoor credentials
5. If prompted, authorize the Portainer application
6. You'll be redirected back to Portainer

---

*Add monitoring and alerting for your Casdoor-integrated Portainer with [OneUptime](https://oneuptime.com).*
