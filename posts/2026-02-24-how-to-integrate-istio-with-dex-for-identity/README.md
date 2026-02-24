# How to Integrate Istio with Dex for Identity

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Dex, Identity, OIDC, Authentication

Description: A hands-on guide to integrating Dex as an OpenID Connect identity provider with Istio for federated authentication across your service mesh.

---

Dex is a lightweight, open-source OpenID Connect (OIDC) identity provider that acts as a bridge to other identity providers. Instead of integrating directly with GitHub, Google, LDAP, or SAML providers, your services authenticate through Dex, and Dex handles the upstream identity federation. Pair it with Istio, and you get a centralized identity layer for your entire mesh without touching application code.

The approach here is to use Dex as the OIDC issuer and configure Istio's JWT-based request authentication to validate tokens issued by Dex. This gives you identity propagation across service-to-service calls without each service needing to know about Dex directly.

## Deploying Dex

Create a namespace and deploy Dex with a configuration that connects to your identity sources:

```bash
kubectl create namespace dex
```

Create the Dex configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dex-config
  namespace: dex
data:
  config.yaml: |
    issuer: https://dex.mycompany.com

    storage:
      type: kubernetes
      config:
        inCluster: true

    web:
      http: 0.0.0.0:5556

    connectors:
      - type: github
        id: github
        name: GitHub
        config:
          clientID: $GITHUB_CLIENT_ID
          clientSecret: $GITHUB_CLIENT_SECRET
          redirectURI: https://dex.mycompany.com/callback
          orgs:
            - name: mycompany

      - type: ldap
        id: ldap
        name: LDAP
        config:
          host: openldap.default.svc.cluster.local:389
          insecureNoSSL: true
          bindDN: cn=admin,dc=mycompany,dc=com
          bindPW: admin-password
          userSearch:
            baseDN: ou=users,dc=mycompany,dc=com
            filter: "(objectClass=person)"
            username: uid
            idAttr: uid
            emailAttr: mail
            nameAttr: cn
          groupSearch:
            baseDN: ou=groups,dc=mycompany,dc=com
            filter: "(objectClass=groupOfNames)"
            userMatchers:
              - userAttr: DN
                groupAttr: member
            nameAttr: cn

    staticClients:
      - id: istio-mesh
        secret: mesh-client-secret
        name: Istio Mesh
        redirectURIs:
          - https://app.mycompany.com/callback
        public: false

    oauth2:
      skipApprovalScreen: true
```

Deploy Dex:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dex
  namespace: dex
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dex
  template:
    metadata:
      labels:
        app: dex
    spec:
      serviceAccountName: dex
      containers:
        - name: dex
          image: ghcr.io/dexidp/dex:v2.37.0
          command: ["dex", "serve", "/etc/dex/config.yaml"]
          ports:
            - containerPort: 5556
              name: http
          volumeMounts:
            - name: config
              mountPath: /etc/dex
      volumes:
        - name: config
          configMap:
            name: dex-config
---
apiVersion: v1
kind: Service
metadata:
  name: dex
  namespace: dex
spec:
  selector:
    app: dex
  ports:
    - port: 5556
      targetPort: 5556
      name: http
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dex
  namespace: dex
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dex
rules:
  - apiGroups: ["dex.coreos.com"]
    resources: ["*"]
    verbs: ["*"]
  - apiGroups: ["apiextensions.k8s.io"]
    resources: ["customresourcedefinitions"]
    verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dex
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dex
subjects:
  - kind: ServiceAccount
    name: dex
    namespace: dex
```

## Exposing Dex Through Istio Gateway

Dex needs to be accessible externally so users can authenticate. Create a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: dex-gateway
  namespace: dex
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: dex-tls
      hosts:
        - dex.mycompany.com
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: dex
  namespace: dex
spec:
  hosts:
    - dex.mycompany.com
  gateways:
    - dex-gateway
  http:
    - route:
        - destination:
            host: dex.dex.svc.cluster.local
            port:
              number: 5556
```

## Configuring Istio JWT Authentication

Now configure Istio to validate JWTs issued by Dex. This is the core integration point. Istio will check every incoming request for a valid Dex-issued JWT:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: dex-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://dex.mycompany.com"
      jwksUri: "https://dex.mycompany.com/keys"
      forwardOriginalToken: true
      outputPayloadToHeader: "x-jwt-payload"
```

The `jwksUri` points to Dex's JSON Web Key Set endpoint where Istio fetches the public keys to verify token signatures. The `forwardOriginalToken` setting passes the JWT to backend services so they can read claims if needed.

## Enforcing Authentication

Create an AuthorizationPolicy that requires a valid JWT:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-dex-jwt
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

This denies any request that does not have a valid JWT (indicated by `notRequestPrincipals: ["*"]`), except for health check and public paths.

For more granular control, you can enforce group-based access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: admin-only
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://dex.mycompany.com/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[groups]
          values: ["admins"]
```

## Setting Up the Authentication Flow

Users need a way to actually get a JWT from Dex. In a web application, this typically involves an OAuth2 authorization code flow. Here is a simplified flow:

1. User visits your app and gets redirected to Dex
2. Dex shows login options (GitHub, LDAP, etc.)
3. User authenticates with their chosen provider
4. Dex issues a JWT and redirects back to your app
5. Your app stores the JWT and includes it in requests

For service-to-service authentication, you can use Dex's static password or service account connectors:

```yaml
enablePasswordDB: true
staticPasswords:
  - email: "service-account@mycompany.com"
    hash: "$2a$10$hash_here"
    username: "service-account"
    userID: "service-account-001"
```

Then services can get a token using the password grant:

```bash
curl -X POST https://dex.mycompany.com/token \
  -d "grant_type=password" \
  -d "username=service-account@mycompany.com" \
  -d "password=service-password" \
  -d "client_id=istio-mesh" \
  -d "client_secret=mesh-client-secret" \
  -d "scope=openid email groups"
```

## Token Refresh and Lifecycle

JWTs from Dex have an expiration time. You need to handle token refresh in your application. Dex issues refresh tokens alongside access tokens when the `offline_access` scope is requested:

```bash
curl -X POST https://dex.mycompany.com/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$REFRESH_TOKEN" \
  -d "client_id=istio-mesh" \
  -d "client_secret=mesh-client-secret"
```

## Reading Identity in Backend Services

With `forwardOriginalToken: true` and `outputPayloadToHeader: "x-jwt-payload"`, your backend services receive the decoded JWT payload as a header. Parse it to get user information:

```python
import json
import base64

def get_user_info(request):
    payload_header = request.headers.get('x-jwt-payload', '')
    if payload_header:
        payload = json.loads(base64.b64decode(payload_header))
        return {
            'email': payload.get('email'),
            'groups': payload.get('groups', []),
            'name': payload.get('name')
        }
    return None
```

## Monitoring the Integration

Keep an eye on Dex health and authentication metrics:

```bash
# Check Dex health
kubectl exec -n dex deploy/dex -- wget -qO- http://localhost:5556/healthz

# Watch for authentication failures in Istio
kubectl logs -n istio-system deploy/istiod | grep "JWT"
```

The Dex and Istio integration gives you a flexible identity federation layer. Users authenticate once through Dex, get a JWT, and that identity flows through the entire mesh. Adding a new identity provider is just a matter of adding a connector in Dex's config, with zero changes to Istio or your services.
