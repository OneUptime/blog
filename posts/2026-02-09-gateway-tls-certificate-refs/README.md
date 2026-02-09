# How to implement Gateway TLS configuration with certificate references

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, TLS

Description: Configure TLS termination in Kubernetes Gateway API with certificate references from Secrets, ConfigMaps, and cert-manager, including SNI-based routing, multiple certificates, and automated certificate management for secure traffic.

---

TLS termination at the gateway level provides centralized certificate management and encryption for your applications. The Kubernetes Gateway API supports flexible certificate configuration through certificate references, allowing you to use certificates from various sources including Kubernetes Secrets, cert-manager, and external certificate authorities. This guide shows you how to configure TLS in the Gateway API with different certificate management strategies.

## Basic TLS Configuration with Kubernetes Secrets

Start by creating a TLS certificate as a Kubernetes Secret. For production, use proper certificates from a certificate authority, but for testing you can create self-signed certificates:

```bash
# Generate a self-signed certificate for testing
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key -out tls.crt \
  -subj "/CN=example.com/O=example"

# Create Kubernetes TLS secret
kubectl create secret tls example-tls \
  --cert=tls.crt \
  --key=tls.key \
  --namespace=default
```

Configure a Gateway with TLS termination:

```yaml
# tls-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: tls-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: example-tls
        namespace: default
    allowedRoutes:
      namespaces:
        from: All
```

Apply the configuration:

```bash
kubectl apply -f tls-gateway.yaml
kubectl wait --for=condition=Programmed gateway/tls-gateway --timeout=300s
```

Create an HTTPRoute that uses the TLS gateway:

```yaml
# secure-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: secure-app
  namespace: default
spec:
  parentRefs:
  - name: tls-gateway
  hostnames:
  - "example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: app-service
      port: 8080
```

Test the TLS connection:

```bash
# Get gateway IP
GATEWAY_IP=$(kubectl get gateway tls-gateway -o jsonpath='{.status.addresses[0].value}')

# Test with curl (use -k for self-signed certs)
curl -k https://$GATEWAY_IP/ -H "Host: example.com"

# Verify certificate
openssl s_client -connect $GATEWAY_IP:443 -servername example.com
```

## SNI-Based Routing with Multiple Certificates

Server Name Indication (SNI) allows a single gateway to serve multiple domains with different certificates. Configure multiple listeners with different certificates:

```yaml
# multi-domain-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  # Listener for example.com
  - name: example-com
    protocol: HTTPS
    port: 443
    hostname: "example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: example-com-tls
    allowedRoutes:
      namespaces:
        from: All
  # Listener for api.example.com
  - name: api-example-com
    protocol: HTTPS
    port: 443
    hostname: "api.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: api-example-com-tls
    allowedRoutes:
      namespaces:
        from: All
  # Listener for admin.example.com
  - name: admin-example-com
    protocol: HTTPS
    port: 443
    hostname: "admin.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: admin-example-com-tls
    allowedRoutes:
      namespaces:
        from: All
```

Create routes for each domain:

```yaml
# domain-routes.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: example-com-route
spec:
  parentRefs:
  - name: multi-domain-gateway
    sectionName: example-com
  hostnames:
  - "example.com"
  rules:
  - backendRefs:
    - name: web-service
      port: 8080
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-route
spec:
  parentRefs:
  - name: multi-domain-gateway
    sectionName: api-example-com
  hostnames:
  - "api.example.com"
  rules:
  - backendRefs:
    - name: api-service
      port: 8080
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: admin-route
spec:
  parentRefs:
  - name: multi-domain-gateway
    sectionName: admin-example-com
  hostnames:
  - "admin.example.com"
  rules:
  - backendRefs:
    - name: admin-service
      port: 8080
```

The gateway will automatically select the correct certificate based on the SNI hostname in the TLS handshake.

## Wildcard Certificates

Use a wildcard certificate to cover multiple subdomains:

```bash
# Generate wildcard certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout wildcard.key -out wildcard.crt \
  -subj "/CN=*.example.com/O=example"

kubectl create secret tls wildcard-tls \
  --cert=wildcard.crt \
  --key=wildcard.key
```

Configure gateway with wildcard certificate:

```yaml
# wildcard-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: wildcard-gateway
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: "*.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: wildcard-tls
    allowedRoutes:
      namespaces:
        from: All
```

This certificate will work for any subdomain like `app.example.com`, `api.example.com`, `www.example.com`.

## Cross-Namespace Certificate References

Reference certificates stored in different namespaces using ReferenceGrant:

```yaml
# Certificate in certs namespace
apiVersion: v1
kind: Secret
metadata:
  name: shared-tls-cert
  namespace: certs
type: kubernetes.io/tls
data:
  tls.crt: <base64-cert>
  tls.key: <base64-key>
---
# Grant access from infrastructure namespace
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-to-certs
  namespace: certs
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: infrastructure
  to:
  - group: ""
    kind: Secret
    name: shared-tls-cert
---
# Gateway in infrastructure namespace
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: cross-ns-gateway
  namespace: infrastructure
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: shared-tls-cert
        namespace: certs  # Cross-namespace reference
    allowedRoutes:
      namespaces:
        from: All
```

