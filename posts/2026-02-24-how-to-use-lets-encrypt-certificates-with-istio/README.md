# How to Use Let's Encrypt Certificates with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Let's Encrypt, TLS, cert-manager, Ingress Gateway

Description: How to automatically provision and renew Let's Encrypt TLS certificates for your Istio ingress gateway using cert-manager, with HTTP-01 and DNS-01 challenge examples.

---

If you are exposing services through an Istio ingress gateway, you need TLS certificates for your public-facing domains. Let's Encrypt provides free, automated TLS certificates, and when combined with cert-manager in Kubernetes, the whole process of provisioning and renewing certificates becomes hands-off.

## Prerequisites

You need:
- An Istio installation with an ingress gateway
- cert-manager installed in your cluster
- A domain name that you control
- DNS configured to point to your ingress gateway's external IP

Install cert-manager if you have not already:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s
```

## Setting Up a ClusterIssuer

The ClusterIssuer tells cert-manager how to request certificates from Let's Encrypt. Start with the staging environment for testing:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-account
    solvers:
    - http01:
        ingress:
          class: istio
```

For production:

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
      name: letsencrypt-prod-account
    solvers:
    - http01:
        ingress:
          class: istio
```

Apply both:

```bash
kubectl apply -f letsencrypt-staging-issuer.yaml
kubectl apply -f letsencrypt-prod-issuer.yaml
```

## HTTP-01 Challenge with Istio

The HTTP-01 challenge requires Let's Encrypt to access a specific URL on your domain to verify ownership. cert-manager creates a temporary pod and ingress to serve the challenge response.

For this to work with Istio, you need a Gateway and VirtualService that routes the challenge traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: http-gateway
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
    - "api.example.com"
```

Request the certificate:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-example-com
  namespace: istio-system
spec:
  secretName: api-example-com-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
```

cert-manager will create the challenge, and once Let's Encrypt verifies it, the signed certificate will be stored in the `api-example-com-tls` secret.

## DNS-01 Challenge

DNS-01 challenges are better for wildcard certificates and situations where your ingress gateway is not publicly accessible on port 80. You prove domain ownership by creating a DNS TXT record.

Here is an example using AWS Route53:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-account
    solvers:
    - dns01:
        route53:
          region: us-east-1
          hostedZoneID: Z1234567890
```

For Google Cloud DNS:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-gcp-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-gcp-account
    solvers:
    - dns01:
        cloudDNS:
          project: my-gcp-project
          serviceAccountSecretRef:
            name: clouddns-dns01-solver-svc-acct
            key: key.json
```

Request a wildcard certificate:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: istio-system
spec:
  secretName: wildcard-example-com-tls
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
  dnsNames:
  - "*.example.com"
  - "example.com"
```

## Configuring the Istio Gateway to Use the Certificate

Once the certificate is issued, configure your Gateway to use it:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
      credentialName: api-example-com-tls
    hosts:
    - "api.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "api.example.com"
```

The `credentialName` field references the Kubernetes secret where cert-manager stored the certificate. The HTTP server block with `httpsRedirect: true` redirects all HTTP traffic to HTTPS.

## Important: Secret Location

The TLS secret must be in the same namespace as the Istio ingress gateway (usually `istio-system`). If your Certificate resource is in a different namespace, the gateway will not be able to access it.

```yaml
# The Certificate must create the secret in istio-system
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-example-com
  namespace: istio-system  # Same namespace as the gateway
spec:
  secretName: api-example-com-tls
  # ...
```

## Adding a VirtualService

Route traffic from the gateway to your services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/secure-gateway
  http:
  - match:
    - uri:
        prefix: /api/v1
    route:
    - destination:
        host: my-api.default.svc.cluster.local
        port:
          number: 8080
```

## Automatic Renewal

cert-manager automatically renews certificates before they expire. Let's Encrypt certificates are valid for 90 days, and cert-manager starts renewal at 30 days before expiry by default.

You can check the certificate status:

```bash
# Check certificate status
kubectl get certificate -n istio-system

# Detailed view
kubectl describe certificate api-example-com -n istio-system

# Check the actual certificate expiration
kubectl get secret api-example-com-tls -n istio-system -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -enddate -noout
```

## Monitoring Certificate Renewals

Set up alerts for certificate renewal failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: monitoring
spec:
  groups:
  - name: cert-manager
    rules:
    - alert: CertificateNotReady
      expr: certmanager_certificate_ready_status{condition="False"} == 1
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} is not ready"
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} expires in less than 7 days"
```

## Multiple Domains on One Gateway

You can serve multiple domains with separate certificates:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
  namespace: istio-system
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
      credentialName: api-example-com-tls
    hosts:
    - "api.example.com"
  - port:
      number: 443
      name: https-app
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-example-com-tls
    hosts:
    - "app.example.com"
```

Istio uses SNI (Server Name Indication) to route to the correct certificate based on the hostname.

## Troubleshooting

If the certificate is not being issued:

```bash
# Check cert-manager logs
kubectl logs -n cert-manager deploy/cert-manager

# Check the Certificate resource status
kubectl describe certificate api-example-com -n istio-system

# Check the CertificateRequest
kubectl get certificaterequest -n istio-system

# Check the Order and Challenge resources
kubectl get order -n istio-system
kubectl get challenge -n istio-system
```

Common issues:
- DNS not pointing to the ingress gateway IP (HTTP-01 will fail)
- Port 80 blocked or not exposed on the ingress gateway
- Wrong namespace for the certificate secret
- Rate limits on Let's Encrypt (use staging for testing)

Let's Encrypt with cert-manager and Istio is a solid combination for automated TLS certificate management. Once set up, you never have to think about certificate renewals again.
