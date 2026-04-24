# How to Fix OAuth Login Issues with Authentik in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, OAuth, Authentik, SSO, Authentication, Troubleshooting

Description: Configure and troubleshoot OAuth 2.0 Single Sign-On between Portainer and Authentik identity provider, covering callback URL issues, scope configuration, and claim mapping.

## Introduction

Authentik is a popular self-hosted identity provider that many teams use for SSO. Integrating it with Portainer via OAuth 2.0 enables centralized user management. This guide covers the complete setup and all common failure points.

## Prerequisites

- Authentik running and accessible
- Portainer CE or BE installed
- Domain names for both services

## Step 1: Create an OAuth Application in Authentik

1. Log in to the Authentik Admin UI at `https://authentik.yourdomain.com/if/admin/`
2. Go to **Applications** → **Providers** → **Create**
3. Select **OAuth2/OpenID Provider**
4. Configure:
   - **Name**: Portainer
   - **Authorization flow**: default-authorization-flow
   - **Client type**: Confidential
   - **Client ID**: Authentik generates this (copy it)
   - **Client Secret**: Generate (copy it)
   - **Redirect URIs**: `https://portainer.yourdomain.com` (must exactly match the Redirect URL you configure in Portainer)
   - **Scopes**: `openid email profile`

5. Create the Application:
   - **Name**: Portainer
   - **Provider**: Select the provider just created
   - **Launch URL**: `https://portainer.yourdomain.com`

## Step 2: Get Authentik OAuth Endpoints

```bash
# Authentik exposes OpenID Connect discovery endpoint

curl https://authentik.yourdomain.com/application/o/portainer/.well-known/openid-configuration | jq '{
  authorization_endpoint,
  token_endpoint,
  userinfo_endpoint
}'

# Typical values:
# authorization_endpoint: https://authentik.yourdomain.com/application/o/authorize/
# token_endpoint: https://authentik.yourdomain.com/application/o/token/
# userinfo_endpoint: https://authentik.yourdomain.com/application/o/userinfo/
```

## Step 3: Configure OAuth in Portainer

In Portainer:
1. Go to **Settings** → **Authentication**
2. Select **OAuth** as authentication method
3. Fill in:
   - **Client ID**: from Authentik
   - **Client secret**: from Authentik
   - **Authorization URL**: `https://authentik.yourdomain.com/application/o/authorize/`
   - **Access token URL**: `https://authentik.yourdomain.com/application/o/token/`
   - **Resource URL**: `https://authentik.yourdomain.com/application/o/userinfo/`
   - **Redirect URL**: `https://portainer.yourdomain.com`
   - **Logout URL**: `https://authentik.yourdomain.com/application/o/portainer/end-session/`
   - **Scopes**: `openid email profile`
   - **User identifier**: `email` or `preferred_username`
4. Click **Save settings**

## Step 4: Fix "Redirect URI Mismatch" Error

The most common OAuth error:

```text
Error: redirect_uri_mismatch
The redirect URI in the request did not match the authorized redirect URIs.
```

Fix in Authentik:
1. Edit your Portainer OAuth provider
2. Ensure the redirect URI **exactly** matches what Portainer sends
3. Check for trailing slashes, http vs https, and www vs non-www

```bash
# Check what redirect URI Portainer is actually sending
# Enable debug logging and attempt login
docker logs portainer 2>&1 | grep -i "redirect\|oauth\|callback" | tail -10

# Common mismatch causes:
# Portainer sends: http://portainer.yourdomain.com (HTTP)
# Authentik expects: https://portainer.yourdomain.com (HTTPS)
# Fix: Ensure X-Forwarded-Proto header is set correctly in reverse proxy
```

## Step 5: Fix HTTPS Behind Reverse Proxy

Portainer must know it's behind HTTPS to generate the correct redirect URI:

```nginx
# Add to Nginx proxy config
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header Host $host;
```

Without this, Portainer generates `http://` redirect URLs even when accessed via HTTPS.

