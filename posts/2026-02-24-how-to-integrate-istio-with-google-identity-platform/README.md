# How to Integrate Istio with Google Identity Platform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Google Cloud, Identity Platform, Firebase Auth, OIDC

Description: Set up Google Identity Platform as your authentication provider with Istio for JWT validation and identity-aware access control in your service mesh.

---

Google Identity Platform (which builds on top of Firebase Authentication) gives you a managed identity service with support for email/password, social providers, SAML, and OIDC federation. If you are running on GKE or just want a managed identity solution that integrates well with Google Cloud, pairing Identity Platform with Istio gives you mesh-level authentication with minimal overhead.

The integration is clean because Identity Platform issues standard JWTs that Istio can validate using Google's public JWKS endpoint. You get identity propagation across your entire mesh without writing authentication code in your services.

## Setting Up Google Identity Platform

Enable the Identity Platform API in your Google Cloud project:

```bash
gcloud services enable identitytoolkit.googleapis.com
```

If you have not already upgraded from Firebase Auth to Identity Platform, do that in the Google Cloud Console under Identity Platform.

Configure your identity providers. Here is how to set up email/password and Google Sign-In:

```bash
# Enable email/password provider
gcloud identity-platform config update \
  --project=your-project-id \
  --enable-email-signin

# The Google provider is configured through the console
# Navigate to: Identity Platform > Providers > Add Provider > Google
```

Create an OAuth 2.0 client for your application in the Google Cloud Console under APIs & Services > Credentials:

- **Application type**: Web application
- **Name**: Istio Mesh Client
- **Authorized redirect URIs**: `https://app.mycompany.com/callback`

Note the Client ID and Client Secret.

## Understanding Identity Platform Tokens

Identity Platform issues Firebase ID tokens which are JWTs signed with Google's private keys. These tokens have a specific structure:

- **Issuer**: `https://securetoken.google.com/your-project-id`
- **Audience**: Your Firebase/GCP project ID
- **Subject**: The user's unique UID

The JWKS endpoint for verifying these tokens is: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`

## Configuring Istio JWT Validation

Create the RequestAuthentication resource:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: google-identity-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://securetoken.google.com/your-project-id"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "your-project-id"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

If you are also using Google service accounts for service-to-service auth, add a second rule:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: google-identity-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://securetoken.google.com/your-project-id"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "your-project-id"
      forwardOriginalToken: true
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      forwardOriginalToken: true
```

## Egress Configuration

Allow the mesh to reach Google's token verification endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: google-auth
  namespace: istio-system
spec:
  hosts:
    - "www.googleapis.com"
    - "securetoken.google.com"
    - "accounts.google.com"
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Authorization Policies

Require authentication for all services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-google-auth
  namespace: default
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notPaths: ["/healthz", "/readyz"]
```

## Custom Claims for Authorization

Identity Platform supports custom claims on user profiles. These are included in the JWT and can be used for authorization decisions.

Set custom claims using the Firebase Admin SDK:

```python
from firebase_admin import auth

# Set admin claim on a user
auth.set_custom_user_claims(uid, {'role': 'admin', 'team': 'engineering'})

# Set developer claim
auth.set_custom_user_claims(uid, {'role': 'developer', 'team': 'backend'})
```

Or using the REST API:

```bash
# Get an admin access token
ADMIN_TOKEN=$(gcloud auth print-access-token)

# Set custom claims
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:update?key=YOUR_API_KEY" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "localId": "user-uid-here",
    "customAttributes": "{\"role\": \"admin\", \"team\": \"engineering\"}"
  }'
```

Use these claims in Istio policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-access
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://securetoken.google.com/your-project-id/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: team-access
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://securetoken.google.com/your-project-id/*"]
      to:
        - operation:
            paths: ["/api/internal/*"]
      when:
        - key: request.auth.claims[team]
          values: ["engineering", "platform"]
```

## Getting Tokens for Testing

Use the Firebase Auth REST API to sign in and get a token:

```bash
# Sign in with email and password
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "userpassword",
    "returnSecureToken": true
  }' | jq -r '.idToken')
```

For service-to-service authentication using Google service accounts:

```bash
# Create a service account token
TOKEN=$(gcloud auth print-identity-token \
  --audiences=your-project-id \
  --impersonate-service-account=my-service@your-project-id.iam.gserviceaccount.com)
```

## Multi-Tenant Configuration

Identity Platform supports multi-tenancy. If you use tenants, the issuer changes:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: tenant-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://securetoken.google.com/your-project-id"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "your-project-id"
      forwardOriginalToken: true
```

Tenant information is included in the `firebase.tenant` claim. Use it to restrict access by tenant:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: tenant-isolation
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://securetoken.google.com/your-project-id/*"]
      to:
        - operation:
            paths: ["/api/tenant-a/*"]
      when:
        - key: request.auth.claims[firebase.tenant]
          values: ["tenant-a-id"]
```

## Using Workload Identity on GKE

If you are running on GKE, you can combine Identity Platform (for user auth) with GKE Workload Identity (for service auth). This gives you a unified identity model:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: combined-auth
  namespace: istio-system
spec:
  jwtRules:
    # User tokens from Identity Platform
    - issuer: "https://securetoken.google.com/your-project-id"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "your-project-id"
      forwardOriginalToken: true
    # Service account tokens from Google
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      forwardOriginalToken: true
```

## Testing the Integration

```bash
# Get token
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password","returnSecureToken":true}' \
  | jq -r '.idToken')

# Inspect token
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .

# Test authenticated access
curl -H "Authorization: Bearer $TOKEN" https://app.mycompany.com/api/data

# Test without token (should fail)
curl -s -o /dev/null -w "%{http_code}" https://app.mycompany.com/api/data
```

## Token Refresh

Identity Platform tokens expire after 1 hour. Use the refresh token to get new ID tokens:

```bash
curl -s -X POST \
  "https://securetoken.googleapis.com/v1/token?key=YOUR_API_KEY" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=YOUR_REFRESH_TOKEN" \
  | jq -r '.id_token'
```

Google Identity Platform with Istio is a natural combination especially for GKE environments. You get managed identity with support for dozens of authentication providers, and Istio handles the enforcement layer so your services stay focused on business logic.
