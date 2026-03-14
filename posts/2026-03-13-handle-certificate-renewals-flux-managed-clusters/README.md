# How to Handle Certificate Renewals in Flux Managed Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Day 2 Operations, TLS, cert-manager, Certificates

Description: Automate and manage certificate renewals in Flux CD managed clusters using cert-manager deployed via GitOps so TLS certificates never expire unexpectedly.

---

## Introduction

Certificate expiration is one of the most preventable causes of production outages. A cluster with hundreds of services may have hundreds of TLS certificates, each with its own renewal schedule. Without automation, certificate management becomes a full-time job — and a single missed renewal can take down a critical service.

Flux CD paired with cert-manager creates a completely automated certificate lifecycle. cert-manager is deployed and configured through Flux, which means the certificate issuers, certificate requests, and renewal policies are all version-controlled. cert-manager handles the actual renewal automatically, and Flux ensures cert-manager itself is always running in its desired state.

This guide covers deploying cert-manager via Flux, configuring ClusterIssuers for Let's Encrypt and internal CAs, managing certificate objects as Flux-reconciled resources, and operating through certificate renewal events.

## Prerequisites

- Flux CD v2 bootstrapped in your cluster
- A domain name with DNS controllable by your cluster (for Let's Encrypt DNS challenges)
- kubectl and Flux CLI installed
- cert-manager v1.14+

## Step 1: Deploy cert-manager via Flux

```yaml
# infrastructure/sources/cert-manager.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
```

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 10m
  chart:
    spec:
      chart: cert-manager
      version: "v1.14.x"
      sourceRef:
        kind: HelmRepository
        name: cert-manager
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Install CRDs as part of the Helm chart
    installCRDs: true
    # Enable Prometheus metrics
    prometheus:
      enabled: true
      servicemonitor:
        enabled: true
    # Configure resources for production
    resources:
      requests:
        cpu: 10m
        memory: 32Mi
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
```

## Step 2: Configure ClusterIssuers

```yaml
# infrastructure/cert-manager/cluster-issuers.yaml
---
# Let's Encrypt production issuer (rate limited — use staging for testing)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: platform@acme.com
    privateKeySecretRef:
      name: letsencrypt-production-account-key
    solvers:
      # DNS01 challenge via Route53 (works for wildcard certs and private clusters)
      - dns01:
          route53:
            region: us-east-1
            accessKeyIDSecretRef:
              name: route53-credentials
              key: access-key-id
            secretAccessKeySecretRef:
              name: route53-credentials
              key: secret-access-key
---
# Internal CA issuer for service mesh and internal services
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: internal-ca
spec:
  ca:
    secretName: internal-ca-keypair   # Secret containing the internal CA cert and key
```

```yaml
# infrastructure/cert-manager/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  dependsOn:
    - name: cert-manager-controller   # Wait for cert-manager to be running
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 3: Request Certificates as Git-Managed Resources

Define Certificate objects in your application manifests — cert-manager will handle the actual issuance and renewal.

```yaml
# deploy/certificates.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-service-tls
  namespace: team-alpha
spec:
  # The TLS secret that will be created/updated by cert-manager
  secretName: my-service-tls

  # Certificate validity — cert-manager renews at 2/3 of duration
  duration: 2160h     # 90 days
  renewBefore: 720h   # Renew 30 days before expiry

  dnsNames:
    - my-service.acme.example.com
    - api.acme.example.com

  issuerRef:
    name: letsencrypt-production
    kind: ClusterIssuer
    group: cert-manager.io
```

Reference the certificate in your Ingress:

```yaml
# deploy/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-service
  namespace: team-alpha
  annotations:
    # Tell cert-manager which issuer to use for auto-provisioned certs
    cert-manager.io/cluster-issuer: letsencrypt-production
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-service.acme.example.com
      secretName: my-service-tls   # cert-manager creates and renews this
  rules:
    - host: my-service.acme.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-service
                port:
                  number: 8080
```

## Step 4: Monitor Certificate Expiry

Set up Prometheus alerts for certificates approaching expiry.

```yaml
# infrastructure/monitoring/alerts/certificate-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: certificate-expiry-alerts
  namespace: monitoring
spec:
  groups:
    - name: cert-manager.certificates
      rules:
        - alert: CertificateExpiringIn30Days
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 30 * 24 * 3600
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ $labels.name }} in {{ $labels.namespace }} expires in {{ $value | humanizeDuration }}"
            description: "cert-manager should auto-renew this certificate. Check if cert-manager is running and the ACME challenge is succeeding."

        - alert: CertificateExpiringIn7Days
          expr: |
            certmanager_certificate_expiration_timestamp_seconds - time() < 7 * 24 * 3600
          for: 1h
          labels:
            severity: critical
          annotations:
            summary: "CRITICAL: Certificate {{ $labels.name }} expires in {{ $value | humanizeDuration }}"

        - alert: CertificateRenewalFailed
          expr: |
            certmanager_certificate_ready_status{condition="False"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Certificate {{ $labels.name }} renewal failed"
```

## Step 5: Check and Manually Trigger Certificate Renewal

```bash
# List all certificates and their expiry dates
kubectl get certificates --all-namespaces \
  -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRY:.status.notAfter"

# Check a specific certificate's status
kubectl describe certificate my-service-tls -n team-alpha

# Force certificate renewal (delete the cert — cert-manager will re-issue)
kubectl delete secret my-service-tls -n team-alpha
# cert-manager detects the secret is missing and issues a new certificate

# Or trigger renewal directly via cmctl
cmctl renew my-service-tls -n team-alpha

# Watch the renewal process
kubectl get certificaterequests -n team-alpha -w
```

## Step 6: Handle cert-manager Upgrade via Flux

```yaml
# To upgrade cert-manager, update the version in the HelmRelease
# infrastructure/controllers/cert-manager/helmrelease.yaml
spec:
  chart:
    spec:
      version: "v1.15.x"   # Updated version
```

```bash
# Commit the version change
git add infrastructure/controllers/cert-manager/helmrelease.yaml
git commit -m "chore: upgrade cert-manager to v1.15.x"
git push

# Flux will detect the change and upgrade cert-manager
flux reconcile helmrelease cert-manager -n cert-manager --with-source

# Monitor the upgrade
flux get helmrelease cert-manager -n cert-manager --watch
```

## Best Practices

- Set `renewBefore: 720h` (30 days) for 90-day Let's Encrypt certificates to give ample time for retry attempts
- Use DNS01 challenges instead of HTTP01 for wildcard certificates and private clusters
- Store ACME account keys and CA private keys in an external secrets manager, synced via External Secrets Operator
- Monitor the cert-manager controller logs regularly for ACME challenge failures
- Keep a backup of your ACME account key — losing it means you cannot renew certificates with the same account
- Test the full certificate issuance pipeline in staging with Let's Encrypt staging before using production

## Conclusion

Certificate management in Flux CD managed clusters becomes fully automated when cert-manager is deployed and configured through GitOps. Certificate objects are declared in Git, cert-manager handles issuance and renewal automatically, and Flux ensures cert-manager itself is always running in its desired state. Prometheus alerts catch the rare cases where auto-renewal fails, giving you days or weeks to intervene before an expiry becomes an outage.
