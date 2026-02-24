# How to Set Up Request Authentication with Keycloak in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Keycloak, JWT, RequestAuthentication, Authentication

Description: Step-by-step guide to integrating Keycloak as an identity provider with Istio for JWT-based request authentication in your mesh.

---

Keycloak is a popular open-source identity provider that many teams run inside their own Kubernetes clusters. Integrating it with Istio for JWT validation is a natural fit because the JWKS endpoint is right there in the cluster, making it fast and reliable. Here's how to set it all up.

## Keycloak's Endpoints

Keycloak organizes everything into realms. Each realm has its own issuer URL and JWKS endpoint:

- **Issuer:** `https://<keycloak-host>/realms/<realm-name>`
- **JWKS URI:** `https://<keycloak-host>/realms/<realm-name>/protocol/openid-connect/certs`
- **Token endpoint:** `https://<keycloak-host>/realms/<realm-name>/protocol/openid-connect/token`
- **OpenID Discovery:** `https://<keycloak-host>/realms/<realm-name>/.well-known/openid-configuration`

If Keycloak is running inside the cluster, the host might be something like `keycloak.auth.svc.cluster.local`. If it's exposed externally, it's whatever your external domain is.

Verify the configuration:

```bash
curl -s https://keycloak.example.com/realms/myrealm/.well-known/openid-configuration | python3 -m json.tool
```

## Setting Up Keycloak

Before configuring Istio, make sure you have a client configured in Keycloak:

1. Create a realm (or use an existing one).
2. Create a client with "Client authentication" enabled for service-to-service communication, or a public client for browser-based apps.
3. Note the client ID and client secret.
4. Optionally create roles and assign them to users or service accounts.

## Creating the RequestAuthentication

For Keycloak running inside the cluster:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: keycloak-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://keycloak.example.com/realms/myrealm"
      jwksUri: "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs"
      forwardOriginalToken: true
```

If Keycloak is inside the cluster and you're using internal DNS:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: keycloak-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://keycloak.example.com/realms/myrealm"
      jwksUri: "http://keycloak.auth.svc.cluster.local:8080/realms/myrealm/protocol/openid-connect/certs"
      forwardOriginalToken: true
```

Notice the issuer stays as the external URL (because that's what's in the token's `iss` claim), but the JWKS URI can use the internal cluster address for faster key fetching.

## Important: Issuer vs JWKS URI

The `issuer` field must match the `iss` claim in the JWT exactly. Keycloak sets the issuer based on the URL clients use to obtain tokens. If your users get tokens through `https://keycloak.example.com`, the issuer will be `https://keycloak.example.com/realms/myrealm`.

The `jwksUri` just needs to be reachable from the Envoy sidecar. It doesn't need to match the issuer domain. This is useful when Keycloak is in the cluster but tokens are issued through an external URL.

## Adding Audience Validation

Keycloak access tokens include an `aud` claim by default. You can configure which audiences appear in the token using client scopes in Keycloak.

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: keycloak-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://keycloak.example.com/realms/myrealm"
      jwksUri: "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/certs"
      audiences:
        - "my-api"
        - "account"
      forwardOriginalToken: true
```

Check your token to see what audiences are set:

```bash
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool | grep aud
```

## Getting a Test Token

Using the client credentials grant:

```bash
TOKEN=$(curl -s -X POST \
  https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=my-client" \
  -d "client_secret=my-client-secret" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

echo "$TOKEN"
```

Using the password grant (for testing with a user):

```bash
TOKEN=$(curl -s -X POST \
  https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=my-client" \
  -d "username=testuser" \
  -d "password=testpassword" | python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
```

## Requiring Authentication

Pair the RequestAuthentication with an AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-keycloak-jwt
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

## Role-Based Authorization with Keycloak Roles

Keycloak tokens include realm roles and client roles. These appear in the token payload under `realm_access.roles` and `resource_access.<client>.roles`.

A typical Keycloak token payload looks like:

```json
{
  "realm_access": {
    "roles": ["admin", "user"]
  },
  "resource_access": {
    "my-client": {
      "roles": ["manage-users"]
    }
  }
}
```

You can use AuthorizationPolicy to check these nested claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin-role
  namespace: backend
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
    - when:
        - key: request.auth.claims[realm_access][roles]
          values: ["admin"]
```

## Testing the Full Setup

```bash
# Without token - expect 403
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  http://api-server.backend:8080/api/data

# With valid Keycloak token - expect 200
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://api-server.backend:8080/api/data

# With expired token - expect 401
kubectl exec deploy/sleep -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer expired.token.here" \
  http://api-server.backend:8080/api/data
```

## Keycloak-Specific Gotchas

### Frontend URL Configuration

Keycloak has a "Frontend URL" setting that determines the issuer in tokens. If this isn't set correctly, the `iss` claim won't match your RequestAuthentication. Check it in the Keycloak admin console under Realm Settings.

### Keycloak Behind a Reverse Proxy

If Keycloak is behind nginx or another proxy, make sure the proxy passes the correct `Host` header and the `X-Forwarded-Proto` header. Otherwise, Keycloak might generate tokens with an incorrect issuer (like `http://` instead of `https://`).

### Token Lifespan

Keycloak access tokens default to 5 minutes. For testing, you might want to increase this in Client Settings > Advanced > Access Token Lifespan. But keep it short in production.

### Internal vs External JWKS

When Keycloak runs in the cluster, the sidecar might not be able to reach the external JWKS URL if DNS doesn't resolve the external domain from inside the cluster. Use the internal cluster DNS for `jwksUri` while keeping the external URL as the `issuer`.

## Full Configuration Example

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: keycloak-jwt
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  jwtRules:
    - issuer: "https://keycloak.example.com/realms/production"
      jwksUri: "http://keycloak.auth.svc.cluster.local:8080/realms/production/protocol/openid-connect/certs"
      audiences:
        - "my-api"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
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

Keycloak and Istio work well together. The main things to get right are the issuer URL (check your Keycloak frontend URL setting), the JWKS URI (use internal DNS if possible), and the audience configuration. Once those are set, token validation happens transparently at the mesh level.
