# How to Use Cert-Manager Operator on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Cert-Manager, TLS, Certificates, Security, Let's Encrypt

Description: Learn how to deploy and configure cert-manager on Talos Linux for automatic TLS certificate issuance and renewal in your Kubernetes cluster.

---

Managing TLS certificates manually is tedious and error-prone. Certificates expire, renewals get missed, and outages happen. Cert-manager solves this by automating certificate issuance and renewal within Kubernetes. It works with various certificate authorities including Let's Encrypt, HashiCorp Vault, and self-signed CAs. On Talos Linux, cert-manager is practically essential since you cannot manually manage certificate files on the immutable host filesystem - everything must go through Kubernetes resources.

This guide covers deploying cert-manager on Talos Linux and configuring it for common certificate management scenarios.

## What Cert-Manager Does

Cert-manager adds certificate management capabilities to your Kubernetes cluster through custom resources:

- **Issuer** / **ClusterIssuer** - Defines where certificates come from (Let's Encrypt, Vault, self-signed, etc.)
- **Certificate** - Requests a certificate from an Issuer
- **CertificateRequest** - A one-time request for a certificate (usually created automatically)
- **Order** - Tracks an ACME certificate order (for Let's Encrypt)
- **Challenge** - Tracks an ACME challenge (HTTP-01 or DNS-01)

When you create a Certificate resource, cert-manager automatically requests the certificate from the configured Issuer, stores it in a Kubernetes Secret, and renews it before it expires.

## Installing Cert-Manager

Install cert-manager using Helm:

```bash
# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true \
  --set prometheus.enabled=true \
  --set webhook.timeoutSeconds=30
```

Verify the installation:

```bash
# Check that all cert-manager pods are running
kubectl get pods -n cert-manager

# You should see three pods:
# cert-manager-xxxx                 Running
# cert-manager-cainjector-xxxx      Running
# cert-manager-webhook-xxxx         Running

# Verify the CRDs are installed
kubectl get crds | grep cert-manager

# Test the installation with a self-signed certificate
kubectl apply -f - << 'EOF'
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: test-selfsigned
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: test-cert
  namespace: cert-manager
spec:
  secretName: test-cert-tls
  issuerRef:
    name: test-selfsigned
    kind: ClusterIssuer
  commonName: test.example.com
  dnsNames:
  - test.example.com
EOF

# Check if the certificate was issued
kubectl get certificate test-cert -n cert-manager
kubectl get secret test-cert-tls -n cert-manager

# Clean up the test resources
kubectl delete certificate test-cert -n cert-manager
kubectl delete clusterissuer test-selfsigned
```

## Setting Up Let's Encrypt

The most common use case is automated certificates from Let's Encrypt.

### Staging Issuer (for testing)

Always start with the staging environment to avoid hitting rate limits:

```yaml
# letsencrypt-staging.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Staging server (for testing)
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

### Production Issuer

```yaml
# letsencrypt-production.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
    - http01:
        ingress:
          class: nginx
```

```bash
kubectl apply -f letsencrypt-staging.yaml
kubectl apply -f letsencrypt-production.yaml

# Verify issuers are ready
kubectl get clusterissuer
```

## Requesting Certificates

### Method 1: Certificate Resource

Create a Certificate resource directly:

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: myapp-tls
  namespace: default
spec:
  secretName: myapp-tls-secret
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  dnsNames:
  - myapp.example.com
  - www.myapp.example.com
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
```

```bash
kubectl apply -f certificate.yaml

# Watch the certificate being issued
kubectl describe certificate myapp-tls
kubectl get certificaterequest
kubectl get order
kubectl get challenge
```

### Method 2: Ingress Annotations

The simpler approach is to annotate your Ingress resource, and cert-manager will automatically create the Certificate:

```yaml
# ingress-with-tls.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    # Tell cert-manager to issue a certificate
    cert-manager.io/cluster-issuer: letsencrypt-production
    # Optional: force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls-auto
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 80
```

```bash
kubectl apply -f ingress-with-tls.yaml

# Cert-manager will automatically:
# 1. Create a Certificate resource
# 2. Create a CertificateRequest
# 3. Create an Order (ACME)
# 4. Solve the HTTP-01 challenge
# 5. Store the certificate in the myapp-tls-auto Secret
```

## DNS-01 Challenge Solver

For wildcard certificates or when your cluster is not publicly accessible, use DNS-01 challenges:

### AWS Route53

```yaml
# dns01-route53.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
    - dns01:
        route53:
          region: us-east-1
          hostedZoneID: Z1234567890
          # Using IAM role for service account
          # Or specify accessKeyID and secretAccessKeySecretRef
```

### Cloudflare

```yaml
# dns01-cloudflare.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cloudflare-api-token
  namespace: cert-manager
type: Opaque
stringData:
  api-token: "your-cloudflare-api-token"
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-cloudflare
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-cloudflare-key
    solvers:
    - dns01:
        cloudflare:
          apiTokenSecretRef:
            name: cloudflare-api-token
            key: api-token
```

### Wildcard Certificate

```yaml
# wildcard-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: default
spec:
  secretName: wildcard-example-com-tls
  issuerRef:
    name: letsencrypt-cloudflare
    kind: ClusterIssuer
  dnsNames:
  - "example.com"
  - "*.example.com"
```

## Self-Signed CA for Internal Services

For internal services on your Talos cluster, set up a self-signed CA:

```yaml
# internal-ca.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned-issuer
spec:
  selfSigned: {}
---
# Create a CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: "Talos Internal CA"
  secretName: internal-ca-secret
  duration: 87600h  # 10 years
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
---
# Create an issuer that uses the CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-secret
```

```bash
kubectl apply -f internal-ca.yaml

# Now you can issue certificates from the internal CA
```

Use the internal CA for service-to-service TLS:

```yaml
# internal-service-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-internal-tls
  namespace: default
spec:
  secretName: api-internal-tls
  issuerRef:
    name: internal-ca-issuer
    kind: ClusterIssuer
  dnsNames:
  - api.default.svc.cluster.local
  - api.default.svc
  - api
  duration: 8760h   # 1 year
  renewBefore: 720h  # 30 days
```

## Monitoring Certificate Status

```bash
# List all certificates and their status
kubectl get certificates --all-namespaces

# Check a specific certificate
kubectl describe certificate myapp-tls

# Check certificate expiration
kubectl get secret myapp-tls-secret -o jsonpath='{.data.tls\.crt}' | \
  base64 -d | openssl x509 -noout -enddate

# View cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=50

# Check for failed certificate requests
kubectl get certificaterequest --all-namespaces \
  -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,REASON:.status.conditions[0].reason

# Check ACME orders
kubectl get orders --all-namespaces
kubectl get challenges --all-namespaces
```

## Setting Up Monitoring Alerts

Create Prometheus alerts for certificate expiration:

```yaml
# cert-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: monitoring
spec:
  groups:
  - name: cert-manager
    rules:
    - alert: CertificateExpiringSoon
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < 604800
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Certificate {{ $labels.name }} expires in less than 7 days"

    - alert: CertificateExpiryCritical
      expr: certmanager_certificate_expiration_timestamp_seconds - time() < 172800
      for: 1h
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} expires in less than 2 days"

    - alert: CertificateNotReady
      expr: certmanager_certificate_ready_status{condition="False"} == 1
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "Certificate {{ $labels.name }} is not ready"
```

## Troubleshooting

When certificates are not being issued:

```bash
# Check the certificate status
kubectl describe certificate <name>

# Check the certificate request
kubectl get certificaterequest -o wide
kubectl describe certificaterequest <name>

# For ACME certificates, check orders and challenges
kubectl get orders
kubectl describe order <name>

kubectl get challenges
kubectl describe challenge <name>

# Check cert-manager logs for errors
kubectl logs -n cert-manager -l app=cert-manager --tail=100 | grep -i error

# Common issues:
# - DNS not pointing to the cluster (HTTP-01 challenge fails)
# - Firewall blocking port 80 (HTTP-01 challenge fails)
# - Wrong DNS credentials (DNS-01 challenge fails)
# - Rate limited by Let's Encrypt (too many requests)
```

## Wrapping Up

Cert-manager on Talos Linux automates the entire certificate lifecycle, from issuance to renewal. Start with the staging Let's Encrypt issuer to test your setup, then switch to production once everything works. Use HTTP-01 challenges for standard certificates and DNS-01 for wildcard certificates. Set up an internal CA for service-to-service encryption. Monitor certificate expiration with Prometheus alerts and check cert-manager logs when troubleshooting. With cert-manager handling your certificates, you never have to worry about expired TLS certificates causing outages again.
