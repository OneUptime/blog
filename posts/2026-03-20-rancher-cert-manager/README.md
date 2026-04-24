# How to Configure cert-manager in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Cert-Manager, TLS, Certificate, Let's Encrypt

Description: Deploy and configure cert-manager in Rancher to automatically provision and renew TLS certificates from Let's Encrypt, Vault, and other certificate authorities.

## Introduction

cert-manager is a Kubernetes add-on that automates the management and issuance of TLS certificates. It integrates with multiple certificate issuers including Let's Encrypt, HashiCorp Vault, Venafi, and custom CAs. This guide covers installing cert-manager on Rancher and configuring it for production certificate management.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- A domain name (for Let's Encrypt)
- kubectl access

## Step 1: Install cert-manager

```bash
# Add Jetstack Helm repository

helm repo add jetstack https://charts.jetstack.io
helm repo update

# Install cert-manager with CRDs
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --set prometheus.enabled=true \
  --set prometheus.servicemonitor.enabled=true \
  --set prometheus.servicemonitor.labels.release=rancher-monitoring \
  --wait

# Verify installation
kubectl get pods -n cert-manager
kubectl get crd | grep cert-manager.io
```

## Step 2: Configure Let's Encrypt Issuers

```yaml
# letsencrypt-staging.yaml - Let's Encrypt staging (for testing)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Use staging server for testing (higher rate limits)
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
---
# letsencrypt-prod.yaml - Let's Encrypt production
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
      # Use DNS challenge for wildcard certificates
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: Z1XXXXXXXXXXXXXX
            accessKeyIDSecretRef:
              name: route53-credentials
              key: access-key-id
            secretAccessKeySecretRef:
              name: route53-credentials
              key: secret-access-key
        selector:
          dnsZones:
            - example.com
      # Use HTTP challenge for specific domains
      - http01:
          ingress:
            ingressClassName: nginx
        selector:
          dnsNames:
            - specific.example.com
```

## Step 3: Request Certificates

### Via Ingress Annotation

```yaml
# ingress-with-tls.yaml - Ingress with automatic TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: production
  annotations:
    # Tell cert-manager to issue a certificate
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      # cert-manager creates this secret automatically
      secretName: app-tls-cert
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

### Via Certificate Resource

```yaml
# certificate.yaml - Explicit certificate request
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-certificate
  namespace: production
spec:
  secretName: app-tls-cert
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
  isCA: false
  privateKey:
    algorithm: RSA
    encoding: PKCS1
    size: 2048
  dnsNames:
    - app.example.com
    - www.app.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
    group: cert-manager.io
```

## Step 4: Configure Internal CA Issuer

```yaml
# internal-ca-secret.yaml - Create internal CA secret
apiVersion: v1
kind: Secret
metadata:
  name: internal-ca-secret
  namespace: cert-manager
type: kubernetes.io/tls
data:
  # Base64-encoded CA certificate and key
  tls.crt: <base64-ca-cert>
  tls.key: <base64-ca-key>
---
# internal-ca-issuer.yaml - Internal CA ClusterIssuer
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-secret
```

Generate internal CA with openssl:

```bash
# Generate internal CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 \
  -key ca.key \
  -sha256 \
  -subj "/CN=internal-ca/O=Example Inc" \
  -days 3650 \
  -out ca.crt

# Create Kubernetes secret
kubectl create secret tls internal-ca-secret \
  --cert=ca.crt \
  --key=ca.key \
  -n cert-manager
```

## Step 5: Configure Vault Issuer

```yaml
# vault-issuer.yaml - cert-manager with Vault as CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: vault-issuer
spec:
  vault:
    path: pki/sign/production-cert
    server: https://vault.example.com
    caBundle: <base64-vault-ca>
    auth:
      kubernetes:
        role: cert-manager
        mountPath: /v1/auth/kubernetes
        serviceAccountRef:
          name: cert-manager
```

## Step 6: Configure mTLS for Service Mesh

```yaml
# mtls-certificate.yaml - mTLS certificate for service identity
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-service-tls
  namespace: production
spec:
  secretName: my-service-tls
  duration: 24h
  renewBefore: 2h
  isCA: false
  privateKey:
    algorithm: ECDSA
    size: 256
  usages:
    - digital signature
    - server auth
    - client auth
  dnsNames:
    - my-service.production.svc.cluster.local
    - my-service.production.svc
    - my-service
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
```

## Step 7: Monitor Certificate Health

```bash
# Check certificate status
kubectl get certificates --all-namespaces
kubectl get certificaterequests --all-namespaces

# Check certificate expiry
kubectl get certificates --all-namespaces -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name): expires \(.status.notAfter)"'

# List CertificateRequests that are not Ready
kubectl get certificaterequests --all-namespaces -o json | \
  jq -r '.items[] | select(any(.status.conditions[]?; .type == "Ready" and .status != "True")) | "\(.metadata.namespace)/\(.metadata.name)"'

# Manually trigger renewal (requires cmctl)
cmctl renew --namespace=production app-certificate
```

```yaml
# cert-manager-alerts.yaml - Certificate expiry alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: certificates
      rules:
        - alert: CertificateExpiringSoon
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ $labels.namespace }}/{{ $labels.name }} expires in less than 7 days"

        - alert: CertificateExpired
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 0
          for: 0s
          labels:
            severity: critical
          annotations:
            summary: "Certificate {{ $labels.namespace }}/{{ $labels.name }} has expired!"
```

## Conclusion

cert-manager transforms TLS certificate management from a manual, error-prone process into an automated, reliable system. By integrating with Let's Encrypt for public certificates and Vault or internal CAs for private certificates, you can ensure all your services have valid, automatically-renewed TLS certificates. The integration with Rancher's monitoring stack provides visibility into certificate expiry, preventing outages caused by expired certificates.
