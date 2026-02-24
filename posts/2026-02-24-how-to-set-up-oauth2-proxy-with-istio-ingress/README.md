# How to Set Up OAuth2 Proxy with Istio Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OAuth2, Authentication, Security, Kubernetes

Description: How to deploy and configure OAuth2 Proxy with Istio ingress gateway to add authentication to your applications using providers like Google, GitHub, or Keycloak.

---

Adding authentication to every microservice individually is tedious and error-prone. A better approach is to handle authentication at the ingress layer so your backend services do not need to deal with OAuth flows at all. OAuth2 Proxy is a reverse proxy that handles the OAuth2 flow and passes authenticated user information to your backends through headers.

When combined with Istio, OAuth2 Proxy sits behind the ingress gateway and authenticates users before requests reach your services. Your backend just reads the `x-forwarded-email` or `x-forwarded-user` header and trusts it because the request has already been authenticated.

## Architecture

The flow looks like this:

1. User hits `app.example.com`
2. Istio ingress gateway terminates TLS
3. Request goes to OAuth2 Proxy
4. If user is not authenticated, OAuth2 Proxy redirects to the identity provider (Google, GitHub, etc.)
5. User logs in with the identity provider
6. OAuth2 Proxy validates the token and sets user headers
7. Request is forwarded to the backend service with user identity headers

## Deploying OAuth2 Proxy

First, create the OAuth2 application with your identity provider. For Google:

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create an OAuth 2.0 Client ID
3. Set the authorized redirect URI to `https://app.example.com/oauth2/callback`
4. Note the Client ID and Client Secret

Create a Kubernetes secret for the OAuth2 credentials:

```bash
kubectl create secret generic oauth2-proxy-secret \
  --from-literal=client-id=<your-client-id> \
  --from-literal=client-secret=<your-client-secret> \
  --from-literal=cookie-secret=$(openssl rand -base64 32 | head -c 32) \
  -n default
```

Deploy OAuth2 Proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: oauth2-proxy
  template:
    metadata:
      labels:
        app: oauth2-proxy
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:v7.6.0
          args:
            - --provider=google
            - --email-domain=*
            - --upstream=static://200
            - --http-address=0.0.0.0:4180
            - --cookie-secure=true
            - --cookie-domain=.example.com
            - --set-xauthrequest=true
            - --pass-access-token=true
            - --reverse-proxy=true
          env:
            - name: OAUTH2_PROXY_CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-id
            - name: OAUTH2_PROXY_CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: client-secret
            - name: OAUTH2_PROXY_COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy-secret
                  key: cookie-secret
          ports:
            - containerPort: 4180
          readinessProbe:
            httpGet:
              path: /ping
              port: 4180
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: oauth2-proxy
  namespace: default
spec:
  selector:
    app: oauth2-proxy
  ports:
    - name: http
      port: 4180
      targetPort: 4180
```

For GitHub as the provider, change the args:

```yaml
args:
  - --provider=github
  - --github-org=your-org
  - --email-domain=*
  - --upstream=static://200
  - --http-address=0.0.0.0:4180
  - --cookie-secure=true
  - --set-xauthrequest=true
  - --reverse-proxy=true
```

## Configuring Istio for OAuth2 Proxy

There are two main approaches to integrate OAuth2 Proxy with Istio: using ext_authz or using VirtualService routing.

### Approach 1: External Authorization (Recommended)

This approach uses Istio's external authorization feature, where the gateway checks with OAuth2 Proxy before forwarding requests.

First, register OAuth2 Proxy as an external authorizer in the Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: oauth2-proxy
        envoyExtAuthz:
          service: oauth2-proxy.default.svc.cluster.local
          port: 4180
          includeRequestHeadersInCheck:
            - cookie
            - authorization
          headersToUpstreamOnAllow:
            - x-auth-request-user
            - x-auth-request-email
            - x-auth-request-access-token
            - authorization
          headersToDownstreamOnDeny:
            - set-cookie
            - content-type
```

If you already have Istio installed, update the mesh config:

```bash
kubectl edit configmap istio -n istio-system
```

Add the extension provider under `meshConfig`:

```yaml
data:
  mesh: |-
    extensionProviders:
    - name: oauth2-proxy
      envoyExtAuthz:
        service: oauth2-proxy.default.svc.cluster.local
        port: 4180
        includeRequestHeadersInCheck:
        - cookie
        - authorization
        headersToUpstreamOnAllow:
        - x-auth-request-user
        - x-auth-request-email
        - authorization
        headersToDownstreamOnDeny:
        - set-cookie
        - content-type
```

Now apply an AuthorizationPolicy to use the external authorizer:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oauth2-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: CUSTOM
  provider:
    name: oauth2-proxy
  rules:
    - to:
        - operation:
            paths: ["/*"]
```

### Approach 2: VirtualService Routing

This approach routes traffic through OAuth2 Proxy using VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: app-gateway
  namespace: default
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
        credentialName: app-cert
      hosts:
        - "app.example.com"

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-vs
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - app-gateway
  http:
    - match:
        - uri:
            prefix: /oauth2
      route:
        - destination:
            host: oauth2-proxy.default.svc.cluster.local
            port:
              number: 4180
    - route:
        - destination:
            host: oauth2-proxy.default.svc.cluster.local
            port:
              number: 4180
```

With this approach, all traffic goes through OAuth2 Proxy first. OAuth2 Proxy handles the authentication and then proxies authenticated requests to the upstream service.

Update the OAuth2 Proxy deployment to point to your actual backend:

```yaml
args:
  - --provider=google
  - --email-domain=*
  - --upstream=http://my-app.default.svc.cluster.local:80
  - --http-address=0.0.0.0:4180
  - --cookie-secure=true
  - --set-xauthrequest=true
  - --reverse-proxy=true
```

## Excluding Paths from Authentication

Some paths like health checks or public APIs should not require authentication:

Using the ext_authz approach, update the AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: oauth2-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: CUSTOM
  provider:
    name: oauth2-proxy
  rules:
    - to:
        - operation:
            notPaths:
              - /healthz
              - /api/public/*
              - /static/*
```

## Using Keycloak as the Identity Provider

For self-hosted identity, Keycloak is a popular choice:

```yaml
args:
  - --provider=keycloak-oidc
  - --client-id=my-app
  - --client-secret=$(OAUTH2_PROXY_CLIENT_SECRET)
  - --redirect-url=https://app.example.com/oauth2/callback
  - --oidc-issuer-url=https://keycloak.example.com/realms/myrealm
  - --email-domain=*
  - --upstream=static://200
  - --http-address=0.0.0.0:4180
  - --cookie-secure=true
  - --set-xauthrequest=true
  - --reverse-proxy=true
```

## Reading User Information in Backend Services

After OAuth2 Proxy authenticates the user, it adds these headers to the request:

- `x-auth-request-user` - The authenticated user's username
- `x-auth-request-email` - The authenticated user's email
- `x-auth-request-access-token` - The OAuth access token

Your backend can read these directly:

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/api/profile')
def profile():
    user = request.headers.get('x-auth-request-user')
    email = request.headers.get('x-auth-request-email')
    return {"user": user, "email": email}
```

## Summary

OAuth2 Proxy with Istio ingress moves authentication out of your application code and into the infrastructure layer. The ext_authz approach is cleaner because it lets Istio handle the authorization decision at the proxy level, while the VirtualService routing approach is simpler to set up. Either way, your backend services receive authenticated user information through headers and do not need to implement any OAuth logic themselves. Use ext_authz for production setups where you need path-level exclusions and fine-grained control.
