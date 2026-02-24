# How to Integrate Istio with Ory Hydra for OAuth2

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ory Hydra, OAuth2, Security, Authentication

Description: A practical guide to deploying Ory Hydra as your OAuth2 and OpenID Connect provider and integrating it with Istio for token-based service mesh authentication.

---

Ory Hydra is an OAuth2 and OpenID Connect server that does one thing really well: issuing and managing tokens. Unlike all-in-one identity platforms, Hydra does not handle user management or login UIs. It delegates those to your own services, which gives you full control over the user experience while getting a standards-compliant OAuth2 implementation.

Integrating Hydra with Istio means your service mesh can validate OAuth2 tokens at the proxy level, so your application code does not need to handle token validation at all.

## How the Integration Works

The architecture looks like this:

1. Ory Hydra runs as a service in your cluster, handling OAuth2 flows
2. Your custom login/consent app handles the actual user authentication
3. Hydra issues JWTs (or opaque tokens) after successful authentication
4. Istio validates these tokens using Hydra's JWKS endpoint
5. Authenticated requests flow through the mesh with identity information attached

## Deploying Ory Hydra

Hydra needs a PostgreSQL database for storing clients, tokens, and consent data. Set that up first:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hydra-db
  namespace: hydra
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hydra-db
  template:
    metadata:
      labels:
        app: hydra-db
    spec:
      containers:
        - name: postgres
          image: postgres:15
          env:
            - name: POSTGRES_DB
              value: hydra
            - name: POSTGRES_USER
              value: hydra
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: hydra-db-secret
                  key: password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: hydra-db-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: hydra-db
  namespace: hydra
spec:
  selector:
    app: hydra-db
  ports:
    - port: 5432
```

Run the database migration job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: hydra-migrate
  namespace: hydra
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: hydra-migrate
          image: oryd/hydra:v2.2.0
          command: ["hydra", "migrate", "sql", "-e", "--yes"]
          env:
            - name: DSN
              value: "postgres://hydra:password@hydra-db.hydra.svc.cluster.local:5432/hydra?sslmode=disable"
```

Now deploy Hydra itself:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hydra
  namespace: hydra
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hydra
  template:
    metadata:
      labels:
        app: hydra
    spec:
      containers:
        - name: hydra
          image: oryd/hydra:v2.2.0
          args: ["serve", "all"]
          env:
            - name: DSN
              value: "postgres://hydra:password@hydra-db.hydra.svc.cluster.local:5432/hydra?sslmode=disable"
            - name: URLS_SELF_ISSUER
              value: "https://hydra.mycompany.com"
            - name: URLS_CONSENT
              value: "https://login.mycompany.com/consent"
            - name: URLS_LOGIN
              value: "https://login.mycompany.com/login"
            - name: URLS_LOGOUT
              value: "https://login.mycompany.com/logout"
            - name: SECRETS_SYSTEM
              valueFrom:
                secretKeyRef:
                  name: hydra-secrets
                  key: system-secret
            - name: OIDC_SUBJECT_IDENTIFIERS_SUPPORTED_TYPES
              value: "public,pairwise"
            - name: OIDC_SUBJECT_IDENTIFIERS_PAIRWISE_SALT
              valueFrom:
                secretKeyRef:
                  name: hydra-secrets
                  key: pairwise-salt
            - name: STRATEGIES_ACCESS_TOKEN
              value: "jwt"
          ports:
            - containerPort: 4444
              name: public
            - containerPort: 4445
              name: admin
---
apiVersion: v1
kind: Service
metadata:
  name: hydra-public
  namespace: hydra
spec:
  selector:
    app: hydra
  ports:
    - port: 4444
      targetPort: 4444
      name: http
---
apiVersion: v1
kind: Service
metadata:
  name: hydra-admin
  namespace: hydra
spec:
  selector:
    app: hydra
  ports:
    - port: 4445
      targetPort: 4445
      name: http
