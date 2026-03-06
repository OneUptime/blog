# How to Manage Certificate Manager with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, cert-manager, TLS, Certificates, Kubernetes, GitOps, letsencrypt

Description: A practical guide to deploying and managing cert-manager with Flux CD for automated TLS certificate provisioning in Kubernetes.

---

## Introduction

TLS certificates are essential for securing communication in Kubernetes clusters. cert-manager automates the management and issuance of TLS certificates from various sources including Let's Encrypt, HashiCorp Vault, and private CAs. When managed through Flux CD, your entire certificate infrastructure becomes declarative, version-controlled, and automatically reconciled.

This guide covers deploying cert-manager with Flux CD, configuring issuers for different certificate authorities, and setting up automated certificate provisioning.

## Prerequisites

- A running Kubernetes cluster
- Flux CD installed and bootstrapped
- A domain name with DNS management access
- kubectl access to your cluster

## Repository Structure

```text
infrastructure/
  cert-manager/
    namespace.yaml
    helmrepository.yaml
    helmrelease.yaml
    issuers/
      letsencrypt-staging.yaml
      letsencrypt-production.yaml
      self-signed.yaml
    certificates/
      wildcard-cert.yaml
```

## Creating the Namespace

```yaml
# infrastructure/cert-manager/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    monitoring: enabled
```

## Adding the Helm Repository

```yaml
# infrastructure/cert-manager/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
```

## Deploying cert-manager

```yaml
# infrastructure/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.15.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  install:
    # Install CRDs with the chart
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    # Install CRDs as part of the Helm release
    installCRDs: true
    # Enable Prometheus metrics
    prometheus:
      enabled: true
      servicemonitor:
        enabled: true
    # Resource allocation
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
    # Webhook configuration
    webhook:
      resources:
        requests:
          cpu: 25m
          memory: 32Mi
        limits:
          cpu: 100m
          memory: 128Mi
    # CA injector configuration
    cainjector:
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 256Mi
    # DNS01 solver configuration for cloud providers
    # Uncomment and configure for your cloud provider
    # extraArgs:
    #   - --dns01-recursive-nameservers-only
    #   - --dns01-recursive-nameservers=8.8.8.8:53,1.1.1.1:53
```

## Let's Encrypt Staging Issuer

Use the staging issuer for testing to avoid rate limits.

```yaml
# infrastructure/cert-manager/issuers/letsencrypt-staging.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Let's Encrypt staging server
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    # Email for certificate expiry notifications
    email: admin@example.com
    # Secret to store the ACME account private key
    privateKeySecretRef:
      name: letsencrypt-staging-account-key
    solvers:
      # HTTP01 solver using ingress
      - http01:
          ingress:
            ingressClassName: nginx
      # DNS01 solver for wildcard certificates (AWS Route53)
      - dns01:
          route53:
            region: us-east-1
            # Use IRSA for authentication
            # role: arn:aws:iam::123456789012:role/cert-manager-route53
        selector:
          dnsZones:
            - "example.com"
```

## Let's Encrypt Production Issuer

```yaml
# infrastructure/cert-manager/issuers/letsencrypt-production.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production-account-key
    solvers:
      # HTTP01 for standard certificates
      - http01:
          ingress:
            ingressClassName: nginx
      # DNS01 for wildcard certificates
      - dns01:
          route53:
            region: us-east-1
        selector:
          dnsZones:
            - "example.com"
```

## Self-Signed Issuer for Internal Services

```yaml
# infrastructure/cert-manager/issuers/self-signed.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: self-signed
spec:
  selfSigned: {}
---
# Create a CA certificate using the self-signed issuer
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: internal-ca-key-pair
  duration: 87600h  # 10 years
  renewBefore: 8760h  # 1 year
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: self-signed
    kind: ClusterIssuer
---
# ClusterIssuer backed by the internal CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca-issuer
spec:
  ca:
    secretName: internal-ca-key-pair
```