## Step 6: Fix Token Validation Errors

```bash
# Check Portainer logs for token errors
docker logs portainer 2>&1 | grep -i "token\|jwt\|invalid\|oauth" | tail -20

# If token or userinfo requests fail immediately after login,
# verify time is correct on both the Portainer and Authentik hosts.
# OAuth/OIDC tokens are time-sensitive, so significant clock drift can cause failures.

# Sync time on the Portainer host (systemd-based hosts)
sudo timedatectl set-ntp true
timedatectl status | grep -E "System clock synchronized|NTP service"
```

## Step 7: Fix User Claim Mapping

Portainer needs the claim you configure as the **User identifier**, typically `email` or `preferred_username`:

```bash
# Test what Authentik returns for userinfo
# Get a test token from Authentik first, then:
curl -H "Authorization: Bearer YOUR_TEST_TOKEN" \
  https://authentik.yourdomain.com/application/o/userinfo/ | jq .

# Common useful claims:
# {
#   "sub": "user-uuid",
#   "email": "user@example.com",
#   "preferred_username": "username",
#   "name": "Full Name",
#   "groups": ["devops", "admins"]
# }
```

If the claim you want to use is missing, enable the matching scope in Authentik:
1. OAuth Provider → edit → **Selected Scopes** → ensure `email` is included for the `email` claim
2. Ensure `profile` is included for claims like `preferred_username`, `name`, and `groups`
3. If you need a different claim shape, add a custom scope mapping

## Step 8: Configure Team Mapping

Map Authentik groups to Portainer teams:

```bash
# In Portainer Settings → Authentication → OAuth
# Enable "Automatic Team Membership"
# Configure group claim name: "groups"

# In Authentik, ensure the profile scope is selected on the provider:
# Provider → edit → Advanced protocol settings → Selected Scopes
# Ensure "authentik default OAuth Mapping: OpenID 'profile'" is selected
# The default profile scope includes group membership.
# If you need a different group claim, create a custom scope mapping that returns "groups".
```

## Step 9: Test OAuth Flow Manually

```bash
# Step 1: Get authorization code
# Open this URL in browser:
echo "https://authentik.yourdomain.com/application/o/authorize/?client_id=YOUR_CLIENT_ID&redirect_uri=https://portainer.yourdomain.com&response_type=code&scope=openid%20email%20profile"

# Step 2: Exchange code for token
# After redirect, you'll get: https://portainer.yourdomain.com?code=AUTHORIZATION_CODE
CODE="the_code_from_redirect"

curl -X POST \
  https://authentik.yourdomain.com/application/o/token/ \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "redirect_uri=https://portainer.yourdomain.com" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

## Step 10: Fix Authentik Application Slug Mismatch

Authentik uses the application slug in the discovery, JWKS, and end-session URLs. Ensure the slug matches what you're using:

```bash
# Check Authentik application slug
# In Authentik: Applications → Application → copy the Slug

# Slug-specific endpoints:
# https://authentik.yourdomain.com/application/o/SLUG/.well-known/openid-configuration
# https://authentik.yourdomain.com/application/o/SLUG/end-session/
# https://authentik.yourdomain.com/application/o/SLUG/jwks/

# Authorization, token, and userinfo endpoints are global:
# https://authentik.yourdomain.com/application/o/authorize/
# https://authentik.yourdomain.com/application/o/token/
# https://authentik.yourdomain.com/application/o/userinfo/

# If the discovery endpoint returns 404, the slug is wrong
curl -I https://authentik.yourdomain.com/application/o/portainer/.well-known/openid-configuration
# Should return 200
```

## Conclusion

OAuth integration between Portainer and Authentik most commonly fails due to redirect URI mismatches and X-Forwarded-Proto header issues. Always test the OAuth flow manually using `curl` to isolate exactly which step is failing. Ensure clocks are synchronized on both servers, all URIs use consistent HTTP/HTTPS schemes, and the userinfo endpoint returns the `email` or `preferred_username` claim that Portainer uses as the user identifier.
