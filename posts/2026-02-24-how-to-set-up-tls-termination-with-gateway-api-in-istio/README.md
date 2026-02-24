# How to Set Up TLS Termination with Gateway API in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, TLS, Security, Kubernetes

Description: A step-by-step guide to setting up TLS termination using the Kubernetes Gateway API with Istio, covering certificate management, multiple domains, cert-manager integration, and mTLS.

---

TLS termination at the gateway means the gateway decrypts incoming HTTPS traffic and forwards plaintext HTTP to your backend services. This is the most common pattern for production deployments because it centralizes certificate management at the gateway instead of requiring each service to handle its own TLS. With the Kubernetes Gateway API and Istio, setting this up is straightforward.

## The Basics

TLS termination happens when a Gateway listener is configured with `protocol: HTTPS` and `tls.mode: Terminate`. The gateway needs access to a TLS certificate and private key, which are stored as Kubernetes Secrets.

## Creating a TLS Certificate Secret

First, you need a TLS certificate. For production, you'd get this from a Certificate Authority. For testing, you can create a self-signed certificate:

```bash
# Generate a self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=app.example.com" \
  -addext "subjectAltName=DNS:app.example.com,DNS:www.example.com"

# Create the Kubernetes Secret
kubectl create secret tls app-tls-cert \
  --cert=tls.crt \
  --key=tls.key \
  -n production
```

The secret must be in the same namespace as the Gateway (unless you use a ReferenceGrant, covered later).

## Basic HTTPS Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: https-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls-cert
        kind: Secret
    allowedRoutes:
      namespaces:
        from: Same
```

Then attach an HTTPRoute to handle the decrypted traffic:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
  namespace: production
spec:
  parentRefs:
  - name: https-gateway
    sectionName: https
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-app
      port: 80
```

After the gateway terminates TLS, it forwards the request as plaintext HTTP to `my-app`. Within the mesh, Istio's mTLS still encrypts traffic between sidecars, so traffic isn't actually unencrypted in transit.

## HTTP to HTTPS Redirect

You almost always want to redirect HTTP traffic to HTTPS. Set up both listeners on the Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-tls-cert
    allowedRoutes:
      namespaces:
        from: Same
```

Create a redirect route for HTTP and a normal route for HTTPS:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: http-redirect
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
    sectionName: http
  rules:
  - filters:
    - type: RequestRedirect
      requestRedirect:
        scheme: https
        statusCode: 301
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
    sectionName: https
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-app
      port: 80
```

## Multiple Domains with Different Certificates

Host multiple domains on the same gateway, each with its own certificate:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: app-a
    protocol: HTTPS
    port: 443
    hostname: "app-a.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-a-cert
    allowedRoutes:
      namespaces:
        from: Same
  - name: app-b
    protocol: HTTPS
    port: 443
    hostname: "app-b.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: app-b-cert
    allowedRoutes:
      namespaces:
        from: Same
```

The gateway uses SNI (Server Name Indication) to determine which certificate to present. Each listener handles a specific hostname with its own certificate.

## Wildcard Certificates

For wildcard certificates that cover all subdomains:

```bash
kubectl create secret tls wildcard-cert \
  --cert=wildcard.crt \
  --key=wildcard.key \
  -n production
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: wildcard-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: wildcard-https
    protocol: HTTPS
    port: 443
    hostname: "*.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - name: wildcard-cert
    allowedRoutes:
      namespaces:
        from: Same
```

Any subdomain of example.com is covered by this single listener and certificate.

## Using cert-manager for Automatic Certificates

cert-manager automates certificate issuance and renewal. First, set up a ClusterIssuer:

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
        gatewayHTTPRoute:
          parentRefs:
          - name: web-gateway
            namespace: production
```

Then create a Certificate that matches your Gateway:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-cert
  namespace: production
spec:
  secretName: app-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - app.example.com
  - www.example.com
```

cert-manager creates the `app-tls-cert` Secret automatically and renews it before expiration. The Gateway references this secret, and everything works together.

## Referencing Certificates from Other Namespaces

If your TLS certificates are stored in a different namespace (common for centralized cert management), use a ReferenceGrant:

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-cert-ref
  namespace: cert-store
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: production
  to:
  - group: ""
    kind: Secret
```

This allows Gateways in the `production` namespace to reference Secrets in the `cert-store` namespace.

Then reference the secret with the namespace:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: cross-ns-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: shared-tls-cert
        namespace: cert-store
    allowedRoutes:
      namespaces:
        from: Same
```

## Verifying TLS Termination

Test that TLS is working:

```bash
# Get the gateway's external IP
GATEWAY_IP=$(kubectl get gateway web-gateway -n production -o jsonpath='{.status.addresses[0].value}')

# Test with curl
curl -v https://app.example.com --resolve app.example.com:443:$GATEWAY_IP
```

Check the certificate being served:

```bash
openssl s_client -connect $GATEWAY_IP:443 -servername app.example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -dates
```

## Checking Gateway TLS Status

```bash
kubectl get gateway web-gateway -n production -o yaml
```

Look for the listener status:

```yaml
status:
  listeners:
  - name: https
    conditions:
    - type: ResolvedRefs
      status: "True"
      reason: ResolvedRefs
```

If `ResolvedRefs` is False, the gateway couldn't find the certificate secret. Check that:
- The secret exists in the correct namespace
- The secret is of type `kubernetes.io/tls`
- The secret contains `tls.crt` and `tls.key` fields
- If cross-namespace, a ReferenceGrant exists

## Troubleshooting

**Certificate not being served:**

```bash
istioctl proxy-config secret deploy/web-gateway-istio -n production
```

This shows what certificates Envoy has loaded.

**Connection refused or timeout:**

```bash
# Check the gateway pods are running
kubectl get pods -n production -l gateway.networking.k8s.io/gateway-name=web-gateway

# Check the service has an external IP
kubectl get svc -n production | grep web-gateway
```

**Wrong certificate served:**

If using multiple listeners on the same port, make sure each listener has the correct `hostname` set. Without hostnames, Envoy can't distinguish which certificate to use via SNI.

TLS termination at the gateway is a foundational pattern for production deployments. The Gateway API makes it clean and declarative, and combined with cert-manager, you get fully automated certificate lifecycle management with zero manual intervention.
