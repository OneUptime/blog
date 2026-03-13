# How to Implement Certificate Rotation with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Certificate Rotation, TLS, Cert-Manager, Kubernetes, GitOps, Security

Description: A practical guide to implementing automated TLS certificate rotation in Kubernetes using Flux CD and cert-manager for seamless certificate lifecycle management.

---

## Introduction

TLS certificates are essential for securing communication between services, but they expire and must be rotated regularly. Manual certificate rotation is error-prone and can lead to outages when certificates expire unexpectedly. By combining Flux CD with cert-manager, you can automate the entire certificate lifecycle -- from issuance to rotation to renewal -- using GitOps principles.

This guide covers how to deploy cert-manager via Flux CD, configure certificate issuers, set up automatic rotation policies, and monitor certificate health across your cluster.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- Flux CD v2 installed and bootstrapped
- A domain name with DNS management access
- kubectl configured to access your cluster

## Deploying cert-manager via Flux CD

Install cert-manager as part of your infrastructure stack managed by Flux CD.

```yaml
# infrastructure/cert-manager/namespace.yaml
# Dedicated namespace for cert-manager
apiVersion: v1
kind: Namespace
metadata:
  name: cert-manager
  labels:
    app.kubernetes.io/managed-by: flux
```

```yaml
# infrastructure/cert-manager/helmrelease.yaml
# Deploy cert-manager using Flux HelmRelease
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
      version: "1.14.3"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  values:
    # Install CRDs with the chart
    installCRDs: true
    # Enable Prometheus metrics
    prometheus:
      enabled: true
      servicemonitor:
        enabled: true
    # Resource limits for cert-manager pods
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    # Enable DNS01 challenge solver
    extraArgs:
      - --dns01-recursive-nameservers-only
      - --dns01-recursive-nameservers=8.8.8.8:53,1.1.1.1:53
```

```yaml
# infrastructure/cert-manager/helmrepo.yaml
# Helm repository for cert-manager charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
```

## Configuring Certificate Issuers

Set up ClusterIssuers for different environments and use cases.

```yaml
# infrastructure/cert-manager/cluster-issuer-production.yaml
# ClusterIssuer for production certificates using Let's Encrypt
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    # Let's Encrypt production endpoint
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform-team@mycompany.com
    privateKeySecretRef:
      name: letsencrypt-production-key
    solvers:
      # HTTP01 challenge solver for public-facing services
      - http01:
          ingress:
            class: nginx
        selector:
          dnsZones:
            - "mycompany.com"
      # DNS01 challenge solver for wildcard and internal certificates
      - dns01:
          route53:
            region: us-east-1
            hostedZoneID: Z1234567890
        selector:
          dnsZones:
            - "internal.mycompany.com"
```

```yaml
# infrastructure/cert-manager/cluster-issuer-staging.yaml
# ClusterIssuer for staging certificates (for testing, no rate limits)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    # Let's Encrypt staging endpoint for testing
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: platform-team@mycompany.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            class: nginx
```

```yaml
# infrastructure/cert-manager/internal-ca-issuer.yaml
# ClusterIssuer for internal service-to-service mTLS certificates
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-keypair
---
# The CA certificate used by the internal issuer
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: internal-ca-certificate
  namespace: cert-manager
spec:
  isCA: true
  commonName: internal-ca
  secretName: internal-ca-keypair
  duration: 87600h    # 10 years
  renewBefore: 8760h  # Renew 1 year before expiry
  privateKey:
    algorithm: ECDSA
    size: 256
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

## Creating Certificates with Rotation Policies

Define certificates with explicit rotation settings managed through Flux CD.

```yaml
# apps/production/api-server/certificate.yaml
# TLS certificate for the API server with automatic rotation
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-server-tls
  namespace: production
spec:
  # Name of the Kubernetes Secret where the certificate will be stored
  secretName: api-server-tls-secret
  # Certificate validity duration
  duration: 2160h  # 90 days
  # Renew the certificate 30 days before it expires
  renewBefore: 720h  # 30 days
  # Subject information
  commonName: api.mycompany.com
  dnsNames:
    - api.mycompany.com
    - api.internal.mycompany.com
  # Private key configuration
  privateKey:
    algorithm: ECDSA
    size: 256
    rotationPolicy: Always
  # Use the production Let's Encrypt issuer
  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
  # Secret template to add labels for monitoring
  secretTemplate:
    labels:
      app.kubernetes.io/name: api-server
      cert-rotation/managed: "true"
```

```yaml
# apps/production/api-server/mtls-certificate.yaml
# mTLS certificate for internal service communication
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-server-mtls
  namespace: production
