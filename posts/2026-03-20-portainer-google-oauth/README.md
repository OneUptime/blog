# How to Configure Google OAuth with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google, OAuth, SSO, Authentication, Google Workspace

Description: Set up Google OAuth 2.0 authentication in Portainer to allow users to sign in with their Google or Google Workspace accounts.

## Introduction

Google OAuth allows Portainer users to authenticate using their Google or Google Workspace (G Suite) accounts. This is ideal for organizations using Google Workspace as their identity provider or for teams who want to use their Google accounts for Portainer access.

## Prerequisites

- Google Cloud project (free to create)
- Portainer running on HTTPS
- A registered redirect URI in Google Cloud Console

## Step 1: Create Google OAuth Credentials

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select or create a project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application** as the application type

Fill in:
```text
Name:             Portainer
Authorized redirect URIs:
  https://portainer.example.com/
```

6. Click **Create**
7. Note the **Client ID** and **Client Secret**

## Step 2: Configure the OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. For Google Workspace-only use, select **Internal** if the project belongs to a Google Cloud organization; otherwise select **External**
3. Fill in application name: "Portainer"
4. Add required scopes: `email`, `profile`, `openid`
5. Save

## Step 3: Configure Portainer for Google OAuth

Google's OIDC endpoints:

```text
Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
Access Token URL:  https://oauth2.googleapis.com/token
Resource URL:      https://openidconnect.googleapis.com/v1/userinfo
```

In Settings → Authentication → OAuth → Google, enter the client ID and secret. If you want to use Google's current OIDC endpoints, click **Override default configuration** and use:

```text
Client ID:         your-client-id.apps.googleusercontent.com
Client Secret:     your-client-secret
Authorization URL: https://accounts.google.com/o/oauth2/v2/auth
Access Token URL:  https://oauth2.googleapis.com/token
Resource URL:      https://openidconnect.googleapis.com/v1/userinfo
Redirect URL:      https://portainer.example.com/
User Identifier:   email
Scopes:            openid email profile
Auth Style:        In Params
```

## Step 4: Configure via API

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
      "ClientID": "123456789-abcdefg.apps.googleusercontent.com",
      "ClientSecret": "GOCSPX-your_secret",
      "AuthorizationURI": "https://accounts.google.com/o/oauth2/v2/auth",
      "AccessTokenURI": "https://oauth2.googleapis.com/token",
      "ResourceURI": "https://openidconnect.googleapis.com/v1/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid email profile",
      "AuthStyle": 1,
      "OAuthAutoCreateUsers": true,
      "SSO": true
    }
  }'
```

## Restricting Access to Specific Domains (Google Workspace)

For Google Workspace-only access, use the OAuth consent screen's **Internal** audience:

```text
OAuth consent screen → User type: Internal
```

This limits authorization requests to users in your Google Cloud organization. Do not rely on the `hd` parameter alone for access control.

## Restricting Access to Specific Users

In Portainer:
1. Disable automatic user provisioning (`OAuthAutoCreateUsers: false`)
2. Pre-create only the Portainer users you want to allow, using usernames that match the configured `User Identifier` value (for Google, typically `email`)

## Verifying the Configuration

```bash
# Manually test the OAuth flow

# Step 1: Generate the authorization URL
CLIENT_ID="your-client-id.apps.googleusercontent.com"
REDIRECT_URI="https://portainer.example.com/"
STATE=$(openssl rand -hex 16)

echo "Visit this URL to test:"
echo "https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid+email+profile&state=${STATE}"
```

## Troubleshooting

**"redirect_uri_mismatch"**: The redirect URI in Portainer doesn't match what's registered in Google Cloud Console. Check for trailing slashes and exact URL match.

**"access_denied"**: The user declined consent or the consent screen isn't configured correctly.

**"invalid_client"**: Wrong Client ID or Secret. Verify them in Google Cloud Console.

## Conclusion

Google OAuth provides a simple SSO experience for teams already using Google accounts. The setup requires only a few minutes in Google Cloud Console and Portainer's settings. For Google Workspace organizations, using an **Internal** app audience limits sign-in to users in your organization.
