# How to Configure Google OAuth with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google OAuth, SSO, Authentication, Business Edition

Description: Configure Google OAuth to allow users to sign into Portainer with their Google Workspace or personal Google accounts.

---

Google OAuth integration lets users log in to Portainer using their Google accounts. For organizations using Google Workspace, this enables single sign-on without managing separate credentials.

## Step 1: Create a Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Open **Google Auth Platform > Overview** and click **Get started** if prompted
4. Under **Audience**, choose **Internal** (Google Workspace only) or **External** (any Google account)
5. Under **Branding**, fill in the app name, support email, and authorized domains
6. Open **Google Auth Platform > Clients**
7. Click **Create Client**
8. Select **Web application**
9. Add the authorized redirect URI: `https://portainer.example.com/`
10. Click **Create** and copy the **Client ID** and **Client Secret** immediately

## Step 2: Configure Portainer with Google OAuth

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "123456789.apps.googleusercontent.com",
      "ClientSecret": "GOCSPX-your-client-secret",
      "AuthorizationURI": "https://accounts.google.com/o/oauth2/v2/auth",
      "AccessTokenURI": "https://oauth2.googleapis.com/token",
      "ResourceURI": "https://openidconnect.googleapis.com/v1/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid email profile",
      "OAuthAutoCreateUsers": true
    }
  }' \
  --insecure
```

## Google OAuth Endpoint Reference

| Field | Value |
|-------|-------|
| Authorization URL | `https://accounts.google.com/o/oauth2/v2/auth` |
| Access Token URL | `https://oauth2.googleapis.com/token` |
| Resource URL | `https://openidconnect.googleapis.com/v1/userinfo` |
| User Identifier | `email` |
| Scopes | `openid email profile` |

## Restrict to Google Workspace Domain

To streamline sign-in for users from your company's Google Workspace domain, you can add the `hd` (hosted domain) parameter to the authorization request. Google notes that this only optimizes the account chooser. To actually restrict access, the returned ID token must contain an `hd` claim that matches your domain:

```bash
# The hd parameter only guides the Google account chooser.
# It does not enforce access by itself.

# To restrict access to a Workspace domain, the returned ID token's "hd"
# claim must match your domain.

# Portainer's generic OAuth settings do not provide a dedicated domain
# allowlist, so enforce this in Google Workspace or disable auto-create
# and pre-provision users in Portainer.
```

## Configure via Portainer UI

1. Navigate to **Settings > Authentication**
2. Select **OAuth > Google**
3. Portainer pre-fills Google-specific endpoints
4. Enter your **Client ID** and **Client Secret**
5. Set **Redirect URL** to the same Portainer URL you added as the authorized redirect URI
6. Click **Save settings**

## Test the Google OAuth Login

1. Open Portainer in a private/incognito browser tab
2. Click **Login with OAuth** (or the Google button)
3. Choose your Google account
4. Grant the requested permissions
5. You should be redirected back to Portainer

---

*Manage container uptime with [OneUptime](https://oneuptime.com) alongside your Google-authenticated Portainer.*