## Wildcard Certificate

Request a wildcard certificate for your domain.

```yaml
# infrastructure/cert-manager/certificates/wildcard-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: cert-manager
spec:
  # Secret where the certificate will be stored
  secretName: wildcard-example-com-tls
  # Certificate validity duration
  duration: 2160h  # 90 days
  # Renew 30 days before expiry
  renewBefore: 720h
  # Subject information
  commonName: "*.example.com"
  dnsNames:
    - "example.com"
    - "*.example.com"
  # Use the production issuer
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  # Private key settings
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always
  # Secret template to add labels and annotations
  secretTemplate:
    labels:
      cert-type: wildcard
    annotations:
      # Allow other namespaces to copy this secret
      reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
      reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
```

## Application-Specific Certificate

Request a certificate for a specific application.

```yaml
# apps/my-app/certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-app-tls
  namespace: my-app
spec:
  secretName: my-app-tls
  duration: 2160h
  renewBefore: 720h
  dnsNames:
    - "my-app.example.com"
    - "api.my-app.example.com"
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  privateKey:
    algorithm: ECDSA
    size: 256
```

## Using Certificates with Ingress

Annotate your Ingress to automatically provision certificates.

```yaml
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: my-app
  annotations:
    # Tell cert-manager to issue a certificate
    cert-manager.io/cluster-issuer: letsencrypt-production
    # Optional: use HTTP01 solver
    cert-manager.io/acme-challenge-type: http01
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-app.example.com
      # cert-manager will create this secret automatically
      secretName: my-app-ingress-tls
  rules:
    - host: my-app.example.com
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

## Flux Kustomization

```yaml
# clusters/my-cluster/cert-manager.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 15m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager-webhook
      namespace: cert-manager
  timeout: 5m
```

## Monitoring Certificate Expiry

Set up Prometheus alerts for certificate expiration.

```yaml
# infrastructure/cert-manager/monitoring/alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: cert-manager
spec:
  groups:
    - name: cert-manager
      rules:
        # Alert when a certificate is expiring soon
        - alert: CertificateExpiringSoon
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 604800
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ $labels.name }} in {{ $labels.namespace }} expires in less than 7 days"
        # Alert when certificate renewal has failed
        - alert: CertificateNotReady
          expr: |
            certmanager_certificate_ready_status{condition="False"} == 1
          for: 30m
          labels:
            severity: critical
          annotations:
            summary: "Certificate {{ $labels.name }} in {{ $labels.namespace }} is not ready"
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations cert-manager
flux get helmreleases -n cert-manager

# Verify cert-manager pods
kubectl get pods -n cert-manager

# List cluster issuers
kubectl get clusterissuers

# Check issuer status
kubectl describe clusterissuer letsencrypt-production

# List certificates
kubectl get certificates --all-namespaces

# Describe a certificate to check status
kubectl describe certificate wildcard-example-com -n cert-manager

# Check certificate secret
kubectl get secret wildcard-example-com-tls -n cert-manager -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

## Troubleshooting

- **Certificate stuck in pending**: Check the CertificateRequest and Order resources. Run `kubectl describe certificaterequest -n <namespace>` to see detailed status
- **ACME challenge failing**: Verify DNS records are correct and the ingress controller is accessible. Check cert-manager logs for challenge details
- **Webhook errors**: Ensure the cert-manager webhook service is running and the API server can reach it. Check webhook pod logs
- **Rate limiting**: If using Let's Encrypt production, check rate limits at https://letsencrypt.org/docs/rate-limits/. Use staging issuer for testing

## Conclusion

Managing cert-manager with Flux CD provides a fully automated, GitOps-driven approach to TLS certificate management. By defining issuers, certificates, and monitoring rules in Git, you ensure that your certificate infrastructure is consistent, auditable, and automatically renewed. This eliminates the risk of certificate expiry outages and simplifies certificate management across multiple clusters and environments.
