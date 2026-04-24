# How to Configure OAuth Redirect and Callback URLs in Portainer - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Redirect URI, Callback URL, Configuration

Description: Understand and correctly configure OAuth redirect URIs in Portainer and your identity provider to prevent redirect_uri_mismatch errors.

## Introduction

The redirect URI (callback URL) is one of the most common sources of OAuth configuration errors. It must match exactly between your identity provider registration and Portainer's settings. A single difference in trailing slashes, scheme, or path causes authentication to fail entirely. This guide explains redirect URIs in depth.

## What Is a Redirect URI?

After a user authenticates with the identity provider, the IdP redirects them back to your application using the redirect URI. This URI is a security measure - the IdP only redirects to pre-approved URIs. If the URI Portainer requests doesn't match what's registered with the IdP, authentication fails with a "redirect_uri_mismatch" error.

## Portainer's Redirect URI

Portainer sends the Redirect URL you configure in Settings → Authentication → OAuth. In the common case where Portainer is served at the root, that looks like:

```text
https://your-portainer-domain.com/
```

Key points:
- Uses the same scheme and port as your public Portainer URL
- If Portainer is served from a subpath, include that full subpath
- Register the exact value Portainer is configured to send, including whether you use a trailing slash

## What Must Match Exactly

| Component | Example | Must Match? |
|-----------|---------|------------|
| Scheme | `https://` | Yes |
| Hostname | `portainer.example.com` | Yes |
| Port | `:443` (implicit for HTTPS) | Yes |
| Path | `/` or `/portainer/` | Yes |
| Trailing slash | final `/` in `https://portainer.example.com/` | Yes |

A trailing slash mismatch is a common cause of login failures.

## Configuring in Portainer

In Settings → Authentication → OAuth:

```text
Redirect URL: https://portainer.example.com/
```

Or via API:

Send the full `OAuthSettings` object - Portainer replaces that struct rather than merging a single field.

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
      "AccessTokenURI": "https://provider.example.com/oauth/token",
      "AuthorizationURI": "https://provider.example.com/oauth/authorize",
      "ResourceURI": "https://provider.example.com/oauth/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "email",
      "Scopes": "openid,email,profile",
      "OAuthAutoCreateUsers": false,
      "DefaultTeamID": 0,
      "SSO": false,
      "LogoutURI": "",
      "AuthStyle": 0
    }
  }'
```

## Registering in Each IdP

### Microsoft Entra ID (Azure AD)

1. App Registration → **Authentication** → **Redirect URIs**
2. Add: `https://portainer.example.com/`
3. Type: **Web**

### Google OAuth

1. In your OAuth client credentials → **Authorized redirect URIs**
2. Add: `https://portainer.example.com/`

### GitHub

1. OAuth App settings → **Authorization callback URL**
2. Value: `https://portainer.example.com/`

### Keycloak

1. Client settings → **Valid redirect URIs**
2. Add: `https://portainer.example.com/`

### Authentik

1. Provider settings → **Redirect URIs/Origins**
2. Add: `https://portainer.example.com/`

## Common Mistakes and Fixes

### Missing Trailing Slash

```text
Wrong:   https://portainer.example.com   (if Portainer is configured to send `https://portainer.example.com/`)
Correct: https://portainer.example.com/
```

### Wrong Scheme

```text
Wrong:   http://portainer.example.com/   (if running on HTTPS)
Correct: https://portainer.example.com/
```

### Non-Standard Port

```text
Wrong:   https://portainer.example.com/   (if running on port 8443)
Correct: https://portainer.example.com:8443/
```

### URL Behind Reverse Proxy

If Portainer is behind a proxy on a different port:
```text
Wrong (internal port): https://portainer.example.com:9443/
Correct (public URL):  https://portainer.example.com/
```

Always use the URL that users see in their browser, not internal ports.

## Diagnosing Redirect URI Errors

When you get a "redirect_uri_mismatch" error:

1. Note the exact error message - most IdPs show the "requested" and "expected" URIs
2. Compare them character by character
3. Update whichever side is different

```bash
# Check what Portainer is configured to send

curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/settings \
  | python3 -c "import sys,json; s=json.load(sys.stdin); print(s.get('OAuthSettings',{}).get('RedirectURI','not set'))"
```

## Subpath Deployment

If Portainer runs at a subpath (`https://example.com/portainer/`), the redirect URI must be the full subpath:

```text
Redirect URL: https://example.com/portainer/
```

Also ensure `--base-url /portainer` is set in Portainer's startup command.

## Conclusion

Redirect URI configuration is a precision exercise - every character matters. The rule is simple: use the exact public URL Portainer is configured to send, including any subpath, port, and trailing slash, and register that same value with your identity provider.
