# How to Expose Prometheus Through Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prometheus, Gateway, Monitoring, Observability

Description: Step-by-step instructions for safely exposing Prometheus through an Istio Gateway with TLS and access control for remote monitoring.

---

Prometheus in your Istio mesh is a goldmine of data, but it's locked behind a ClusterIP service by default. When you need to query it from outside the cluster - maybe from a central Grafana instance, a CI/CD pipeline, or for ad-hoc debugging from your laptop - you need to expose it properly.

Exposing Prometheus through the Istio IngressGateway is the right way to do this. It gives you TLS encryption, access control through Istio's AuthorizationPolicy, and all the monitoring that comes with Istio's traffic management. This post walks through the complete setup.

## Prerequisites

Make sure you have:

- Istio installed with the IngressGateway
- Prometheus running in the `istio-system` namespace (or wherever you installed it)
- A domain name pointing to your IngressGateway's external IP
- A TLS certificate (optional but recommended)

Check that everything is in place:

```bash
# Verify Prometheus is running
kubectl get svc prometheus -n istio-system

# Verify the IngressGateway
kubectl get svc istio-ingressgateway -n istio-system

# Get the external IP
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

## Step 1: Create the TLS Certificate

For production, use cert-manager or bring your own certificate. Here's the cert-manager approach:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: prometheus-tls
  namespace: istio-system
spec:
  secretName: prometheus-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - prometheus.example.com
```

For testing, create a self-signed certificate:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=prometheus.example.com"

kubectl create secret tls prometheus-tls-cert \
  --cert=tls.crt \
  --key=tls.key \
  -n istio-system
```

## Step 2: Create the Gateway

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: prometheus-gateway
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
        credentialName: prometheus-tls-cert
      hosts:
        - "prometheus.example.com"
```

Apply it:

```bash
kubectl apply -f prometheus-gateway.yaml
```

## Step 3: Create the VirtualService

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus-vs
  namespace: istio-system
spec:
  hosts:
    - "prometheus.example.com"
  gateways:
    - prometheus-gateway
  http:
    - route:
        - destination:
            host: prometheus
            port:
              number: 9090
```

Apply it:

```bash
kubectl apply -f prometheus-vs.yaml
```

## Step 4: Add Access Control

Prometheus has no built-in authentication. Anyone who can reach the endpoint can query your metrics and potentially extract sensitive information. You need access control at the Istio level.

### IP-Based Access Control

Restrict access to specific IP ranges:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: prometheus-access
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
              - "10.0.0.0/8"       # Internal network
              - "172.16.0.0/12"     # VPN range
              - "203.0.113.50/32"   # Specific external IP
      to:
        - operation:
            hosts:
              - "prometheus.example.com"
```

### JWT-Based Access Control

For more sophisticated auth, use JWT validation:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: prometheus-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: prometheus-require-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            hosts:
              - "prometheus.example.com"
```

This requires a valid JWT token from your identity provider for any request to Prometheus.

## Step 5: Configure DNS

Point `prometheus.example.com` to your IngressGateway's IP:

```bash
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Create an A record: prometheus.example.com -> $GATEWAY_IP"
```

## Step 6: Test the Connection

```bash
# Test basic connectivity
curl -k https://prometheus.example.com/-/healthy

# Test a query
curl -k "https://prometheus.example.com/api/v1/query?query=up"

# Test from a specific IP (if using IP-based access control)
curl -k --resolve prometheus.example.com:443:$GATEWAY_IP \
  "https://prometheus.example.com/api/v1/query?query=istio_requests_total"
```

## Connecting an External Grafana

One of the main reasons to expose Prometheus through the Gateway is to connect an external Grafana instance. In Grafana, add a Prometheus data source:

- URL: `https://prometheus.example.com`
- Access: Server (default)
- TLS: Skip TLS verify if using self-signed certs
- Auth: Add custom headers if using JWT

If using basic auth through an OAuth2 proxy, add the auth header in Grafana's data source configuration.

## Securing the /api/v1/admin Endpoints

Prometheus has admin endpoints that allow you to create snapshots, delete time series, and manage TSDB. These should be locked down:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus-vs
  namespace: istio-system
spec:
  hosts:
    - "prometheus.example.com"
  gateways:
    - prometheus-gateway
  http:
    # Block admin APIs
    - match:
        - uri:
            prefix: /api/v1/admin
      directResponse:
        status: 403
        body:
          string: "Forbidden"
    # Allow everything else
    - route:
        - destination:
            host: prometheus
            port:
              number: 9090
```

This returns a 403 for any admin API calls while allowing regular queries.

## Adding Rate Limiting

Prometheus queries can be expensive. Add rate limiting to prevent abuse:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus-vs
  namespace: istio-system
spec:
  hosts:
    - "prometheus.example.com"
  gateways:
    - prometheus-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/admin
      directResponse:
        status: 403
        body:
          string: "Forbidden"
    - route:
        - destination:
            host: prometheus
            port:
              number: 9090
      timeout: 30s
```

The timeout prevents long-running queries from consuming resources indefinitely. For more advanced rate limiting, use Istio's rate limiting features with an external rate limit service.

## HTTP-Only Setup (Non-Production)

If you just need quick access without TLS (for development only):

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: prometheus-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "prometheus.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus-vs
  namespace: istio-system
spec:
  hosts:
    - "prometheus.example.com"
  gateways:
    - prometheus-gateway
  http:
    - route:
        - destination:
            host: prometheus
            port:
              number: 9090
```

Never do this in production. Anyone intercepting the traffic can see your metric data.

## Monitoring the Prometheus Gateway

Since this traffic flows through the Istio IngressGateway, it automatically generates Istio metrics. You can monitor:

- Request rate to Prometheus
- Query latency
- Error rates

Query these in Prometheus itself (or a second Prometheus instance):

```promql
# Request rate to Prometheus through the gateway
rate(istio_requests_total{destination_service="prometheus.istio-system.svc.cluster.local"}[5m])

# Average query latency
histogram_quantile(0.95, rate(istio_request_duration_milliseconds_bucket{destination_service="prometheus.istio-system.svc.cluster.local"}[5m]))
```

## Troubleshooting

**Connection refused**: Check that the IngressGateway pod is running and the gateway selector matches:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
```

**404 Not Found**: The VirtualService host doesn't match the Gateway host, or the Gateway isn't in the same namespace as the VirtualService.

**TLS handshake failure**: The certificate secret isn't in the right namespace or the `credentialName` doesn't match.

**Empty query results**: You're connected to Prometheus but the query returns nothing. This is a Prometheus issue, not a Gateway issue. Check that Prometheus is scraping your targets.

Exposing Prometheus through the Istio Gateway takes about 10 minutes and gives you a secure, managed access point for your metrics. It's the foundation for central monitoring setups where external systems need to query your mesh data.
