# How to Set Up OAuth Authentication in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, SSO, Authentication, OpenID Connect

Description: Configure OAuth 2.0 and OpenID Connect authentication in Portainer to enable single sign-on with identity providers like Azure AD, Google, or GitHub.

## Introduction

OAuth 2.0 with OpenID Connect (OIDC) is the modern standard for delegated authentication. Instead of managing passwords in Portainer's own database or LDAP, OAuth lets users authenticate via trusted identity providers (IdPs) like Azure AD, Google, GitHub, or any OIDC-compatible service. This guide explains OAuth setup in Portainer.

## How OAuth Works in Portainer

1. User clicks "Login with OAuth"
2. Browser redirects to the identity provider
3. User authenticates with the IdP
4. IdP redirects back to Portainer with an authorization code
5. Portainer exchanges the code for an access token and user info
6. Portainer creates/updates the user account and logs them in

## OAuth Configuration Settings

In Settings → Authentication → OAuth:

| Field | Description |
|-------|-------------|
| Client ID | Application ID from your IdP |
| Client Secret | Secret from your IdP |
| Authorization URL | Where to redirect users for login |
| Access Token URL | Where Portainer exchanges the code |
| Resource URL | Where to fetch user profile info |
| Redirect URL | Portainer's callback URL |
| User Identifier | Claim to use as username |
| Scopes | OAuth scopes to request |

## Generic OAuth Configuration

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
      "ClientID": "your-client-id",
      "ClientSecret": "your-client-secret",
      "AuthorizationURI": "https://your-idp.com/oauth/authorize",
      "AccessTokenURI": "https://your-idp.com/oauth/token",
      "ResourceURI": "https://your-idp.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "sub",
      "Scopes": "openid profile email",
      "OAuthAutoCreateUsers": true,
      "DefaultTeamID": 0,
      "SSO": true,
      "LogoutURI": "https://your-idp.com/oauth/logout"
    }
  }'
```

## Setting the Redirect URL

The redirect URL is where the IdP sends users back after authentication. It must be registered in your IdP application settings:

```text
https://portainer.example.com/
```

Use your exact public Portainer URL, including any port or subpath. In a default root deployment, that means a trailing slash as shown above. Ensure it exactly matches what you register with the IdP.

## Scopes and Claims

Common OIDC scopes:

```text
openid           - Required for OIDC
profile          - Name, given_name, family_name
email            - email, email_verified
groups           - Group membership (IdP-specific)
```

The `User Identifier` field specifies which claim from the ID token or userinfo endpoint to use as the Portainer username:
- `sub` - Subject (unique user ID, stable but not human-readable)
- `email` - User's email address
- `preferred_username` - Username preferred by the user

## Auto-Create Users Setting

```json
"OAuthAutoCreateUsers": true
```

When enabled, Portainer creates a user account on first OAuth login. When disabled, an admin must pre-create the account before the user can log in.

## Testing OAuth Login

1. Save OAuth settings
2. Log out of Portainer
3. On the login page, look for the OAuth login button (`Login with Microsoft`, `Login with Google`, `Login with GitHub`, or `Login with OAuth` for a custom provider)
4. Click it and complete the IdP authentication flow
5. You should be redirected back to Portainer and logged in

## Common OAuth Issues

**Redirect URI Mismatch**: The most common error. The URI in Portainer must exactly match what's registered with the IdP, including protocol, port, path, and trailing slash.

**Invalid Client**: Client ID or Secret is wrong. Double-check the values from your IdP.

**Scope Not Allowed**: The requested scopes aren't enabled in your IdP application registration.

## Conclusion

OAuth authentication in Portainer provides a standards-based SSO experience that works with any OIDC-compatible identity provider. The critical configuration points are the redirect URL (must match IdP registration exactly), the appropriate scopes, and the user identifier claim. Once configured, specific provider guides (Azure AD, Google, GitHub) provide exact field values for each provider.