```

The `STRATEGIES_ACCESS_TOKEN: jwt` setting is important. This tells Hydra to issue JWT access tokens instead of opaque tokens, which is what Istio needs for local token validation.

## Creating OAuth2 Clients

Register an OAuth2 client that your applications will use:

```bash
kubectl exec -n hydra deploy/hydra -- \
  hydra create oauth2-client \
    --endpoint http://localhost:4445 \
    --name "Mesh Services" \
    --grant-type authorization_code,refresh_token,client_credentials \
    --response-type code \
    --scope openid,offline_access,email,profile \
    --redirect-uri https://app.mycompany.com/callback \
    --token-endpoint-auth-method client_secret_post
```

For service-to-service communication, create a client that uses the client_credentials grant:

```bash
kubectl exec -n hydra deploy/hydra -- \
  hydra create oauth2-client \
    --endpoint http://localhost:4445 \
    --name "Service Account" \
    --grant-type client_credentials \
    --scope openid,mesh.access \
    --token-endpoint-auth-method client_secret_post
```

## Exposing Hydra Through Istio

Create a VirtualService for Hydra's public endpoint:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: hydra
  namespace: hydra
spec:
  hosts:
    - hydra.mycompany.com
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: hydra-public.hydra.svc.cluster.local
            port:
              number: 4444
```

Make sure the admin endpoint is NOT exposed externally. It should only be accessible within the cluster.

## Configuring Istio JWT Validation

Configure Istio to validate JWTs from Hydra:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: hydra-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://hydra.mycompany.com"
      jwksUri: "https://hydra.mycompany.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

Alternatively, if Hydra is only accessible internally, use the internal service URL:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: hydra-jwt
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://hydra.mycompany.com"
      jwksUri: "http://hydra-public.hydra.svc.cluster.local:4444/.well-known/jwks.json"
      forwardOriginalToken: true
```

## Enforcing Authorization

Create policies that require valid Hydra tokens:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-oauth2-token
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

Scope-based authorization:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin-scope
  namespace: default
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://hydra.mycompany.com/*"]
      to:
        - operation:
            paths: ["/admin/*"]
      when:
        - key: request.auth.claims[scp]
          values: ["admin"]
```

## Service-to-Service Token Flow

For service-to-service communication, use the client_credentials grant. A sidecar or init container can obtain and refresh tokens:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      initContainers:
        - name: token-fetcher
          image: curlimages/curl
          command:
            - sh
            - -c
            - |
              TOKEN=$(curl -s -X POST https://hydra.mycompany.com/oauth2/token \
                -d "grant_type=client_credentials" \
                -d "client_id=$CLIENT_ID" \
                -d "client_secret=$CLIENT_SECRET" \
                -d "scope=openid mesh.access" | jq -r '.access_token')
              echo "$TOKEN" > /shared/token
          env:
            - name: CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: oauth2-credentials
                  key: client-id
            - name: CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-credentials
                  key: client-secret
          volumeMounts:
            - name: token
              mountPath: /shared
      containers:
        - name: my-service
          image: my-service:latest
          volumeMounts:
            - name: token
              mountPath: /shared
      volumes:
        - name: token
          emptyDir: {}
```

## Testing the Flow

Get a token using the client credentials flow:

```bash
TOKEN=$(curl -s -X POST https://hydra.mycompany.com/oauth2/token \
  -d "grant_type=client_credentials" \
  -d "client_id=your-client-id" \
  -d "client_secret=your-client-secret" \
  -d "scope=openid" | jq -r '.access_token')

# Call a protected service
curl -H "Authorization: Bearer $TOKEN" https://app.mycompany.com/api/data
```

Verify Istio is checking tokens properly:

```bash
# Without token - should get 403
curl -s -o /dev/null -w "%{http_code}" https://app.mycompany.com/api/data

# With valid token - should get 200
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" https://app.mycompany.com/api/data
```

## Monitoring Token Validation

Watch for JWT validation errors in the Envoy proxy logs:

```bash
kubectl logs deploy/my-service -c istio-proxy | grep "jwt"
```

Also monitor Hydra's token issuance metrics. Hydra exposes Prometheus metrics on port 4445 by default:

```bash
kubectl exec -n hydra deploy/hydra -- curl -s localhost:4445/admin/metrics/prometheus | grep hydra_oauth2
```

The combination of Ory Hydra and Istio gives you a production-grade OAuth2 system where token validation happens at the mesh level. Services get authenticated identity for free, and you maintain full control over your login and consent flows.
