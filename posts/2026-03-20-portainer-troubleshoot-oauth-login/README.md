# How to Troubleshoot OAuth Login Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Troubleshooting, SSO, Authentication, Debugging

Description: Diagnose and fix common OAuth authentication failures in Portainer including redirect URI mismatches, token errors, and configuration issues.

## Introduction

OAuth authentication issues in Portainer range from simple configuration mismatches to complex token parsing problems. This guide provides a systematic approach to diagnosing OAuth failures, with specific error messages and their fixes.

## Common OAuth Error Messages

### "redirect_uri_mismatch"

The redirect URI in Portainer doesn't match what's registered with the IdP.

```bash
# Check current Portainer redirect URI setting

TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/settings \
  | python3 -c "import sys,json; s=json.load(sys.stdin); o=s.get('OAuthSettings',{}); print('Redirect URI:', o.get('RedirectURI',''))"

# Fix: Ensure the registered Redirect URL matches the Portainer instance URL exactly
# Match scheme, host, port, and any subpath used by your reverse proxy
# Example: https://portainer.example.com
```

### "invalid_client"

Client authentication at the token endpoint is failing.

```bash
# Verify client authentication with the IdP token endpoint
# Example: if Auth Style is set to send client credentials in the request body
curl -X POST \
  "https://your-idp.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=your-client-id&client_secret=your-client-secret&grant_type=client_credentials"

# If Auth Style is set to send client credentials in the header, use HTTP Basic auth instead
# curl -u "your-client-id:your-client-secret" -X POST \
#   "https://your-idp.com/oauth/token" \
#   -H "Content-Type: application/x-www-form-urlencoded" \
#   -d "grant_type=client_credentials"
#
# If the response is invalid_client, the client authentication failed
# Common causes: wrong client ID, wrong client secret, or wrong auth style
```

### "Origin invalid" or "Origin is not trusted" (after OAuth redirect)

Portainer rejects the request origin when it is accessed through a reverse proxy.

```bash
# Fix: Check the Portainer startup arguments
docker inspect portainer | python3 -c "import sys,json; c=json.load(sys.stdin)[0]['Config']; print('Entrypoint:', c.get('Entrypoint')); print('Cmd:', c.get('Cmd'))"

# Add --trusted-origins flag (or TRUSTED_ORIGINS) if missing
# This must list the external URL(s) users use to access Portainer
```

### "Token parsing failed" or blank page after redirect

The resource response doesn't contain the expected user identifier claim.

```bash
# Debug: Check what claims are in the token
# Method 1: Check Portainer logs
docker logs portainer 2>&1 | grep -i "oauth\|token\|claim" | tail -20

# Method 2: Manually call the Resource URL configured in Portainer
OAUTH_TOKEN="access-token-from-idp"
RESOURCE_URL="https://your-idp.com/oauth/userinfo"
curl -H "Authorization: Bearer $OAUTH_TOKEN" \
  "$RESOURCE_URL" | python3 -m json.tool

# Verify the configured "User Identifier" claim exists in the Resource URL response
# Common values: sub, email, preferred_username, login
```

## Diagnostic Checklist

```bash
# 1. Check OAuth settings are saved
curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/settings \
  | python3 -c "
import sys, json
s = json.load(sys.stdin)
o = s.get('OAuthSettings', {})
print('Auth Method:', s.get('AuthenticationMethod'))  # Should be 3
print('Client ID:', o.get('ClientID', 'NOT SET'))
print('Auth URI:', o.get('AuthorizationURI', 'NOT SET'))
print('Token URI:', o.get('AccessTokenURI', 'NOT SET'))
print('User Info URI:', o.get('ResourceURI', 'NOT SET'))
print('Redirect URI:', o.get('RedirectURI', 'NOT SET'))
print('User Identifier:', o.get('UserIdentifier', 'NOT SET'))
print('Scopes:', o.get('Scopes', 'NOT SET'))
"
```

## Network-Level Debugging

```bash
# If your provider supports OpenID Connect, check the discovery document
docker run --rm --network container:portainer \
  alpine/curl -sv \
  "https://your-idp.com/.well-known/openid-configuration" 2>&1 | head -30

# Check DNS resolution for the IdP from the same network namespace
docker run --rm --network container:portainer \
  alpine:3.22 nslookup your-idp.com
```

## Browser-Level Debugging

When OAuth fails silently, use browser developer tools:

1. Open DevTools → Network tab
2. Click the OAuth login button
3. Watch the redirects
4. Look for the request to your IdP and the redirect back to Portainer
5. Check the callback URL parameters for error codes

Common callback parameters on error:
```text
error=redirect_uri_mismatch
error_description=...
```

## Portainer Log Analysis

```bash
# Tail Portainer logs while reproducing the OAuth flow
# For more detail, start Portainer with --log-level DEBUG or enable debug logging in Settings
docker logs portainer -f 2>&1 | grep -i "oauth\|auth\|token\|error"

# Save recent logs for analysis
docker logs portainer --since 10m 2>&1 > portainer-auth-debug.log
grep -i "oauth\|401\|403\|error" portainer-auth-debug.log
```

## Testing OAuth Manually

Test the complete OAuth flow without Portainer:

```bash
# Step 1: Get authorization URL
CLIENT_ID="your-client-id"
REDIRECT_URI="https://portainer.example.com"
SCOPE="openid profile email"
STATE=$(openssl rand -hex 16)

AUTH_URL=$(CLIENT_ID="$CLIENT_ID" REDIRECT_URI="$REDIRECT_URI" SCOPE="$SCOPE" STATE="$STATE" \
  python3 -c 'import os, urllib.parse; print("https://your-idp.com/oauth/authorize?" + urllib.parse.urlencode({"client_id": os.environ["CLIENT_ID"], "redirect_uri": os.environ["REDIRECT_URI"], "response_type": "code", "scope": os.environ["SCOPE"], "state": os.environ["STATE"]}))')
echo "Test URL: $AUTH_URL"
# Visit this URL in a browser and note the code parameter in the callback URL

# Step 2: Exchange code for token
CODE="code-from-callback"
curl -X POST "https://your-idp.com/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&client_id=${CLIENT_ID}&client_secret=YOUR_SECRET&redirect_uri=${REDIRECT_URI}&code=${CODE}"

# Step 3: Get user info
ACCESS_TOKEN="access-token-from-step2"
RESOURCE_URL="https://your-idp.com/oauth/userinfo"  # Use the Resource URL configured in Portainer
curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  "$RESOURCE_URL"
```

## Conclusion

OAuth troubleshooting requires checking both the Portainer side (configuration, logs, network access) and the IdP side (client registration, redirect URIs, token claims). The most common issue is redirect URI mismatch - fix it by ensuring character-for-character identity between Portainer's setting and the IdP's registered URI. For harder issues, manual OAuth flow testing isolates whether the problem is in the IdP configuration or Portainer's token handling.