spec:
  secretName: api-server-mtls-secret
  # Shorter duration for internal mTLS certificates
  duration: 720h   # 30 days
  renewBefore: 240h # Renew 10 days before expiry
  commonName: api-server.production.svc.cluster.local
  dnsNames:
    - api-server.production.svc.cluster.local
    - api-server.production.svc
  # Additional usages for mTLS
  usages:
    - server auth
    - client auth
  privateKey:
    algorithm: ECDSA
    size: 256
    # Always generate a new private key on renewal
    rotationPolicy: Always
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
```

## Configuring Ingress with Automatic Certificate Rotation

```yaml
# apps/production/api-server/ingress.yaml
# Ingress configured with cert-manager annotations for automatic TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server
  namespace: production
  annotations:
    # Tell cert-manager which issuer to use
    cert-manager.io/cluster-issuer: letsencrypt-production
    # Force HTTPS redirect
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Enable HSTS
    nginx.ingress.kubernetes.io/hsts: "true"
    nginx.ingress.kubernetes.io/hsts-max-age: "31536000"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.mycompany.com
      # cert-manager will create and manage this secret
      secretName: api-server-tls-secret
  rules:
    - host: api.mycompany.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 443
```

## Managing Certificate Rotation for Flux CD Components

Ensure Flux CD's own webhook certificates are properly rotated.

```yaml
# clusters/production/flux-system/webhook-cert.yaml
# Certificate for Flux CD webhook server
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: flux-webhook-tls
  namespace: flux-system
spec:
  secretName: flux-webhook-tls-secret
  duration: 2160h
  renewBefore: 720h
  dnsNames:
    - webhook-receiver.flux-system.svc
    - webhook-receiver.flux-system.svc.cluster.local
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  privateKey:
    rotationPolicy: Always
```

## Monitoring Certificate Expiry

Deploy monitoring to track certificate expiration and rotation status.

```yaml
# infrastructure/monitoring/cert-monitor-rules.yaml
# PrometheusRule for certificate expiry alerting
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-manager-alerts
  namespace: monitoring
spec:
  groups:
    - name: cert-manager.rules
      rules:
        # Alert when a certificate expires within 14 days
        - alert: CertificateExpiringSoon
          expr: |
            certmanager_certificate_expiration_timestamp_seconds -
            time() < 1209600
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ $labels.name }} expires in less than 14 days"
            description: >-
              Certificate {{ $labels.name }} in namespace
              {{ $labels.namespace }} will expire in
              {{ $value | humanizeDuration }}.

        # Critical alert when certificate expires within 3 days
        - alert: CertificateExpiringCritical
          expr: |
            certmanager_certificate_expiration_timestamp_seconds -
            time() < 259200
          for: 15m
          labels:
            severity: critical
          annotations:
            summary: "Certificate {{ $labels.name }} expires in less than 3 days"

        # Alert when certificate renewal fails
        - alert: CertificateRenewalFailed
          expr: |
            certmanager_certificate_ready_status{condition="False"} == 1
          for: 30m
          labels:
            severity: critical
          annotations:
            summary: "Certificate {{ $labels.name }} renewal has failed"
```

## Setting Up Flux CD Notifications for Certificate Events

```yaml
# clusters/production/notifications/cert-alerts.yaml
# Notification provider and alerts for certificate-related events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: certs-slack
  namespace: flux-system
spec:
  type: slack
  channel: certificate-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: certificate-alerts
  namespace: flux-system
spec:
  providerRef:
    name: certs-slack
  eventSeverity: error
  eventSources:
    # Watch cert-manager HelmRelease for issues
    - kind: HelmRelease
      name: cert-manager
      namespace: cert-manager
    # Watch Kustomizations that contain certificates
    - kind: Kustomization
      name: "*"
      namespace: flux-system
  inclusionList:
    - ".*certificate.*"
    - ".*cert-manager.*"
    - ".*tls.*"
```

## Deploying the Full Certificate Stack via Flux CD

Tie everything together with a dependency chain in your Flux CD configuration.

```yaml
# clusters/production/infrastructure.yaml
# Flux Kustomization to deploy cert-manager infrastructure
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
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
---
# Applications depend on cert-manager being ready
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # Ensure cert-manager is healthy before deploying apps with certificates
    - name: cert-manager
```

## Summary

Certificate rotation with Flux CD and cert-manager provides a fully automated, GitOps-driven approach to TLS lifecycle management. The key practices covered include:

- Deploying cert-manager via Flux CD HelmRelease for consistent management
- Configuring multiple ClusterIssuers for different certificate types and environments
- Setting rotation policies with appropriate duration and renewBefore values
- Managing both public TLS and internal mTLS certificates
- Monitoring certificate expiry with Prometheus alerting rules
- Setting up Flux CD notifications for certificate-related reconciliation events
- Orchestrating dependencies so cert-manager is ready before applications deploy

By automating certificate rotation through GitOps, you eliminate the risk of certificate expiry outages while maintaining a complete audit trail of your TLS infrastructure.
