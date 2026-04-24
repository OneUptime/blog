# How to Set Up Authelia as an OAuth Provider for Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Authelia, OAuth, Self-Hosted, Authentication, OpenID Connect

Description: Configure Authelia as an OIDC provider for Portainer, enabling self-hosted SSO with multi-factor authentication support.

## Introduction

Authelia is a self-hosted authentication server that provides SSO and MFA for web applications. It supports OpenID Connect (OIDC), making it compatible with Portainer's OAuth authentication. This guide configures Authelia as Portainer's OIDC provider.

## Prerequisites

- Authelia running and accessible
- Portainer running on HTTPS
- Authelia configured with a users database or LDAP backend

## Step 1: Configure Authelia OIDC Client

Add a client configuration to Authelia's `configuration.yml`:

```yaml
identity_providers:
  oidc:
    # HMAC secret for signing tokens (generate with: openssl rand -hex 32)
    hmac_secret: "your_hmac_secret_here"

    # RSA private key for signing ID tokens
    jwks:
      - key_id: portainer
        algorithm: RS256
        use: sig
        key: |
          -----BEGIN PRIVATE KEY-----
          (your private key here)
          -----END PRIVATE KEY-----

    clients:
      - client_id: portainer
        client_name: Portainer Container Management
        client_secret: "$pbkdf2-sha512$310000$hashed_client_secret"
        # Generate hashed secret: authelia crypto hash generate pbkdf2 --variant sha512 --password 'your_secret'

        public: false
        authorization_policy: two_factor  # Require 2FA for Portainer
        redirect_uris:
          - https://portainer.example.com/
        scopes:
          - openid
          - profile
          - email
          - groups
        response_types:
          - code
        grant_types:
          - authorization_code
        access_token_signed_response_alg: none
        userinfo_signed_response_alg: none
        token_endpoint_auth_method: client_secret_post
```

```bash
# Generate a client secret hash for Authelia

docker run authelia/authelia:latest \
  authelia crypto hash generate pbkdf2 \
  --variant sha512 \
  --password 'your-portainer-client-secret'
```

## Step 2: Restart Authelia

```bash
# Reload Authelia configuration
docker restart authelia

# Check Authelia logs for OIDC initialization
docker logs authelia 2>&1 | grep -i "oidc\|openid"

# Verify the discovery endpoint
curl -s https://authelia.example.com/.well-known/openid-configuration | python3 -m json.tool
```

## Step 3: Configure Portainer for Authelia OAuth

Collect the OIDC endpoints:

```bash
# Get all endpoints from Authelia's discovery document
curl -s https://authelia.example.com/.well-known/openid-configuration \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Authorization URL:', d['authorization_endpoint'])
print('Token URL:', d['token_endpoint'])
print('UserInfo URL:', d['userinfo_endpoint'])
"
```

In Settings → Authentication → OAuth → Custom:

```text
Client ID:         portainer
Client Secret:     your-portainer-client-secret (unhashed)
Authorization URL: https://authelia.example.com/api/oidc/authorization
Access Token URL:  https://authelia.example.com/api/oidc/token
Resource URL:      https://authelia.example.com/api/oidc/userinfo
Redirect URL:      https://portainer.example.com/
User Identifier:   preferred_username
Scopes:            openid profile email groups
Auth Style:        In Params
```

## Step 4: Configure via API

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
      "ClientID": "portainer",
      "ClientSecret": "your-portainer-client-secret",
      "AuthorizationURI": "https://authelia.example.com/api/oidc/authorization",
      "AccessTokenURI": "https://authelia.example.com/api/oidc/token",
      "ResourceURI": "https://authelia.example.com/api/oidc/userinfo",
      "RedirectURI": "https://portainer.example.com/",
      "UserIdentifier": "preferred_username",
      "Scopes": "openid profile email groups",
      "AuthStyle": 1,
      "OAuthAutoCreateUsers": true,
      "SSO": true
    }
  }'
```

## Authelia Access Control Rules

For this setup, you do not use Authelia `access_control` rules to authorize the OIDC client. Access for Portainer is controlled by the OIDC client's `authorization_policy` setting above.

## Verifying the Setup

1. Log out of Portainer
2. Click the OAuth login button
3. Should redirect to Authelia's login page
4. Authenticate (with 2FA if configured)
5. Should redirect back to Portainer and be logged in

## Conclusion

Authelia as an OIDC provider gives Portainer enterprise-grade authentication including MFA, access policies, and self-hosted control over user data. The key is configuring the OIDC client in Authelia with the correct redirect URI and scopes, then entering the discovery-provided endpoints in Portainer's OAuth settings.
