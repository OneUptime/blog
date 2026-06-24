# How to Configure SSO (Single Sign-On) in Portainer - Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSO, Single Sign-On, OAuth, Authentication, Enterprise

Description: Enable SSO in Portainer so users are automatically logged in without the login screen when already authenticated with your identity provider.

## Introduction

SSO (Single Sign-On) in Portainer means users authenticate through their identity provider (via Microsoft Entra ID (Azure AD), Okta, Google, etc.) instead of entering Portainer credentials directly. When SSO is enabled, Portainer does not force the OAuth provider to prompt for credentials again if the user already has an active IdP session.

## Prerequisites

- OAuth authentication configured in Portainer
- Identity provider already set up
- Users already authenticated with the IdP in their browser session

## Understanding SSO vs. OAuth in Portainer

| Mode | Behavior |
|------|---------|
| OAuth only | User sees Portainer login page with an OAuth login button, and the provider is forced to prompt for credentials |
| SSO enabled | User still logs in through OAuth, but the provider can reuse an existing session and skip the credential prompt |

SSO is an enhancement on top of OAuth - it's only relevant once OAuth is configured, and it tells Portainer not to force a fresh provider login prompt.

## Enabling SSO via UI

1. Go to Settings → Authentication → OAuth
2. Configure your OAuth provider
3. Find the **Use SSO** toggle
4. Enable it
5. Save settings

Once enabled, clicking the OAuth login button sends users to your IdP without forcing a fresh credential prompt. If the user already has an IdP session, the provider can return them to Portainer without re-authentication.

## Enabling SSO via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Enable SSO in OAuth settings

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/settings \
  -d '{
    "AuthenticationMethod": 3,
    "OAuthSettings": {
      "ClientID": "your-client-id",
      "ClientSecret": "your-client-secret",
      "AuthorizationURI": "https://your-idp.com/oauth/authorize",
      "AccessTokenURI": "https://your-idp.com/oauth/token",
      "ResourceURI": "https://your-idp.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "SSO": true,
      "HideInternalAuth": true
    }
  }'
```

## How SSO Works Step by Step

```text
1. User visits https://portainer.example.com/
2. Portainer shows the login page with the OAuth login option
3. User starts OAuth login
4. Portainer redirects to:
   https://idp.example.com/oauth/authorize?client_id=...&redirect_uri=...
5. IdP checks if user has active session
   a. If SSO is enabled and the session exists: IdP may not prompt again
   b. If no active session exists: IdP shows login page, user authenticates, then redirects back
6. IdP redirects back to Portainer with an authorization code
7. Portainer exchanges the code for tokens, retrieves user details, and creates the user session
8. User sees Portainer dashboard
```

## Hiding the Internal Login (HideInternalAuth)

When SSO is enabled, you can hide the internal username/password form:

```json
"HideInternalAuth": true
```

With this enabled, the login page only shows the OAuth/SSO button. To access the initial admin account:

1. Open `https://portainer.example.com/#!/internal-auth`
2. This forces Portainer to use internal authentication even when the internal prompt is hidden

**Important**: Keep the password for the initial admin account available for emergency access in case the IdP is unavailable.

## Logout URI Configuration

Configure where users are redirected after logging out of Portainer:

```json
"LogoutURI": "https://idp.example.com/oauth/logout?redirect_uri=https://portainer.example.com/"
```

This sends users to your IdP's logout endpoint after they log out of Portainer. The exact behavior depends on your provider's logout URL and parameters.

## SSO with Microsoft Entra ID (Azure AD)

Microsoft Entra ID (Azure AD) can reuse an existing session if the user is already signed in. When a user has already logged into Microsoft 365 and starts Microsoft OAuth login in Portainer with SSO enabled:

1. Portainer redirects to Microsoft Entra ID
2. Microsoft Entra ID detects the existing session and may not prompt again
3. Microsoft Entra ID redirects back to Portainer with an authorization code
4. Portainer completes OAuth login and creates the user session

## Conclusion

SSO in Portainer creates a seamless experience for users who already have an active session with the corporate IdP - they can sign in through OAuth without being prompted again by the provider. Combined with `HideInternalAuth`, the internal login prompt can be hidden from regular users. Always maintain emergency access to the initial admin account through `#!/internal-auth` for operational continuity when the IdP is unavailable.
