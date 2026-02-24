# How to Integrate Istio with Okta for Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Okta, Identity, OIDC, Enterprise Security

Description: Configure Okta as your identity provider with Istio service mesh for enterprise SSO, JWT validation, and group-based authorization policies.

---

Okta is the identity provider of choice for many enterprises. If your organization already uses Okta for workforce identity, extending it to your Kubernetes service mesh running Istio is a natural fit. Your developers authenticate with the same Okta credentials they use for everything else, and Istio validates those tokens at the mesh level.

The integration follows the standard OIDC pattern: Okta issues JWTs, and Istio validates them using Okta's published JWKS keys. What makes the Okta integration interesting is how you can use Okta's rich group and attribute system for fine-grained authorization in Istio.

## Setting Up Okta

You need an Okta developer account or an existing Okta org. Log into the Okta Admin Console and set up the following:

**Create an Authorization Server:**

Go to Security > API and check if you want to use the default authorization server or create a custom one. For most cases, a custom authorization server gives you more control:

- **Name**: Mesh Services
- **Audience**: `https://api.mycompany.com`
- **Description**: Authorization server for Istio mesh services

Note the issuer URI. It will look like `https://mycompany.okta.com/oauth2/aus1234567`

**Create an Application:**

Go to Applications > Applications > Create App Integration:

- **Sign-in method**: OIDC
- **Application type**: Web Application (for user-facing) or API Services (for M2M)

For API Services (machine-to-machine):
- **Name**: Mesh Service Client
- **Grant type**: Client Credentials

Note the Client ID and Client Secret.

**Create Custom Scopes:**

In your authorization server settings, go to Scopes and add:

- `mesh.read` - Read access to mesh services
- `mesh.write` - Write access to mesh services
- `mesh.admin` - Administrative access

**Create Access Policies and Rules:**

Create an access policy that specifies which clients can request which scopes:

- **Policy Name**: Mesh Access Policy
- **Assign to**: The application you created
- **Rule**: Allow client_credentials grant for `mesh.read`, `mesh.write`, `mesh.admin` scopes

## Configuring Istio JWT Validation

Create the RequestAuthentication resource pointing to Okta:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: okta-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://mycompany.okta.com/oauth2/aus1234567"
      jwksUri: "https://mycompany.okta.com/oauth2/aus1234567/v1/keys"
      audiences:
        - "https://api.mycompany.com"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

If you are using Okta's default authorization server, the URLs look slightly different:

```yaml
jwtRules:
  - issuer: "https://mycompany.okta.com"
    jwksUri: "https://mycompany.okta.com/oauth2/v1/keys"
```

Apply the configuration:

```bash
kubectl apply -f okta-jwt.yaml
```

## Authorization Policies

Require authentication for all non-public endpoints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-okta-auth
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

Scope-based authorization:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: write-requires-scope
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://mycompany.okta.com/oauth2/aus1234567/*"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH", "DELETE"]
            paths: ["/api/*"]
      when:
        - key: request.auth.claims[scp]
          values: ["mesh.write"]
```

## Using Okta Groups for Authorization

Okta groups are powerful for organization-wide access control. To include groups in the JWT, you need to create a Groups claim in your authorization server.

In the Okta Admin Console, go to Security > API > Your Authorization Server > Claims. Add a new claim:

- **Name**: groups
- **Include in token type**: Access Token
- **Value type**: Groups
- **Filter**: Matches regex `.*` (or specify specific group name patterns)
- **Include in**: Any scope

Now JWTs from Okta include a `groups` array. Use it in Istio policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: engineering-only
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://mycompany.okta.com/oauth2/aus1234567/*"]
      to:
        - operation:
            paths: ["/api/internal/*"]
      when:
        - key: request.auth.claims[groups]
          values: ["Engineering"]
```

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ops-admin
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://mycompany.okta.com/oauth2/aus1234567/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[groups]
          values: ["Platform-Ops", "SRE"]
```

## Machine-to-Machine Authentication

Get a token using client credentials:

```bash
TOKEN=$(curl -s -X POST \
  "https://mycompany.okta.com/oauth2/aus1234567/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "scope=mesh.read mesh.write" | jq -r '.access_token')
```

Store Okta credentials as Kubernetes secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: okta-credentials
  namespace: default
type: Opaque
stringData:
  client-id: "0oa1234567"
  client-secret: "your-client-secret"
  token-url: "https://mycompany.okta.com/oauth2/aus1234567/v1/token"
  scope: "mesh.read mesh.write"
```

## User Authentication Flow

For user-facing services, implement the authorization code flow. Here is the flow:

1. User hits your app, which redirects to Okta
2. User authenticates in Okta (SSO, MFA, whatever is configured)
3. Okta redirects back with an authorization code
4. Your app exchanges the code for tokens
5. Your app sends the access token as a Bearer token with every request to mesh services

The authorization URL:

```
https://mycompany.okta.com/oauth2/aus1234567/v1/authorize?
  client_id=your-client-id&
  response_type=code&
  scope=openid+profile+email+mesh.read&
  redirect_uri=https://app.mycompany.com/callback&
  state=random-state-string
```

Exchange the code for tokens:

```bash
curl -s -X POST "https://mycompany.okta.com/oauth2/aus1234567/v1/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "code=the-authorization-code" \
  -d "redirect_uri=https://app.mycompany.com/callback"
```

## Token Introspection as a Fallback

If you have opaque tokens instead of JWTs (some Okta configurations use these), you cannot validate them locally in Istio. In that case, use Istio's external authorization to call Okta's introspection endpoint:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: okta-ext-authz
        envoyExtAuthzHttp:
          service: okta-authz-proxy.default.svc.cluster.local
          port: "8080"
          includeRequestHeadersInCheck:
            - authorization
```

But honestly, configuring Okta to issue JWTs (which is the default for custom authorization servers) is much simpler and more performant than using token introspection.

## Troubleshooting

Common issues and how to fix them:

**Token rejected with "Jwt issuer is not configured"**: The issuer in the token does not match your RequestAuthentication. Check the exact issuer URL, including any path segments and trailing slashes.

```bash
# Decode and check the issuer
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .iss
```

**JWKS fetch timeout**: Istio needs to reach Okta's JWKS endpoint. If you have strict egress policies, add a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: okta
  namespace: istio-system
spec:
  hosts:
    - mycompany.okta.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

**Groups claim not in token**: Make sure the Groups claim is configured in the correct authorization server and is set to include in the access token, not just the ID token.

Okta with Istio gives you enterprise-grade identity management backed by a mature platform. The Okta admin console, lifecycle management, and federation capabilities handle the identity complexity so your Istio policies stay clean and focused on authorization.