## Integration with cert-manager

cert-manager automates certificate lifecycle management. Install cert-manager first:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.3/cert-manager.yaml
```

Create a ClusterIssuer for Let's Encrypt:

```yaml
# letsencrypt-issuer.yaml
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
          - name: tls-gateway
            namespace: default
            kind: Gateway
```

Create a Certificate resource:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-cert
  namespace: default
spec:
  secretName: example-com-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - example.com
  - www.example.com
```

The Gateway will automatically use the certificate once cert-manager creates it:

```yaml
# gateway-with-certmanager.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: certmanager-gateway
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: "example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: example-com-tls  # Managed by cert-manager
    allowedRoutes:
      namespaces:
        from: All
```

Monitor certificate status:

```bash
kubectl get certificate
kubectl describe certificate example-com-cert
```

## Automatic Certificate Renewal

cert-manager automatically renews certificates before they expire. Configure renewal settings:

```yaml
# certificate-with-renewal.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: auto-renew-cert
spec:
  secretName: auto-renew-tls
  duration: 2160h  # 90 days
  renewBefore: 720h  # Renew 30 days before expiry
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - example.com
```

Set up alerts for certificate expiration:

```yaml
# prometheusrule-cert-expiry.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiry-alerts
spec:
  groups:
  - name: certificates
    interval: 30s
    rules:
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < (21 * 24 * 3600)
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expiring soon"
        description: "Certificate {{ $labels.name }} in namespace {{ $labels.namespace }} will expire in {{ $value | humanizeDuration }}"
```

## Multiple Certificates per Listener

Some gateway implementations support multiple certificate references per listener for certificate chaining:

```yaml
# chained-certificates.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: chained-cert-gateway
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: server-cert
      - kind: Secret
        name: intermediate-cert
      - kind: Secret
        name: root-cert
    allowedRoutes:
      namespaces:
        from: All
```

This provides the complete certificate chain to clients, improving compatibility.

## TLS Passthrough Mode

For end-to-end encryption where the backend handles TLS termination, use passthrough mode:

```yaml
# passthrough-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: passthrough-gateway
spec:
  gatewayClassName: kong
  listeners:
  - name: tls-passthrough
    protocol: TLS
    port: 443
    tls:
      mode: Passthrough  # No termination, forward encrypted
    allowedRoutes:
      kinds:
      - kind: TLSRoute
      namespaces:
        from: All
---
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TLSRoute
metadata:
  name: passthrough-route
spec:
  parentRefs:
  - name: passthrough-gateway
  hostnames:
  - "secure.example.com"
  rules:
  - backendRefs:
    - name: secure-backend
      port: 443
```

The backend service must handle TLS termination in passthrough mode.

## Monitoring TLS Configuration

Check gateway TLS status:

```bash
# View gateway conditions
kubectl describe gateway tls-gateway

# Check certificate secret
kubectl get secret example-com-tls -o yaml

# Verify certificate expiration
kubectl get certificate -o custom-columns=NAME:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status,EXPIRY:.status.notAfter
```

Test TLS configuration:

```bash
# Check certificate chain
openssl s_client -connect $GATEWAY_IP:443 -servername example.com -showcerts

# Test TLS version and ciphers
nmap --script ssl-enum-ciphers -p 443 $GATEWAY_IP

# Verify HTTPS works
curl -v https://example.com
```

## Troubleshooting TLS Issues

Common TLS configuration problems:

```bash
# Certificate not found
kubectl get secret example-tls -n default

# Certificate format invalid
kubectl get secret example-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -text

# cert-manager not issuing certificate
kubectl describe certificate example-com-cert
kubectl logs -n cert-manager deploy/cert-manager

# Gateway not accepting TLS traffic
kubectl describe gateway tls-gateway
kubectl logs -n <gateway-namespace> -l app=<gateway-controller>
```

Check for certificate validation errors:

```yaml
# Gateway status shows certificate errors
status:
  listeners:
  - name: https
    conditions:
    - type: ResolvedRefs
      status: "False"
      reason: InvalidCertificateRef
      message: "Certificate secret 'example-tls' not found"
```

## Security Best Practices

Configure secure TLS settings:

1. Use TLS 1.2 or higher
2. Disable weak ciphers
3. Enable HSTS headers
4. Implement certificate rotation
5. Monitor certificate expiration

Add security headers in HTTPRoute:

```yaml
# secure-headers-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: secure-headers
spec:
  parentRefs:
  - name: tls-gateway
  rules:
  - filters:
    - type: ResponseHeaderModifier
      responseHeaderModifier:
        add:
        - name: Strict-Transport-Security
          value: "max-age=31536000; includeSubDomains"
        - name: X-Content-Type-Options
          value: "nosniff"
        - name: X-Frame-Options
          value: "DENY"
    backendRefs:
    - name: app-service
      port: 8080
```

TLS certificate management in the Gateway API provides flexible, secure configuration for encrypted traffic. Use Kubernetes Secrets for simple scenarios, integrate cert-manager for automated certificate lifecycle management, leverage SNI for multiple domains, and configure cross-namespace references for centralized certificate storage. The Gateway API's certificate reference model separates certificate management from routing configuration, enabling better security practices and operational workflows.
