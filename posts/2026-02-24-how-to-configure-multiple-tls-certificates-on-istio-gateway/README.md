# How to Configure Multiple TLS Certificates on Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Gateway, Certificate, Kubernetes

Description: Step-by-step guide to configuring multiple TLS certificates on an Istio ingress gateway for serving multiple domains with different SSL certificates.

---

When you host multiple domains behind a single Istio ingress gateway, each domain needs its own TLS certificate. You might have `api.example.com` and `dashboard.example.com` each with their own certificate, or even completely different domains like `example.com` and `anotherdomain.com`. Istio supports this through SNI-based TLS routing, where the gateway selects the right certificate based on the hostname in the TLS handshake.

## Prerequisites

You need:
- Istio 1.20+ installed on your cluster
- TLS certificates for each domain (we will create test ones)
- kubectl access to the cluster

## Creating TLS Secrets

First, create Kubernetes secrets containing your TLS certificates. Each domain gets its own secret:

```bash
# Create secret for api.example.com
kubectl create secret tls api-example-cert \
  --cert=api.example.com.crt \
  --key=api.example.com.key \
  -n istio-system

# Create secret for dashboard.example.com
kubectl create secret tls dashboard-example-cert \
  --cert=dashboard.example.com.crt \
  --key=dashboard.example.com.key \
  -n istio-system

# Create secret for anotherdomain.com
kubectl create secret tls anotherdomain-cert \
  --cert=anotherdomain.com.crt \
  --key=anotherdomain.com.key \
  -n istio-system
```

The secrets need to be in the same namespace as the Istio ingress gateway, which is `istio-system` by default.

For testing, you can generate self-signed certificates:

```bash
# Generate self-signed cert for api.example.com
openssl req -x509 -newkey rsa:4096 -keyout api.example.com.key \
  -out api.example.com.crt -days 365 -nodes \
  -subj "/CN=api.example.com"

# Generate self-signed cert for dashboard.example.com
openssl req -x509 -newkey rsa:4096 -keyout dashboard.example.com.key \
  -out dashboard.example.com.crt -days 365 -nodes \
  -subj "/CN=dashboard.example.com"
```

## Configuring the Gateway with Multiple Certificates

The Gateway resource supports multiple `servers` entries, each with its own TLS configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https-api
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-example-cert
      hosts:
        - "api.example.com"
    - port:
        number: 443
        name: https-dashboard
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: dashboard-example-cert
      hosts:
        - "dashboard.example.com"
    - port:
        number: 443
        name: https-anotherdomain
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: anotherdomain-cert
      hosts:
        - "anotherdomain.com"
```

Each server block listens on port 443 but uses a different `credentialName` to select the right certificate based on the SNI hostname. The `name` field must be unique across all server entries.

## Routing Traffic to Backend Services

Now create VirtualService resources to route traffic from each host to the correct backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-vs
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - multi-domain-gateway
  http:
    - route:
        - destination:
            host: api-service.default.svc.cluster.local
            port:
              number: 80

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: dashboard-vs
  namespace: default
spec:
  hosts:
    - "dashboard.example.com"
  gateways:
    - multi-domain-gateway
  http:
    - route:
        - destination:
            host: dashboard-service.default.svc.cluster.local
            port:
              number: 80

---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: anotherdomain-vs
  namespace: default
spec:
  hosts:
    - "anotherdomain.com"
  gateways:
    - multi-domain-gateway
  http:
    - route:
        - destination:
            host: another-service.default.svc.cluster.local
            port:
              number: 80
```

## Using SDS (Secret Discovery Service)

The `credentialName` approach uses Istio's SDS to dynamically load certificates. This is the recommended approach because:

1. You do not need to mount certificate files into the gateway pod
2. Certificate rotations are picked up automatically
3. You do not need to restart the gateway when certificates change

When you update a secret, Istio's SDS detects the change and updates the certificate in the Envoy proxy without any downtime:

```bash
# Rotate a certificate
kubectl create secret tls api-example-cert \
  --cert=new-api.example.com.crt \
  --key=new-api.example.com.key \
  -n istio-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

## HTTP to HTTPS Redirect

You probably want to redirect HTTP traffic to HTTPS. Add an HTTP server to the Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "api.example.com"
        - "dashboard.example.com"
        - "anotherdomain.com"
    - port:
        number: 443
        name: https-api
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-example-cert
      hosts:
        - "api.example.com"
    - port:
        number: 443
        name: https-dashboard
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: dashboard-example-cert
      hosts:
        - "dashboard.example.com"
    - port:
        number: 443
        name: https-anotherdomain
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: anotherdomain-cert
      hosts:
        - "anotherdomain.com"
```

The `httpsRedirect: true` on the HTTP server sends a 301 redirect to the HTTPS URL.

## Using cert-manager for Automatic Certificate Management

Manually managing certificates is tedious. Use cert-manager with Let's Encrypt for automatic certificate issuance and renewal:

```bash
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager -n cert-manager --create-namespace --set installCRDs=true
```

Create a ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: istio
```

Create Certificate resources for each domain:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-example-cert
  namespace: istio-system
spec:
  secretName: api-example-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - api.example.com

---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dashboard-example-cert
  namespace: istio-system
spec:
  secretName: dashboard-example-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - dashboard.example.com
```

cert-manager will create the TLS secrets automatically and renew them before they expire. The Istio gateway picks up the secrets through SDS.

## Verifying the Configuration

Check that the gateway has the right certificates:

```bash
# Check gateway configuration
istioctl proxy-config listeners <istio-ingressgateway-pod> -n istio-system

# Check the certificates loaded
istioctl proxy-config secrets <istio-ingressgateway-pod> -n istio-system

# Test with curl
curl -v --resolve api.example.com:443:<gateway-ip> https://api.example.com/
curl -v --resolve dashboard.example.com:443:<gateway-ip> https://dashboard.example.com/
```

The `istioctl proxy-config secrets` command shows all certificates loaded in the gateway's Envoy proxy, including their expiration dates.

## Troubleshooting

**Certificate not found error:** Make sure the secret is in the `istio-system` namespace (or wherever your gateway pods run) and that the `credentialName` matches the secret name exactly.

```bash
kubectl get secrets -n istio-system | grep cert
```

**Wrong certificate being served:** This usually means the SNI hostname does not match any of the server entries. Check with:

```bash
openssl s_client -connect <gateway-ip>:443 -servername api.example.com
```

**Configuration errors:** Run the analyzer:

```bash
istioctl analyze -n default
istioctl analyze -n istio-system
```

## Summary

Configuring multiple TLS certificates on an Istio gateway is straightforward using the `credentialName` field with Kubernetes TLS secrets. Each domain gets its own server entry in the Gateway resource, and Istio uses SNI to select the right certificate during the TLS handshake. For production use, combine this with cert-manager for automatic certificate issuance and renewal. The SDS mechanism ensures certificate updates happen without gateway restarts or downtime.
