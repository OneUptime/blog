# How to Use Dapr with Keycloak

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Keycloak, Authentication, JWT, OAuth2

Description: Integrate self-hosted Keycloak with Dapr JWT middleware to validate realm tokens and forward user roles and attributes to downstream microservices.

---

## Keycloak and Dapr

Keycloak is a popular self-hosted identity provider that issues JWTs. Dapr's bearer token middleware uses Keycloak's JWKS endpoint to validate tokens, enabling you to protect services without writing auth code.

## Keycloak Setup

```bash
# Deploy Keycloak on Kubernetes
kubectl apply -f https://raw.githubusercontent.com/keycloak/keycloak-k8s-resources/24.0.0/kubernetes/keycloaks.k8s.keycloak.org-v1.yml

# Or use Helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install keycloak bitnami/keycloak \
  --set auth.adminUser=admin \
  --set auth.adminPassword=admin \
  -n keycloak --create-namespace
```

After Keycloak starts:
1. Create a realm: `my-realm`
2. Create a client: `dapr-microservices` (disable Client authentication and all Authentication flow checkboxes)
3. Note the client ID and realm URL

## JWKS Endpoint

Keycloak exposes JWKS at:

```yaml
https://keycloak.example.com/realms/my-realm/protocol/openid-connect/certs
```

## Dapr Middleware Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: keycloak-validator
  namespace: default
spec:
  type: middleware.http.bearer
  version: v1
  metadata:
  - name: jwksURL
    value: "https://keycloak.example.com/realms/my-realm/protocol/openid-connect/certs"
  - name: audience
    value: "dapr-microservices"
  - name: issuer
    value: "https://keycloak.example.com/realms/my-realm"
```

## Applying to the HTTP Pipeline

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: keycloak-config
  namespace: default
spec:
  httpPipeline:
    handlers:
    - name: keycloak-validator
      type: middleware.http.bearer
```

## Getting a Keycloak Token

```bash
# Password grant (for testing)
TOKEN=$(curl -s -X POST \
  https://keycloak.example.com/realms/my-realm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=dapr-microservices" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "username=testuser" \
  -d "password=testpass" \
  -d "grant_type=password" | jq -r '.access_token')

echo $TOKEN
```

## Extracting Keycloak Roles in Your Service

```python
import json
import base64
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()

def decode_jwt_claims(request: Request) -> dict:
    # Dapr has already validated the token; extract claims from the payload
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return {}
    token = auth[len("Bearer "):]
    # JWT payload is the second base64url-encoded segment
    payload = token.split(".")[1]
    # Add padding if needed
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))

def get_realm_roles(request: Request) -> list[str]:
    # Keycloak includes realm roles in the realm_access claim
    claims = decode_jwt_claims(request)
    return claims.get("realm_access", {}).get("roles", [])

def get_client_roles(request: Request, client: str = "dapr-microservices") -> list[str]:
    claims = decode_jwt_claims(request)
    return claims.get("resource_access", {}).get(client, {}).get("roles", [])

@app.get("/api/admin/users")
async def list_users(request: Request):
    roles = get_realm_roles(request)
    if "admin" not in roles:
        raise HTTPException(403, "admin role required")
    return await user_service.list_all()

@app.get("/api/reports")
async def get_reports(request: Request):
    client_roles = get_client_roles(request)
    if "report-viewer" not in client_roles:
        raise HTTPException(403, "report-viewer role required")
    return await report_service.get_all()
```

## Testing the Integration

```bash
# Call service with Keycloak token
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3500/v1.0/invoke/api-service/method/admin/users
```

## Summary

Keycloak's self-hosted nature makes it a good choice for organizations that need full control over their identity provider. Dapr's bearer token middleware integrates with Keycloak's JWKS endpoint with no additional dependencies. Since Dapr validates the token and forwards the original Authorization header, your service can decode the JWT payload to extract realm roles and client roles for fine-grained authorization without an external verification step.
