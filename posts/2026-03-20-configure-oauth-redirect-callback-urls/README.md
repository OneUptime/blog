# How to Configure OAuth Redirect and Callback URLs in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, OAuth, Redirect URL, Configuration, Troubleshooting

Description: Learn how to correctly configure OAuth redirect and callback URLs in Portainer to prevent redirect_uri_mismatch errors.

---

One of the most common OAuth configuration errors is a mismatch between the redirect URL configured in Portainer and the URL registered in your OAuth provider. This guide explains how to set these correctly.

## Understanding the Redirect URL

The OAuth redirect URL (also called callback URL) is where your IdP sends the user after successful authentication. It must:
1. Match **exactly** what's registered in your OAuth provider
2. Be the base URL of your Portainer instance (with trailing slash)
3. Use HTTPS in production

## Finding Your Portainer URL

The redirect URL is your Portainer's public-facing URL:

```text
https://portainer.example.com/
```

Portainer's UI uses `http://yourportainer.com/` (with trailing slash) as the placeholder, and this value is passed straight through to the OAuth flow. The `redirect_uri_mismatch` error is returned by your OAuth provider when the URI you send does not match what's registered there byte-for-byte - so whatever form you choose (with or without trailing slash), it must match exactly on both sides.

## Common Redirect URL Formats

| Scenario | Redirect URL |
|----------|-------------|
| Standard HTTPS | `https://portainer.example.com/` |
| Custom port | `https://portainer.example.com:9443/` |
| IP address | `https://192.168.1.100:9443/` |
| Subpath | `https://example.com/portainer/` |
| Localhost (dev) | `http://localhost:9000/` |

## Configure in Portainer

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Set the correct redirect URI

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "OAuthSettings": {
      "RedirectURI": "https://portainer.example.com/"
    }
  }' \
  --insecure
```

## Register the Redirect URL in Your OAuth Provider

### GitHub

1. Go to **Settings > Developer Settings > OAuth Apps > [Your App]**
2. Set **Authorization callback URL**: `https://portainer.example.com/`

### Azure AD

1. Go to **App Registrations > [Your App] > Authentication**
2. Under **Redirect URIs** (Web platform), add: `https://portainer.example.com/`

### Google

1. Go to **APIs & Services > Credentials > [Your OAuth Client]**
2. Under **Authorized redirect URIs**, add: `https://portainer.example.com/`

### Keycloak

1. In your client settings, set **Valid redirect URIs**: `https://portainer.example.com/`

## Troubleshoot redirect_uri_mismatch

```bash
# Check what redirect URI Portainer is using
curl -s https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
s = json.load(sys.stdin)
oauth = s.get('OAuthSettings', {})
print(f'Redirect URI configured: {oauth.get(\"RedirectURI\", \"not set\")}')
"
```

Common causes:
- **Missing trailing slash**: `https://portainer.example.com` vs `https://portainer.example.com/`
- **HTTP vs HTTPS mismatch**: Provider requires HTTPS but URL uses HTTP
- **Port mismatch**: Provider registered without port, Portainer URL includes port
- **Subdomain mismatch**: `www.portainer.example.com` vs `portainer.example.com`

---

*Monitor your OAuth-enabled Portainer availability with [OneUptime](https://oneuptime.com).*
