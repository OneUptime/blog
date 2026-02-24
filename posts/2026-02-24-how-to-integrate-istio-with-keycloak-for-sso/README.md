# How to Integrate Istio with Keycloak for SSO

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Keycloak, SSO, Authentication, OIDC

Description: Step-by-step instructions for integrating Keycloak with Istio to enable single sign-on across your service mesh using JWT validation and OIDC.

---

Keycloak is probably the most popular open-source identity and access management platform out there. It handles user federation, identity brokering, social login, and comes with a full-featured admin console. When you combine it with Istio, you get SSO across your entire service mesh where authentication is handled at the proxy layer.

The setup works by having Keycloak issue JWTs that Istio validates on every request. Users authenticate once through Keycloak, get a token, and that token works across all services in the mesh.

## Deploying Keycloak

Deploy Keycloak in your cluster. For production, you want it backed by a proper database, but for getting started, the embedded H2 database works fine:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keycloak
  namespace: keycloak
spec:
  replicas: 1
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
        - name: keycloak
          image: quay.io/keycloak/keycloak:23.0
          args: ["start-dev"]
          env:
            - name: KEYCLOAK_ADMIN
              value: admin
            - name: KEYCLOAK_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-admin
                  key: password
            - name: KC_PROXY
              value: edge
            - name: KC_HOSTNAME
              value: keycloak.mycompany.com
            - name: KC_DB
              value: postgres
            - name: KC_DB_URL
              value: "jdbc:postgresql://keycloak-db.keycloak.svc.cluster.local:5432/keycloak"
            - name: KC_DB_USERNAME
              value: keycloak
            - name: KC_DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: keycloak-db-secret
                  key: password
          ports:
            - containerPort: 8080
              name: http
          readinessProbe:
            httpGet:
              path: /realms/master
              port: 8080
            initialDelaySeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: keycloak
  namespace: keycloak
spec:
  selector:
    app: keycloak
  ports:
    - port: 8080
      targetPort: 8080
      name: http
```

## Exposing Keycloak Through Istio Gateway

Keycloak needs to be accessible externally for user authentication:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: keycloak
  namespace: keycloak
spec:
  hosts:
    - keycloak.mycompany.com
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: keycloak.keycloak.svc.cluster.local
            port:
              number: 8080
```

## Configuring the Keycloak Realm

Once Keycloak is running, create a realm and client for your mesh. You can do this through the admin UI at `https://keycloak.mycompany.com/admin` or via the REST API:

```bash
# Get admin token
ADMIN_TOKEN=$(curl -s -X POST \
  "https://keycloak.mycompany.com/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=your-admin-password" \
  -d "grant_type=password" | jq -r '.access_token')

# Create realm
curl -s -X POST \
  "https://keycloak.mycompany.com/admin/realms" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "realm": "mesh",
    "enabled": true,
    "sslRequired": "external",
    "registrationAllowed": false
  }'

# Create client
curl -s -X POST \
  "https://keycloak.mycompany.com/admin/realms/mesh/clients" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "istio-mesh",
    "enabled": true,
    "protocol": "openid-connect",
    "publicClient": false,
    "secret": "your-client-secret",
    "redirectUris": ["https://*.mycompany.com/*"],
    "webOrigins": ["https://*.mycompany.com"],
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": true,
    "authorizationServicesEnabled": false,
    "standardFlowEnabled": true
  }'
```

## Adding Roles and Groups

Create roles in Keycloak that map to authorization decisions in Istio:

```bash
# Create realm roles
curl -s -X POST \
  "https://keycloak.mycompany.com/admin/realms/mesh/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "admin"}'

curl -s -X POST \
  "https://keycloak.mycompany.com/admin/realms/mesh/roles" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "developer"}'
```

Configure a client mapper to include roles in the JWT:

```bash
CLIENT_ID=$(curl -s \
  "https://keycloak.mycompany.com/admin/realms/mesh/clients?clientId=istio-mesh" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0].id')

curl -s -X POST \
  "https://keycloak.mycompany.com/admin/realms/mesh/clients/$CLIENT_ID/protocol-mappers/models" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "realm-roles",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-usermodel-realm-role-mapper",
    "config": {
      "claim.name": "roles",
      "jsonType.label": "String",
      "multivalued": "true",
      "id.token.claim": "true",
      "access.token.claim": "true",
      "userinfo.token.claim": "true"
    }
  }'
```

## Configuring Istio Request Authentication

Now set up Istio to validate Keycloak JWTs:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: keycloak-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://keycloak.mycompany.com/realms/mesh"
      jwksUri: "https://keycloak.mycompany.com/realms/mesh/protocol/openid-connect/certs"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

## Authorization Policies

Deny unauthenticated requests:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-keycloak-auth
  namespace: default
spec:
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
      to:
        - operation:
            notPaths: ["/healthz", "/readyz", "/public/*"]
```

Role-based authorization:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-endpoints
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://keycloak.mycompany.com/realms/mesh/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[roles]
          values: ["admin"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: developer-endpoints
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://keycloak.mycompany.com/realms/mesh/*"]
      to:
        - operation:
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[roles]
          values: ["developer", "admin"]
```

## Getting Tokens for Testing

Get a token using the direct access grant (password grant):

```bash
TOKEN=$(curl -s -X POST \
  "https://keycloak.mycompany.com/realms/mesh/protocol/openid-connect/token" \
  -d "client_id=istio-mesh" \
  -d "client_secret=your-client-secret" \
  -d "username=testuser" \
  -d "password=testpassword" \
  -d "grant_type=password" \
  -d "scope=openid" | jq -r '.access_token')

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" https://app.mycompany.com/api/data
```

For service accounts:

```bash
TOKEN=$(curl -s -X POST \
  "https://keycloak.mycompany.com/realms/mesh/protocol/openid-connect/token" \
  -d "client_id=istio-mesh" \
  -d "client_secret=your-client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=openid" | jq -r '.access_token')
```

## SSO Across Multiple Services

The beauty of this setup is that one Keycloak token works across all services in the mesh. A user logs into Service A through the Keycloak login page and gets a JWT. That same JWT is valid for Service B, Service C, and any other service behind Istio. True single sign-on.

For web applications, use the Authorization Code flow. Set up each frontend application as a Keycloak client, all in the same realm. The session is shared through the Keycloak session cookie, so when a user logs into one application and navigates to another, Keycloak automatically issues a token without requiring another login.

## Monitoring and Troubleshooting

Check if Istio is correctly fetching Keycloak's JWKS:

```bash
kubectl logs -n istio-system deploy/istiod | grep -i "jwks\|jwt"
```

Inspect a JWT to see what claims are included:

```bash
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

If Istio rejects tokens, check that the issuer in the token matches exactly what you configured in the RequestAuthentication resource. Also verify that the Keycloak JWKS endpoint is reachable from the istiod pod.

Keycloak and Istio together give you enterprise-grade SSO for your service mesh. User management, role assignment, identity federation, and MFA all happen in Keycloak. Token validation and authorization enforcement happen in Istio. Clean separation, minimal code changes.
