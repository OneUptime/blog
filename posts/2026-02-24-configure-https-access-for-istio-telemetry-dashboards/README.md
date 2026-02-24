# How to Configure HTTPS Access for Istio Telemetry Dashboards

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTPS, Telemetry, TLS, Kubernetes, Security

Description: Step-by-step instructions for setting up HTTPS access to Grafana, Kiali, Prometheus, and Jaeger dashboards through Istio's ingress gateway.

---

Running Istio telemetry dashboards over plain HTTP is fine when you are port-forwarding to localhost. But once you want to share those dashboards with your team through a real domain name, you need HTTPS. Sending credentials and sensitive mesh data over unencrypted connections is not something you want in any environment beyond local development.

This guide shows you how to expose Grafana, Kiali, Prometheus, and Jaeger over HTTPS using Istio's own ingress gateway and TLS certificates.

## Prerequisites

You need a working Istio installation with telemetry addons deployed. If you have not installed the addons yet:

```bash
kubectl apply -f samples/addons/
kubectl rollout status deployment/grafana -n istio-system
kubectl rollout status deployment/kiali -n istio-system
kubectl rollout status deployment/prometheus -n istio-system
kubectl rollout status deployment/jaeger -n istio-system
```

You also need a domain name that points to your Istio ingress gateway's external IP, and either a real TLS certificate or cert-manager installed for automatic certificate provisioning.

## Step 1: Get a TLS Certificate

If you are using cert-manager (which you should for any production setup), create a Certificate resource:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: telemetry-tls
  namespace: istio-system
spec:
  secretName: telemetry-tls-credential
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - grafana.example.com
    - kiali.example.com
    - prometheus.example.com
    - jaeger.example.com
```

If you already have a certificate and key, create the secret manually:

```bash
kubectl create secret tls telemetry-tls-credential \
  --cert=path/to/cert.pem \
  --key=path/to/key.pem \
  -n istio-system
```

## Step 2: Create the Gateway Resource

Define an Istio Gateway that terminates TLS for your telemetry domains:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: telemetry-gateway
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
        credentialName: telemetry-tls-credential
      hosts:
        - grafana.example.com
        - kiali.example.com
        - prometheus.example.com
        - jaeger.example.com
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - grafana.example.com
        - kiali.example.com
        - prometheus.example.com
        - jaeger.example.com
```

The second server block handles HTTP-to-HTTPS redirects so nobody accidentally accesses dashboards over plain HTTP.

## Step 3: Create VirtualService for Grafana

Route traffic from the gateway to the Grafana service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grafana-vs
  namespace: istio-system
spec:
  hosts:
    - grafana.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: grafana.istio-system.svc.cluster.local
            port:
              number: 3000
```

## Step 4: Create VirtualService for Kiali

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali-vs
  namespace: istio-system
spec:
  hosts:
    - kiali.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: kiali.istio-system.svc.cluster.local
            port:
              number: 20001
```

## Step 5: Create VirtualService for Prometheus

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: prometheus-vs
  namespace: istio-system
spec:
  hosts:
    - prometheus.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: prometheus.istio-system.svc.cluster.local
            port:
              number: 9090
```

## Step 6: Create VirtualService for Jaeger

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: jaeger-vs
  namespace: istio-system
spec:
  hosts:
    - jaeger.example.com
  gateways:
    - telemetry-gateway
  http:
    - route:
        - destination:
            host: tracing.istio-system.svc.cluster.local
            port:
              number: 80
```

Note that Jaeger's service is often named `tracing` in the default Istio addon manifests. Double-check with `kubectl get svc -n istio-system` to confirm the service name in your cluster.

## Step 7: Configure DNS

Point your domain names to the ingress gateway's external IP:

```bash
export INGRESS_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo $INGRESS_IP
```

Create A records in your DNS provider for each subdomain pointing to that IP. If your cloud provider gives you a hostname instead of an IP (common with AWS), use CNAME records instead.

## Step 8: Verify HTTPS Access

Test each dashboard:

```bash
curl -I https://grafana.example.com
curl -I https://kiali.example.com
curl -I https://prometheus.example.com
curl -I https://jaeger.example.com
```

You should see HTTP 200 responses with valid TLS. Check the certificate details:

```bash
openssl s_client -connect grafana.example.com:443 -servername grafana.example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates -subject
```

## Using a Single Domain with Path-Based Routing

If you prefer using one domain with different paths instead of subdomains, you can consolidate everything into a single VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: telemetry-vs
  namespace: istio-system
spec:
  hosts:
    - telemetry.example.com
  gateways:
    - telemetry-gateway
  http:
    - match:
        - uri:
            prefix: /grafana
      rewrite:
        uri: /
      route:
        - destination:
            host: grafana.istio-system.svc.cluster.local
            port:
              number: 3000
    - match:
        - uri:
            prefix: /kiali
      rewrite:
        uri: /
      route:
        - destination:
            host: kiali.istio-system.svc.cluster.local
            port:
              number: 20001
    - match:
        - uri:
            prefix: /prometheus
      rewrite:
        uri: /
      route:
        - destination:
            host: prometheus.istio-system.svc.cluster.local
            port:
              number: 9090
```

Note that path-based routing can be tricky with some dashboards because they have hardcoded asset paths. Grafana supports a `root_url` configuration option to handle this. Kiali has a `web_root` setting. You may need to configure those to match your chosen path prefix.

## Adding HSTS Headers

For extra security, add HTTP Strict Transport Security headers so browsers always use HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grafana-vs
  namespace: istio-system
spec:
  hosts:
    - grafana.example.com
  gateways:
    - telemetry-gateway
  http:
    - headers:
        response:
          set:
            strict-transport-security: "max-age=31536000; includeSubDomains"
      route:
        - destination:
            host: grafana.istio-system.svc.cluster.local
            port:
              number: 3000
```

## Troubleshooting Common Issues

If you get a 503 error, check that the backend pods are running:

```bash
kubectl get pods -n istio-system -l app=grafana
```

If TLS handshake fails, verify the secret exists and has the right data:

```bash
kubectl get secret telemetry-tls-credential -n istio-system -o yaml
```

If the certificate is not being picked up, check the ingress gateway logs:

```bash
kubectl logs -l app=istio-ingressgateway -n istio-system --tail=50
```

Look for errors related to SDS (Secret Discovery Service) or certificate loading. A common mistake is creating the TLS secret in the wrong namespace - it must be in the same namespace as the ingress gateway.

With HTTPS configured, your telemetry dashboards are protected from eavesdropping and man-in-the-middle attacks. The next step would be adding authentication, which you can do through Istio's RequestAuthentication and AuthorizationPolicy resources or through each addon's built-in auth mechanisms.
