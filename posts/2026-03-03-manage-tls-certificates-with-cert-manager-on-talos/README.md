# How to Manage TLS Certificates with cert-manager on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, cert-manager, TLS, Kubernetes, Let's Encrypt, Certificate

Description: A hands-on guide to installing and using cert-manager on Talos Linux for automated TLS certificate issuance and renewal.

---

TLS certificates are essential for securing communication between services and with external clients. Managing them manually is tedious and error-prone - certificates expire, renewals get missed, and outages happen. cert-manager is a Kubernetes-native certificate management controller that automates the issuance and renewal of TLS certificates from various sources including Let's Encrypt, HashiCorp Vault, and private CAs.

On Talos Linux, cert-manager is particularly valuable because you cannot manually place certificate files on nodes. Everything must be managed through Kubernetes resources, which aligns perfectly with cert-manager's declarative approach. This guide walks through the complete setup and usage of cert-manager on a Talos Linux cluster.

## Prerequisites

You will need:

- A Talos Linux cluster with kubectl access
- Helm installed locally
- A domain name you control (for Let's Encrypt certificates)
- An ingress controller installed (we will use NGINX as an example)

## Installing cert-manager

Install cert-manager using the official Helm chart.

```bash
# Add the Jetstack Helm repository
helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --set resources.requests.cpu=50m \
  --set resources.requests.memory=64Mi \
  --set resources.limits.cpu=100m \
  --set resources.limits.memory=128Mi
```

Verify the installation.

```bash
# Check that all cert-manager pods are running
kubectl get pods -n cert-manager

# You should see three pods:
# cert-manager
# cert-manager-cainjector
# cert-manager-webhook

# Test the installation with a self-signed certificate
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager-test
---
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: test-selfsigned
  namespace: cert-manager-test
spec:
  selfSigned: {}
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: selfsigned-cert
  namespace: cert-manager-test
spec:
  dnsNames:
    - example.com
  secretName: selfsigned-cert-tls
  issuerRef:
    name: test-selfsigned
EOF

# Check the certificate was issued
kubectl get certificate -n cert-manager-test

# Clean up the test
kubectl delete namespace cert-manager-test
```

## Setting Up a Let's Encrypt Issuer

Let's Encrypt provides free TLS certificates. cert-manager supports both the HTTP-01 and DNS-01 challenge types.

### HTTP-01 Challenge (Simplest)

The HTTP-01 challenge works by proving you control the domain through an HTTP endpoint. This requires your ingress to be publicly accessible.

```yaml
# letsencrypt-staging-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Use the staging endpoint for testing
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
---
# letsencrypt-prod-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

```bash
# Apply both issuers
kubectl apply -f letsencrypt-staging-issuer.yaml
kubectl apply -f letsencrypt-prod-issuer.yaml

# Check the issuer status
kubectl get clusterissuer
kubectl describe clusterissuer letsencrypt-prod
```

### DNS-01 Challenge (For Wildcard Certificates)

The DNS-01 challenge verifies domain control by creating a DNS TXT record. This is required for wildcard certificates and works even when your cluster is not publicly accessible.

```yaml
# dns01-issuer-cloudflare.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
      - dns01:
          cloudflare:
            email: your-email@example.com
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

Create the Cloudflare API token secret.

```bash
kubectl create secret generic cloudflare-api-token \
  --namespace cert-manager \
  --from-literal=api-token=YOUR_CLOUDFLARE_API_TOKEN
```

## Requesting Certificates

There are two main ways to request certificates: directly through Certificate resources or through Ingress annotations.

### Method 1: Certificate Resource

```yaml
# my-app-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-app-tls
  namespace: default
spec:
  secretName: my-app-tls-secret
  duration: 2160h    # 90 days
  renewBefore: 720h  # Renew 30 days before expiry
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - www.app.example.com
```

```bash
kubectl apply -f my-app-certificate.yaml

# Watch the certificate issuance progress
kubectl get certificate my-app-tls -w

# Check for errors if it does not become ready
kubectl describe certificate my-app-tls
kubectl describe certificaterequest -l cert-manager.io/certificate-name=my-app-tls
kubectl describe order -l cert-manager.io/certificate-name=my-app-tls
```

### Method 2: Ingress Annotations

This is the simplest approach - just annotate your Ingress and cert-manager handles everything.

```yaml
# my-app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    # Tell cert-manager to issue a certificate
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: my-app-auto-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

cert-manager will automatically create a Certificate resource, complete the ACME challenge, and store the certificate in the specified secret.

## Wildcard Certificates

Wildcard certificates require DNS-01 validation.

```yaml
# wildcard-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: default
spec:
  secretName: wildcard-example-com-tls
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - "example.com"
```

## Setting Up a Private CA

For internal services that do not need publicly trusted certificates, you can use cert-manager as a private CA.

```yaml
# private-ca.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: private-ca
spec:
  ca:
    secretName: private-ca-key-pair
---
# Generate the CA key pair
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: private-ca-cert
  namespace: cert-manager
spec:
  isCA: true
  duration: 87600h  # 10 years
  secretName: private-ca-key-pair
  commonName: "Talos Cluster Private CA"
  issuerRef:
    name: selfsigned
    kind: ClusterIssuer
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: selfsigned
spec:
  selfSigned: {}
```

```bash
kubectl apply -f private-ca.yaml

# Now issue certificates using the private CA
```

```yaml
# internal-service-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-api-tls
  namespace: default
spec:
  secretName: internal-api-tls-secret
  duration: 8760h    # 1 year
  renewBefore: 720h  # 30 days before expiry
  issuerRef:
    name: private-ca
    kind: ClusterIssuer
  dnsNames:
    - api.internal.svc.cluster.local
    - api.internal
```

## Monitoring Certificate Health

Set up alerts for certificates that are approaching expiry.

```bash
# List all certificates and their expiry dates
kubectl get certificates --all-namespaces \
  -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRY:.status.notAfter

# Check for certificates expiring within 14 days
kubectl get certificates --all-namespaces -o json | \
  jq -r '.items[] | select(.status.notAfter) | "\(.metadata.namespace)/\(.metadata.name): expires \(.status.notAfter)"'
```

cert-manager also exposes Prometheus metrics that you can scrape for monitoring.

```yaml
# Enable Prometheus metrics in cert-manager
# Add to Helm values:
prometheus:
  enabled: true
  servicemonitor:
    enabled: true
```

Key metrics to watch:

- `certmanager_certificate_ready_status` - whether certificates are ready
- `certmanager_certificate_expiration_timestamp_seconds` - when certificates expire
- `certmanager_certificate_renewal_timestamp_seconds` - when renewals are scheduled

## Troubleshooting on Talos Linux

Common issues and how to debug them:

```bash
# Check cert-manager controller logs
kubectl logs -n cert-manager -l app=cert-manager

# Check webhook logs (often the source of issues)
kubectl logs -n cert-manager -l app=webhook

# Debug a specific certificate
kubectl describe certificate my-app-tls
kubectl describe certificaterequest -n default
kubectl describe order -n default
kubectl describe challenge -n default
```

On Talos Linux, the most common issues are network-related. Make sure your cluster's DNS and outbound networking allow cert-manager to reach the ACME servers and any DNS providers.

## Wrapping Up

cert-manager on Talos Linux gives you fully automated TLS certificate management that requires no manual intervention. From free Let's Encrypt certificates for public services to private CA certificates for internal communication, cert-manager handles issuance, renewal, and storage. On Talos Linux, where you cannot manually place certificate files on nodes, cert-manager is not just convenient but practically essential. Set it up once, configure monitoring for expiration alerts, and you can largely forget about certificate management going forward.
