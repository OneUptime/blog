# How to Set Up Request Authentication with Firebase in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Firebase, JWT, RequestAuthentication, Authentication

Description: How to configure Istio to validate Firebase Authentication tokens using RequestAuthentication for securing your mesh services.

---

Firebase Authentication is widely used for mobile and web apps. It issues JWTs that you can validate at the Istio mesh level, letting your backend services trust that incoming requests come from authenticated Firebase users without implementing any token validation code in your apps.

## Firebase JWT Details

Firebase Auth tokens have these characteristics:

- **Issuer:** `https://securetoken.google.com/<firebase-project-id>`
- **JWKS URI:** `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
- **Audience:** Your Firebase project ID
- **Algorithm:** RS256

The issuer includes your Firebase project ID, which you can find in the Firebase console under Project Settings.

Verify the configuration:

```bash
# Check the JWKS endpoint
curl -s https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com | python3 -m json.tool
```

## Creating the RequestAuthentication

Replace `my-firebase-project` with your actual Firebase project ID:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: firebase-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://securetoken.google.com/my-firebase-project"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "my-firebase-project"
      forwardOriginalToken: true
```

Apply it:

```bash
kubectl apply -f firebase-request-auth.yaml
```

## Blocking Unauthenticated Requests

Add an AuthorizationPolicy to require authentication:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-firebase-jwt
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

## Getting a Test Token

Firebase tokens come from the client side. Here's how to get one for testing:

Using the Firebase Admin SDK (Python):

```bash
pip install firebase-admin
```

```python
import firebase_admin
from firebase_admin import auth

firebase_admin.initialize_app()

# Create a custom token for a test user
custom_token = auth.create_custom_token('test-user-uid')
print(custom_token.decode('utf-8'))
```

The custom token then needs to be exchanged for an ID token using the Firebase client SDK or the REST API:

```bash
curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$CUSTOM_TOKEN\", \"returnSecureToken\": true}" | python3 -m json.tool
```

The `idToken` in the response is the JWT you pass to your API.

For testing with an existing user's email and password:

```bash
TOKEN=$(curl -s -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword","returnSecureToken":true}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['idToken'])")
```

## Understanding Firebase Token Claims

A decoded Firebase ID token looks like this:

```json
{
  "iss": "https://securetoken.google.com/my-firebase-project",
  "aud": "my-firebase-project",
  "auth_time": 1708700000,
  "user_id": "abc123",
  "sub": "abc123",
  "iat": 1708700000,
  "exp": 1708703600,
  "email": "user@example.com",
  "email_verified": true,
  "firebase": {
    "identities": {
      "email": ["user@example.com"]
    },
    "sign_in_provider": "password"
  }
}
```

Key claims:
- `sub` / `user_id` - The Firebase user's unique ID
- `email` - The user's email address
- `email_verified` - Whether the email is verified
- `firebase.sign_in_provider` - How the user authenticated (password, google.com, etc.)

## Authorization Based on Firebase Claims

You can use Istio's AuthorizationPolicy to check Firebase token claims:

```yaml
# Only allow verified email users
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-verified-email
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[email_verified]
          values: ["true"]
```

Or restrict to specific users:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-specific-users
  namespace: backend
spec:
  selector:
    matchLabels:
      app: admin-panel
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[email]
          values:
            - "admin@example.com"
            - "ops@example.com"
```

## Firebase Custom Claims

Firebase allows you to set custom claims on user tokens using the Admin SDK. These are useful for role-based access control.

Set custom claims (server-side):

```python
from firebase_admin import auth

auth.set_custom_user_claims('user-uid', {'admin': True, 'role': 'editor'})
```

Then validate with Istio:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin
  namespace: backend
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[admin]
          values: ["true"]
```

## Testing the Setup

```bash
# Without token - should get 403
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend:8080/api/data

# With valid Firebase ID token - should get 200
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://api-server.backend:8080/api/data

# With expired token - should get 401
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer expired-token" \
  http://api-server.backend:8080/api/data
```

## Firebase-Specific Considerations

### Token Expiration

Firebase ID tokens expire after 1 hour. The client SDK handles refresh automatically, but make sure your API clients handle 401 responses by refreshing the token and retrying.

### Multiple Firebase Projects

If your API accepts tokens from multiple Firebase projects (for example, a staging and production project):

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: firebase-multi
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://securetoken.google.com/my-project-prod"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "my-project-prod"
    - issuer: "https://securetoken.google.com/my-project-staging"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "my-project-staging"
```

Both use the same JWKS URI since Firebase uses a shared signing key for all projects.

### Combining Firebase with Other Auth Providers

You might have Firebase for mobile/web users and a different provider for service-to-service auth:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: multi-provider
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://securetoken.google.com/my-firebase-project"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "my-firebase-project"
    - issuer: "https://auth.internal.example.com"
      jwksUri: "https://auth.internal.example.com/.well-known/jwks.json"
```

## Debugging

```bash
# Check proxy logs for JWT errors
kubectl logs deploy/api-server -n backend -c istio-proxy --tail=50 | grep -i jwt

# Decode a Firebase token to check claims
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool

# Verify the JWKS endpoint is reachable
kubectl exec deploy/sleep -c sleep -- \
  curl -s https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
```

Firebase and Istio are a strong combination for mobile-backend architectures. The setup is straightforward since Firebase uses Google's well-maintained JWKS infrastructure. Just make sure your project ID is correct in both the issuer and audiences fields, and you're good to go.
