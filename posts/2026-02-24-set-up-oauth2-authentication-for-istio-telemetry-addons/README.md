# How to Set Up OAuth2 Authentication for Istio Telemetry Addons

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OAuth2, Authentication, Telemetry, Security, Kubernetes

Description: Configure OAuth2 authentication for Istio telemetry addons like Grafana, Kiali, and Jaeger using OAuth2 Proxy and Istio policies.

---

Port-forwarding telemetry dashboards works for one person, but it falls apart when a whole team needs access. You could share Kubernetes credentials with everyone, but that is a security nightmare. A much better approach is putting OAuth2 authentication in front of your telemetry addons so team members log in with their existing identity provider - Google, GitHub, Okta, or whatever your organization uses.

This guide covers two approaches: using OAuth2 Proxy as a standalone deployment, and using Istio's built-in RequestAuthentication with JWT validation.

## Approach 1: OAuth2 Proxy with Istio

OAuth2 Proxy is a reverse proxy that handles the OAuth2 flow before forwarding authenticated requests to your backend services. It works well with Istio because you can deploy it as a separate service and route traffic through it.

### Register an OAuth2 Application

First, register an OAuth application with your identity provider. For GitHub:

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new app with the callback URL: `https://oauth2.example.com/oauth2/callback`
3. Note the Client ID and Client Secret

### Deploy OAuth2 Proxy

Create a Kubernetes Secret with your OAuth2 credentials:

```bash
kubectl create secret generic oauth2-proxy-secret \
  --from-literal=client-id=YOUR_CLIENT_ID \
  --from-literal=client-secret=YOUR_CLIENT_SECRET \
  --from-literal=cookie-secret=$(openssl rand -base64 32 | head -c 32) \
  -n istio-system
```

Deploy OAuth2 Proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: istio-system
spec:
  replicas: 1
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
            - --provider=github
            - --email-domain=*
            - --upstream=static://200
            - --http-address=0.0.0.0:4180
            - --cookie-secure=true
            - --cookie-domain=.example.com
            - --whitelist-domain=.example.com
            - --set-xauthrequest=true
            - --github-org=your-org
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
---
apiVersion: v1
kind: Service
metadata:
  name: oauth2-proxy
  namespace: istio-system
spec:
  selector:
    app: oauth2-proxy
  ports:
    - port: 4180
      targetPort: 4180
```

The `--github-org=your-org` flag restricts access to members of your GitHub organization. Remove it if you want any authenticated GitHub user to access the dashboards.

### Configure Istio to Use OAuth2 Proxy with ext_authz

Istio supports external authorization through the `ext_authz` filter. First, register OAuth2 Proxy as an extension provider in your Istio mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: oauth2-proxy
        envoyExtAuthz:
          service: oauth2-proxy.istio-system.svc.cluster.local
          port: 4180
          includeRequestHeadersInCheck:
            - cookie
            - authorization
          headersToUpstreamOnAllow:
            - x-auth-request-user
            - x-auth-request-email
          headersToDownstreamOnDeny:
            - set-cookie
            - location
```

If you are using `istioctl`, update the mesh config:

```bash
kubectl edit configmap istio -n istio-system
```

Add the `extensionProviders` section under `mesh` in the ConfigMap data.

### Apply AuthorizationPolicy with ext_authz

Now create an AuthorizationPolicy that triggers the external authorization check for your telemetry dashboards:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: oauth2-telemetry
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  action: CUSTOM
  provider:
    name: oauth2-proxy
  rules:
    - to:
        - operation:
            paths: ["/*"]
```

Create similar policies for Kiali, Jaeger, and Prometheus by changing the `selector` labels.

## Approach 2: Istio RequestAuthentication with JWT

If your identity provider issues JWTs (like Okta, Auth0, or Keycloak), you can validate tokens directly in Istio without deploying OAuth2 Proxy. This approach is lighter weight but requires your clients to obtain and send JWT tokens themselves.

### Configure RequestAuthentication

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: telemetry-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  jwtRules:
    - issuer: "https://your-issuer.example.com/"
      jwksUri: "https://your-issuer.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

### Require Valid JWT with AuthorizationPolicy

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-telemetry
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: grafana
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      when:
        - key: request.auth.claims[groups]
          values: ["platform-team", "sre-team"]
```

This policy only allows requests with a valid JWT that contains a `groups` claim matching either `platform-team` or `sre-team`.

## Grafana's Built-in OAuth

Grafana actually has native OAuth2 support. If you are only worried about Grafana, you can skip the proxy approach and configure Grafana directly:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana
  namespace: istio-system
data:
  grafana.ini: |
    [server]
    root_url = https://grafana.example.com

    [auth.github]
    enabled = true
    allow_sign_up = true
    scopes = user:email,read:org
    auth_url = https://github.com/login/oauth/authorize
    token_url = https://github.com/login/oauth/access_token
    api_url = https://api.github.com/user
    allowed_organizations = your-org
    client_id = YOUR_CLIENT_ID
    client_secret = YOUR_CLIENT_SECRET
```

## Testing the Setup

After deploying everything, access your Grafana dashboard through the browser:

```bash
curl -v https://grafana.example.com
```

You should get redirected to your OAuth2 provider's login page. After authenticating, you will be redirected back to Grafana with a valid session.

To verify the ext_authz setup is working, check the Envoy stats on the Grafana pod:

```bash
kubectl exec -n istio-system deploy/grafana -c istio-proxy -- \
  pilot-agent request GET stats | grep ext_authz
```

You should see counters for `ext_authz.ok` (successful auth) and `ext_authz.denied` (rejected requests).

## Common Pitfalls

One thing that trips people up is cookie domains. If your OAuth2 Proxy is on `oauth2.example.com` but your Grafana is on `grafana.example.com`, the cookie domain needs to be `.example.com` (note the leading dot) so it works across subdomains.

Another common issue is redirect loops. This usually happens when the OAuth2 callback URL is also protected by the AuthorizationPolicy. Make sure to exclude the callback path:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: oauth2-callback-allow
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: oauth2-proxy
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/oauth2/*"]
```

With OAuth2 in place, your team gets secure, authenticated access to all telemetry dashboards without needing direct Kubernetes access or port-forwarding. The identity provider handles user management, and you get audit logs of who accessed what.
