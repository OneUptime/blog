# How to Set Up Request Authentication with Google Auth in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Google Auth, JWT, RequestAuthentication, OAuth

Description: How to configure Istio to validate Google-issued JWT tokens using RequestAuthentication for Google OAuth and service account authentication.

---

Google issues JWTs through several different flows - Google Sign-In for web apps, Google service accounts for machine-to-machine communication, and Google Identity Platform for general OAuth. Each uses slightly different issuer URLs and token formats. Here's how to configure Istio to validate tokens from each of these.

## Google's JWT Endpoints

Google provides a few different token issuers:

| Flow | Issuer | JWKS URI |
|------|--------|----------|
| Google Sign-In / OAuth | `https://accounts.google.com` | `https://www.googleapis.com/oauth2/v3/certs` |
| Google Service Accounts | `https://accounts.google.com` | `https://www.googleapis.com/oauth2/v3/certs` |
| Firebase Auth | `https://securetoken.google.com/<project-id>` | `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` |

You can verify Google's OpenID Connect configuration:

```bash
curl -s https://accounts.google.com/.well-known/openid-configuration | python3 -m json.tool
```

## Setting Up Google OAuth Token Validation

For validating tokens from Google Sign-In or Google OAuth:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: google-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      audiences:
        - "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
      forwardOriginalToken: true
```

Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Google OAuth client ID. This is the client ID you get from the Google Cloud Console under APIs & Services > Credentials.

## Google Service Account Tokens

When services authenticate using Google service account keys, they generate JWTs signed with the service account's private key. These tokens have `https://accounts.google.com` as the issuer.

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: google-sa-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      audiences:
        - "https://api.example.com"
```

For self-signed JWTs from a specific service account, the JWKS URI is different:

```yaml
jwtRules:
  - issuer: "my-service@my-project.iam.gserviceaccount.com"
    jwksUri: "https://www.googleapis.com/robot/v1/metadata/jwk/my-service@my-project.iam.gserviceaccount.com"
    audiences:
      - "https://api.example.com"
```

## Generating a Google Service Account Token

To get a test token using a Google service account:

```bash
# Using gcloud
gcloud auth print-identity-token --audiences=https://api.example.com
```

Or programmatically with a service account key file:

```bash
# Install google-auth library
pip install google-auth

python3 -c "
from google.oauth2 import service_account
import google.auth.transport.requests

credentials = service_account.IDTokenCredentials.from_service_account_file(
    'service-account-key.json',
    target_audience='https://api.example.com'
)
request = google.auth.transport.requests.Request()
credentials.refresh(request)
print(credentials.token)
"
```

## Adding the AuthorizationPolicy

Block requests without valid Google tokens:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-google-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
```

## Restricting to Specific Google Accounts

You can use AuthorizationPolicy to restrict access to tokens from specific Google accounts by checking the `sub` (subject) claim or email:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-accounts
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals:
              - "https://accounts.google.com/1234567890"
    - when:
        - key: request.auth.claims[email]
          values:
            - "service-a@my-project.iam.gserviceaccount.com"
            - "service-b@my-project.iam.gserviceaccount.com"
```

The `requestPrincipal` for Google tokens follows the format `<issuer>/<subject>`.

## Handling Both Google OAuth and Service Accounts

If your API accepts tokens from both end users (Google Sign-In) and service accounts, configure both:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: google-multi-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    # Google OAuth / Sign-In tokens
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      audiences:
        - "YOUR_CLIENT_ID.apps.googleusercontent.com"
      forwardOriginalToken: true
    # Self-signed service account tokens
    - issuer: "my-service@my-project.iam.gserviceaccount.com"
      jwksUri: "https://www.googleapis.com/robot/v1/metadata/jwk/my-service@my-project.iam.gserviceaccount.com"
      audiences:
        - "https://api.example.com"
      forwardOriginalToken: true
```

## Testing

Test with a Google OAuth token:

```bash
# Get a token (requires gcloud configured with OAuth)
TOKEN=$(gcloud auth print-identity-token --audiences=YOUR_CLIENT_ID.apps.googleusercontent.com)

kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://api-server.backend:8080/api/data
```

Test with a service account token:

```bash
SA_TOKEN=$(gcloud auth print-identity-token \
  --impersonate-service-account=my-service@my-project.iam.gserviceaccount.com \
  --audiences=https://api.example.com)

kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $SA_TOKEN" \
  http://api-server.backend:8080/api/data
```

## Google-Specific Tips

### ID Tokens vs Access Tokens

Google issues two types of tokens:
- **ID tokens** - JWTs that contain user identity. These are what you validate with Istio.
- **Access tokens** - Opaque tokens for calling Google APIs. These are NOT JWTs and cannot be validated by Istio.

Make sure your clients send ID tokens, not access tokens.

### Token Audience

Google ID tokens have a specific audience. For Google Sign-In, the audience is your OAuth client ID. For service accounts, it's whatever you set as the `target_audience`. The audience in your RequestAuthentication must match.

### GKE Workload Identity

If you're running on GKE with Workload Identity, pods can get Google tokens automatically. The tokens are issued by `https://accounts.google.com` and the subject is the Kubernetes service account's Google identity.

### Reachability

Google's JWKS endpoints (`www.googleapis.com`) are publicly accessible, so reachability from your cluster shouldn't be an issue unless you have restrictive egress policies. If you do, make sure your Istio egress or network policies allow HTTPS to `www.googleapis.com`.

## Complete Example

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: google-auth
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      audiences:
        - "123456789.apps.googleusercontent.com"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-google-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/ready"]
```

Google's JWT infrastructure is reliable and well-documented. The key things to get right are using the correct issuer (`https://accounts.google.com` for most cases), the right JWKS URI, and making sure your audience matches your Google client ID or target audience.
