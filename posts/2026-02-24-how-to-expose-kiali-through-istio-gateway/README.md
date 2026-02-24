# How to Expose Kiali Through Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kiali, Gateway, Service Mesh, Observability

Description: Complete guide to exposing Kiali through an Istio Gateway with TLS, authentication, and proper web root configuration for remote access.

---

Kiali is the control panel for your Istio mesh, and locking it behind port-forwarding means nobody uses it when they should. Exposing it through the Istio Gateway gives your team permanent access to mesh visualization, traffic monitoring, and configuration validation. But Kiali has specific configuration requirements around its web root URL and authentication that make the setup slightly more involved than exposing a simple web app.

This post walks through the complete setup, from Gateway creation to authentication configuration and troubleshooting the common gotchas.

## Planning the Setup

Before starting, decide on:

1. **Domain**: Will Kiali be on its own subdomain (`kiali.example.com`) or under a path (`monitoring.example.com/kiali`)?
2. **Authentication**: Anonymous, token, OIDC, or proxy-based?
3. **TLS**: Required for production. Self-signed okay for development.

For this guide, we'll use a dedicated subdomain with OIDC authentication.

## Step 1: Create the TLS Certificate

Using cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: kiali-tls
  namespace: istio-system
spec:
  secretName: kiali-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - kiali.example.com
```

Or manually:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout kiali.key -out kiali.crt \
  -subj "/CN=kiali.example.com"

kubectl create secret tls kiali-tls-cert \
  --cert=kiali.crt \
  --key=kiali.key \
  -n istio-system
```

## Step 2: Create the Gateway

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: kiali-gateway
  namespace: istio-system
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
        credentialName: kiali-tls-cert
      hosts:
        - "kiali.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "kiali.example.com"
```

## Step 3: Create the VirtualService

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali-vs
  namespace: istio-system
spec:
  hosts:
    - "kiali.example.com"
  gateways:
    - kiali-gateway
  http:
    # Redirect HTTP to HTTPS
    - match:
        - port: 80
      redirect:
        scheme: https
        redirectCode: 301
    # Route HTTPS to Kiali
    - route:
        - destination:
            host: kiali
            port:
              number: 20001
```

Apply both:

```bash
kubectl apply -f kiali-gateway.yaml
kubectl apply -f kiali-vs.yaml
```

## Step 4: Configure Kiali's Server Settings

This is the critical step that many guides skip. Kiali needs to know its external URL to generate correct links, handle OAuth redirects, and serve assets properly.

Update the Kiali CR:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  server:
    web_fqdn: "kiali.example.com"
    web_port: 443
    web_schema: "https"
    web_root: "/kiali"
  deployment:
    accessible_namespaces:
      - "**"
```

Wait, why `web_root: "/kiali"`? Kiali serves its UI under the `/kiali` path by default. If you access `https://kiali.example.com`, it actually redirects you to `https://kiali.example.com/kiali`. The VirtualService routes all paths to the Kiali service, so this works automatically.

If you want Kiali at the root path instead:

```yaml
spec:
  server:
    web_fqdn: "kiali.example.com"
    web_port: 443
    web_schema: "https"
    web_root: "/"
```

Apply and wait for the rollout:

```bash
kubectl apply -f kiali-cr.yaml
kubectl rollout status deployment kiali -n istio-system
```

## Step 5: Set Up Authentication

### Option A: OIDC Authentication (Recommended)

Configure Kiali to authenticate through your identity provider:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "openid"
    openid:
      client_id: "kiali"
      issuer_uri: "https://auth.example.com/realms/infrastructure"
      scopes:
        - "openid"
        - "email"
      username_claim: "preferred_username"
  server:
    web_fqdn: "kiali.example.com"
    web_port: 443
    web_schema: "https"
    web_root: "/kiali"
  deployment:
    accessible_namespaces:
      - "**"
  external_services:
    prometheus:
      url: "http://prometheus.istio-system:9090"
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
    tracing:
      enabled: true
      in_cluster_url: "http://tracing.istio-system:16685/jaeger"
      use_grpc: true
      url: "https://jaeger.example.com"
```

Create the OIDC client secret:

```bash
kubectl create secret generic kiali-oidc-secret \
  --from-literal=oidc-secret='your-oidc-client-secret' \
  -n istio-system
