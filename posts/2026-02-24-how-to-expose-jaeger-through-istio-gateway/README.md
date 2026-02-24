# How to Expose Jaeger Through Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Jaeger, Gateway, Distributed Tracing, Observability

Description: How to safely expose Jaeger's tracing UI and API through an Istio Gateway with TLS and authentication for external access.

---

Jaeger's tracing UI is one of those tools you don't need every day, but when you need it, you need it now. Usually that's during an incident at 3 AM when you're trying to figure out why a request that normally takes 50ms is suddenly taking 8 seconds. Having to set up a port-forward while half awake is not ideal.

Exposing Jaeger through the Istio IngressGateway gives your team permanent, secure access to the tracing UI. This post covers the complete setup including TLS, authentication, and some Jaeger-specific configuration you need to handle.

## Jaeger's Service Architecture

Jaeger exposes several ports, but for the UI you only need to expose one:

| Port | Service | Purpose |
|------|---------|---------|
| 16686 | Query UI | Web interface for browsing traces |
| 16685 | Query gRPC | gRPC API (used by Kiali) |
| 14268 | Collector HTTP | Receives spans from clients |
| 4317 | Collector OTLP/gRPC | OTLP trace ingestion |

You only want to expose port 16686 (the UI) to external users. The collector ports should remain internal.

Check that Jaeger is running:

```bash
kubectl get svc -n istio-system -l app=jaeger
```

The service is typically named `tracing` in the Istio addon installation:

```bash
kubectl get svc tracing -n istio-system
```

## Step 1: Create the TLS Certificate

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: jaeger-tls
  namespace: istio-system
spec:
  secretName: jaeger-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - jaeger.example.com
```

Or create a secret manually:

```bash
kubectl create secret tls jaeger-tls-cert \
  --cert=jaeger.crt \
  --key=jaeger.key \
  -n istio-system
```

## Step 2: Create the Gateway

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: jaeger-gateway
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
        credentialName: jaeger-tls-cert
      hosts:
        - "jaeger.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "jaeger.example.com"
```

## Step 3: Create the VirtualService

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: jaeger-vs
  namespace: istio-system
spec:
  hosts:
    - "jaeger.example.com"
  gateways:
    - jaeger-gateway
  http:
    # Redirect HTTP to HTTPS
    - match:
        - port: 80
      redirect:
        scheme: https
        redirectCode: 301
    # Route to Jaeger Query UI
    - route:
        - destination:
            host: tracing
            port:
              number: 16686
```

Note: the destination host is `tracing`, which is the default service name when Jaeger is installed as an Istio addon. If you installed Jaeger separately, the service name might be different (like `jaeger-query`).

Apply both resources:

```bash
kubectl apply -f jaeger-gateway.yaml
kubectl apply -f jaeger-vs.yaml
```

## Step 4: Add Authentication

Jaeger has no built-in authentication. Anyone with access to the URL can browse all traces, which might contain sensitive data (like request headers, query parameters, or custom span attributes). Authentication is not optional.

### IP-Based Access Control

The simplest approach for internal tools:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: jaeger-access
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
              - "172.16.0.0/12"
      to:
        - operation:
            hosts:
              - "jaeger.example.com"
```

### OAuth2 Proxy

For proper user authentication, put OAuth2 Proxy in front of Jaeger:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-oauth2-proxy
  namespace: istio-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger-oauth2-proxy
  template:
    metadata:
      labels:
        app: jaeger-oauth2-proxy
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:v7.5.1
          args:
            - --provider=oidc
            - --oidc-issuer-url=https://auth.example.com
            - --client-id=jaeger
            - --client-secret=$(CLIENT_SECRET)
            - --email-domain=*
            - --upstream=http://tracing.istio-system:16686
            - --http-address=0.0.0.0:4180
            - --cookie-secret=$(COOKIE_SECRET)
            - --cookie-secure=true
          env:
            - name: CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: jaeger-oauth2-secret
                  key: client-secret
            - name: COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: jaeger-oauth2-secret
                  key: cookie-secret
          ports:
            - containerPort: 4180
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-oauth2-proxy
  namespace: istio-system
spec:
  selector:
    app: jaeger-oauth2-proxy
  ports:
    - port: 4180
      targetPort: 4180
