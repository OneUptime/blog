# How to Configure cert-manager with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, cert-manager, kubernetes, gitops, tls, certificates, ssl, networking

Description: A comprehensive guide to deploying and configuring cert-manager in Kubernetes using Flux CD for automated TLS certificate management.

---

## Introduction

cert-manager is the de facto standard for automating TLS certificate management in Kubernetes. It integrates with certificate authorities like Let's Encrypt, HashiCorp Vault, Venafi, and self-signed CAs to issue and renew certificates automatically. Deploying cert-manager through Flux CD gives you a GitOps-driven approach to certificate lifecycle management, where all issuers, certificates, and configurations are version-controlled.

This guide covers installing cert-manager with Flux CD, configuring various issuers, and automating certificate provisioning.

## Prerequisites

- A Kubernetes cluster (v1.24 or later)
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- A domain name you control (for ACME/Let's Encrypt)
- A Git repository connected to Flux CD

## Adding the cert-manager Helm Repository

```yaml
# clusters/my-cluster/sources/cert-manager-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
```

## Creating the Namespace

```yaml
# clusters/my-cluster/namespaces/cert-manager-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    toolkit.fluxcd.io/tenant: networking
```

## Deploying cert-manager

```yaml
# clusters/my-cluster/helm-releases/cert-manager.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.16.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
      interval: 12h
  install:
    # Install CRDs with the chart
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Install CRDs as part of the Helm release
    crds:
      enabled: true
      keep: true

    # Replica count for high availability
    replicaCount: 2

    # Resource limits
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi

    # Webhook configuration
    webhook:
      replicaCount: 2
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi

    # CA Injector configuration
    cainjector:
      replicaCount: 2
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 256Mi

    # Enable Prometheus metrics
    prometheus:
      enabled: true
      servicemonitor:
        enabled: true

    # DNS01 recursive nameservers for ACME challenges
    extraArgs:
      - --dns01-recursive-nameservers-only
      - --dns01-recursive-nameservers=8.8.8.8:53,1.1.1.1:53
```

## Configuring a Self-Signed Issuer

A self-signed issuer is useful for development and internal services.

```yaml
# clusters/my-cluster/cert-manager-config/self-signed-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: self-signed
spec:
  selfSigned: {}
```

## Configuring a CA Issuer

Create an internal Certificate Authority for issuing certificates within the cluster.

```yaml
# clusters/my-cluster/cert-manager-config/ca-issuer.yaml
# First, create a self-signed root CA certificate
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: cluster-ca
  namespace: cert-manager
spec:
  isCA: true
  commonName: cluster-ca
  secretName: cluster-ca-secret
  duration: 87600h  # 10 years
  renewBefore: 8760h  # 1 year before expiry
  privateKey:
    algorithm: ECDSA
    size: 256
  issuerRef:
    name: self-signed
    kind: ClusterIssuer
---
# Create a ClusterIssuer that uses the CA
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: cluster-ca-issuer
spec:
  ca:
    secretName: cluster-ca-secret
```

## Configuring ACME Issuer (Let's Encrypt)

### HTTP01 Challenge Solver

```yaml
# clusters/my-cluster/cert-manager-config/letsencrypt-http01.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Staging server for testing
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
---
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    # Production server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

### DNS01 Challenge Solver (AWS Route 53)

```yaml
# clusters/my-cluster/cert-manager-config/letsencrypt-dns01-aws.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns01
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns01-key
    solvers:
      - dns01:
          route53:
            region: us-east-1
            # Use IRSA or static credentials
            # For IRSA, just set the service account annotation
            hostedZoneID: Z1234567890
        # Only use this solver for specific domains
        selector:
          dnsZones:
            - "example.com"
```

### DNS01 Challenge Solver (Cloudflare)

```yaml
# clusters/my-cluster/cert-manager-config/letsencrypt-dns01-cloudflare.yaml
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
            email: admin@example.com
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
        selector:
          dnsZones:
            - "example.com"
```

## Requesting Certificates

### Certificate Resource

```yaml
# apps/my-app/certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: app-tls
  namespace: default
spec:
  secretName: app-tls-secret
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  # Certificate duration and renewal
  duration: 2160h  # 90 days
  renewBefore: 720h  # 30 days before expiry
  # Domain names
  dnsNames:
    - app.example.com
    - www.example.com
  # Private key configuration
  privateKey:
    algorithm: RSA
    size: 2048
    rotationPolicy: Always
```

### Ingress Annotation (Automatic)

cert-manager can automatically issue certificates for Ingress resources using annotations.

```yaml
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    # Tell cert-manager which issuer to use
    cert-manager.io/cluster-issuer: letsencrypt-production
    # Optional: override the certificate duration
    cert-manager.io/duration: "2160h"
    cert-manager.io/renew-before: "720h"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      # cert-manager will create this secret
      secretName: app-tls-secret
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

## Wildcard Certificates

```yaml
# clusters/my-cluster/cert-manager-config/wildcard-cert.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-tls
  namespace: default
spec:
  secretName: wildcard-tls-secret
  issuerRef:
    # Wildcard certificates require DNS01 challenge
    name: letsencrypt-dns01
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
    - "example.com"
  privateKey:
    algorithm: RSA
    size: 2048
```

## Flux Kustomization

```yaml
# clusters/my-cluster/cert-manager-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/cert-manager-config
  prune: true
  dependsOn:
    - name: cert-manager-helm
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
  timeout: 5m
```

## Verifying Certificates

```bash
# Check cert-manager pods
kubectl get pods -n cert-manager

# List all certificates
kubectl get certificates -A

# Check certificate status and readiness
kubectl describe certificate app-tls -n default

# List certificate requests
kubectl get certificaterequests -A

# Check issuer status
kubectl get clusterissuers

# View certificate details from the secret
kubectl get secret app-tls-secret -n default -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

## Troubleshooting

```bash
# Check cert-manager controller logs
kubectl logs -n cert-manager deploy/cert-manager

# Check webhook logs
kubectl logs -n cert-manager deploy/cert-manager-webhook

# View ACME challenges
kubectl get challenges -A

# View ACME orders
kubectl get orders -A

# Debug a specific certificate
kubectl describe certificate app-tls -n default
kubectl describe certificaterequest <name> -n default
kubectl describe order <name> -n default
kubectl describe challenge <name> -n default
```

## Conclusion

cert-manager with Flux CD provides a fully automated, GitOps-driven certificate management solution for Kubernetes. Certificates are automatically issued, renewed, and rotated without manual intervention. All issuer configurations are version-controlled in Git, ensuring consistency across environments. Whether you use Let's Encrypt for public-facing services or an internal CA for cluster communication, cert-manager and Flux CD together make TLS management seamless.