```

The `web_fqdn`, `web_port`, and `web_schema` fields are essential for OIDC to work. Kiali uses these to construct the redirect URI for the OAuth flow. If they don't match your actual URL, the login will fail.

### Option B: Token Authentication

Simpler but less user-friendly. Users need to paste a Kubernetes token to log in:

```yaml
spec:
  auth:
    strategy: "token"
```

Generate a token for users:

```bash
kubectl create token kiali-service-account -n istio-system --duration=24h
```

### Option C: Istio-Level Access Control

Add an AuthorizationPolicy for IP-based or JWT-based access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: kiali-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks:
              - "10.0.0.0/8"
      to:
        - operation:
            hosts:
              - "kiali.example.com"
```

You can combine this with Kiali's own auth strategy for defense in depth.

## Step 6: Configure DNS

```bash
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Create DNS record: kiali.example.com -> $GATEWAY_IP"
```

## Step 7: Test

```bash
# Test basic connectivity
curl -k -I https://kiali.example.com/kiali

# Should get a 200 or redirect to login
```

Open `https://kiali.example.com` in your browser. You should be redirected to `/kiali` and then either see the dashboard (anonymous auth) or a login page.

## Serving Kiali Under a Sub-Path

If you want Kiali at `https://monitoring.example.com/kiali/`:

Gateway (shared with other monitoring tools):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: monitoring-gateway
  namespace: istio-system
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
        credentialName: monitoring-tls-cert
      hosts:
        - "monitoring.example.com"
```

VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali-vs
  namespace: istio-system
spec:
  hosts:
    - "monitoring.example.com"
  gateways:
    - monitoring-gateway
  http:
    - match:
        - uri:
            prefix: /kiali
      route:
        - destination:
            host: kiali
            port:
              number: 20001
```

Kiali CR:

```yaml
spec:
  server:
    web_fqdn: "monitoring.example.com"
    web_port: 443
    web_schema: "https"
    web_root: "/kiali"
```

## Connecting External Services URLs

When Kiali is exposed externally, configure the external URLs for Grafana and Jaeger so that links in the Kiali UI open the right external URLs (not internal ones):

```yaml
spec:
  external_services:
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
    tracing:
      enabled: true
      in_cluster_url: "http://tracing.istio-system:16685/jaeger"
      use_grpc: true
      url: "https://jaeger.example.com"
```

The `in_cluster_url` is for Kiali's backend to fetch data. The `url` is for generating links in the browser.

## Complete Configuration Example

Here's the full Kiali CR for an externally-exposed, OIDC-authenticated setup:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: "openid"
    openid:
      client_id: "kiali"
      issuer_uri: "https://auth.example.com/realms/infrastructure"
      scopes:
        - "openid"
        - "email"
      username_claim: "preferred_username"
  server:
    web_fqdn: "kiali.example.com"
    web_port: 443
    web_schema: "https"
    web_root: "/kiali"
  deployment:
    accessible_namespaces:
      - "**"
    view_only_mode: false
  external_services:
    prometheus:
      url: "http://prometheus.istio-system:9090"
    grafana:
      enabled: true
      in_cluster_url: "http://grafana.istio-system:3000"
      url: "https://grafana.example.com"
    tracing:
      enabled: true
      in_cluster_url: "http://tracing.istio-system:16685/jaeger"
      use_grpc: true
      url: "https://jaeger.example.com"
```

## Troubleshooting

**Redirect loop after login**: The most common issue. Check that `web_fqdn`, `web_port`, and `web_schema` exactly match how users access Kiali. Even a mismatched port (443 vs 8443) causes loops.

**Blank page**: Open browser dev tools and check for 404 errors on static assets. This usually means `web_root` is wrong.

**OIDC error "redirect_uri_mismatch"**: The redirect URI that Kiali sends to the IdP doesn't match what's registered. Check the client configuration in your IdP and make sure the redirect URI matches `https://<web_fqdn>:<web_port><web_root>`.

**Graph shows no data**: This is unrelated to the Gateway setup. Check Prometheus connectivity in the Kiali CR's `external_services.prometheus.url`.

**404 on /kiali path**: Make sure the Kiali pod has restarted after you changed the CR. The operator applies changes automatically, but it takes a minute:

```bash
kubectl get pods -n istio-system -l app.kubernetes.io/name=kiali -w
```

Exposing Kiali through the Gateway is one of the most valuable things you can do for your team's operational readiness. When everyone can see the mesh topology and health status with a single URL, issues get detected and resolved faster. Take the extra time to set up proper authentication and you'll have a production-ready observability portal.
