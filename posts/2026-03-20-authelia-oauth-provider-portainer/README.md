# How to Set Up Authelia as an OAuth Provider for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Authelia, OAuth, SSO, Self-Hosted

Description: Configure Authelia as an OpenID Connect identity provider to enable SSO login for Portainer with multi-factor authentication support.

---

Authelia is an open-source authentication and authorization server that supports OpenID Connect. Using Authelia with Portainer provides MFA, SSO, and access policies for your self-hosted container management.

## Prerequisites

- Authelia deployed and accessible
- Portainer CE or Business Edition
- Domain names for both services

## Step 1: Register Portainer in Authelia

Add a client configuration to Authelia's `configuration.yml`:

```yaml
# authelia/configuration.yml (excerpt)

identity_providers:
  oidc:
    hmac_secret: "your-hmac-secret-min-64-chars"
    jwks:
      - key_id: "example"
        algorithm: "RS256"
        use: "sig"
        key: |
          -----BEGIN PRIVATE KEY-----
          <your-private-key>
          -----END PRIVATE KEY-----

    clients:
      - client_id: portainer
        client_name: Portainer Container Management
        client_secret: "$pbkdf2-sha512$310000$..."  # PBKDF2 hash of your secret
        public: false
        authorization_policy: two_factor     # Require 2FA for Portainer
        require_pkce: false
        pkce_challenge_method: ""
        redirect_uris:
          - https://portainer.example.com
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

Generate the client secret hash:

```bash
# Generate a random secret
CLIENT_SECRET=$(openssl rand -hex 32)
echo "Client Secret: $CLIENT_SECRET"

# Hash it for Authelia config (install authelia or use docker)
docker run --rm authelia/authelia:latest \
  authelia crypto hash generate pbkdf2 --password "$CLIENT_SECRET"
```

## Step 2: Configure Portainer to Use Authelia

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

AUTHELIA_URL="https://auth.example.com"

curl -X PUT \
  https://localhost:9443/api/settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"AuthenticationMethod\": 3,
    \"OAuthSettings\": {
      \"AuthStyle\": 1,
      \"ClientID\": \"portainer\",
      \"ClientSecret\": \"$CLIENT_SECRET\",
      \"AuthorizationURI\": \"$AUTHELIA_URL/api/oidc/authorization\",
      \"AccessTokenURI\": \"$AUTHELIA_URL/api/oidc/token\",
      \"ResourceURI\": \"$AUTHELIA_URL/api/oidc/userinfo\",
      \"RedirectURI\": \"https://portainer.example.com\",
      \"UserIdentifier\": \"preferred_username\",
      \"Scopes\": \"openid profile groups email\",
      \"OAuthAutoCreateUsers\": true
    }
  }" \
  --insecure
```

## Authelia OIDC Endpoints

| Portainer Field | Authelia Value |
|-----------------|---------------|
| Authorization URL | `https://auth.example.com/api/oidc/authorization` |
| Access Token URL | `https://auth.example.com/api/oidc/token` |
| Resource URL | `https://auth.example.com/api/oidc/userinfo` |
| User Identifier | `preferred_username` |
| Scopes | `openid profile groups email` |
| Auth Style | `In Params` |

## Authelia Access Policies

If you're also protecting Portainer behind Authelia's access control integration, enforce MFA at the proxy layer with access control rules:

```yaml
# authelia/configuration.yml
access_control:
  default_policy: deny
  rules:
    # Require two-factor auth for Portainer
    - domain: portainer.example.com
      policy: two_factor
    # Allow other services with one factor
    - domain: app.example.com
      policy: one_factor
```

## Verify the Integration

1. Go to `https://portainer.example.com`
2. Click **Login with OAuth**
3. You'll be redirected to Authelia's login page
4. Complete MFA if required
5. You'll be logged into Portainer

---

*Add infrastructure monitoring to your Authelia-secured Portainer with [OneUptime](https://oneuptime.com).*