```

Create the secret:

```bash
kubectl create secret generic jaeger-oauth2-secret \
  --from-literal=client-secret='your-oidc-client-secret' \
  --from-literal=cookie-secret=$(openssl rand -base64 32) \
  -n istio-system
```

Update the VirtualService to route through the proxy:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: jaeger-vs
  namespace: istio-system
spec:
  hosts:
    - "jaeger.example.com"
  gateways:
    - jaeger-gateway
  http:
    - match:
        - port: 80
      redirect:
        scheme: https
        redirectCode: 301
    - route:
        - destination:
            host: jaeger-oauth2-proxy
            port:
              number: 4180
```

## Step 5: Configure DNS

```bash
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Create DNS A record: jaeger.example.com -> $GATEWAY_IP"
```

## Step 6: Test

```bash
# Test the connection
curl -k https://jaeger.example.com/api/services

# If using OAuth2 Proxy, you should be redirected to login
curl -I -k https://jaeger.example.com/
```

Open `https://jaeger.example.com` in your browser. Without OAuth2 Proxy, you'll see the Jaeger UI directly. With the proxy, you'll be redirected to login first.

## Configuring Jaeger's Base Path

If you want to serve Jaeger under a sub-path like `https://monitoring.example.com/jaeger/`:

Update the Jaeger deployment with the `--query.base-path` flag:

```bash
kubectl edit deployment jaeger -n istio-system
```

Add the argument:

```yaml
args:
  - --query.base-path=/jaeger
```

Update the VirtualService:

```yaml
http:
  - match:
      - uri:
          prefix: /jaeger
    route:
      - destination:
          host: tracing
          port:
            number: 16686
```

## Exposing the Jaeger API for Programmatic Access

If you need to query traces programmatically (from scripts or other tools):

The Jaeger API is available at the same port as the UI. Common endpoints:

```bash
# List all services
curl https://jaeger.example.com/api/services

# Get traces for a service
curl "https://jaeger.example.com/api/traces?service=productpage&limit=20"

# Get a specific trace
curl "https://jaeger.example.com/api/traces/abc123def456"
```

If you only want to expose the UI but not the API, add a route rule:

```yaml
http:
  - match:
      - uri:
          prefix: /api/
    directResponse:
      status: 403
      body:
        string: "API access disabled"
  - route:
      - destination:
          host: tracing
          port:
            number: 16686
```

## Connecting Kiali to the Exposed Jaeger

If Kiali is also exposed externally and you want it to link to the external Jaeger URL:

```yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  external_services:
    tracing:
      enabled: true
      # Internal URL for Kiali's backend to query
      in_cluster_url: "http://tracing.istio-system:16685/jaeger"
      use_grpc: true
      # External URL for browser links
      url: "https://jaeger.example.com"
```

The `in_cluster_url` is used by Kiali's backend to fetch trace data. The `url` is used to generate links in the Kiali UI that open Jaeger in a new tab.

## Performance Considerations

Jaeger's UI fetches trace data on every page load. If you have a lot of traces, the initial load can be slow:

1. **Set appropriate storage limits**: Configure Jaeger's storage backend to auto-delete old traces (7-14 days is typical)

2. **Add a timeout to the VirtualService**: Prevent slow queries from hanging:

```yaml
http:
  - route:
      - destination:
          host: tracing
          port:
            number: 16686
    timeout: 30s
```

3. **Use query limits**: When searching traces in the UI, always set a reasonable limit and time range

## Troubleshooting

**Jaeger UI loads but shows no services**: Traces aren't being collected. Check your Telemetry resource's tracing configuration and verify the Jaeger collector is receiving spans.

**Jaeger UI loads but searches are slow**: Storage backend might be under-provisioned. Check Jaeger's memory and CPU usage:

```bash
kubectl top pods -n istio-system -l app=jaeger
```

**502 errors intermittently**: The Jaeger pod might be restarting. Check pod events:

```bash
kubectl describe pod -n istio-system -l app=jaeger
```

**CORS errors when accessing from a different domain**: If embedding Jaeger in another application, you might need to add CORS headers. This can be done with an EnvoyFilter on the gateway, though it's better to access Jaeger on its own domain.

Jaeger behind an Istio Gateway gives your team reliable access to distributed traces without the hassle of port-forwarding. Combined with proper authentication, it becomes a permanent part of your observability toolkit that's always just a URL away.
