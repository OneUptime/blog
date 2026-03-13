# How to Use HelmRelease for Deploying cert-manager with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Cert-Manager, TLS, Certificates

Description: Learn how to deploy cert-manager on Kubernetes using a Flux HelmRelease for automated TLS certificate management with Let's Encrypt.

---

cert-manager is the standard solution for automating TLS certificate management in Kubernetes. It integrates with certificate authorities like Let's Encrypt to issue, renew, and manage certificates for your applications. Deploying cert-manager through Flux CD ensures that your certificate infrastructure is version-controlled and consistently deployed across clusters.

## Prerequisites

- A Kubernetes cluster with Flux CD installed and configured
- A GitOps repository connected to Flux
- DNS configured for your domain (required for Let's Encrypt validation)

## Creating the HelmRepository

cert-manager is distributed through the Jetstack Helm chart repository. Define the HelmRepository source for Flux.

```yaml
# helmrepository-jetstack.yaml - Jetstack Helm repository for cert-manager charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
```

## Deploying cert-manager with HelmRelease

cert-manager requires Custom Resource Definitions (CRDs) to be installed. The Helm chart can install CRDs automatically when you set `crds.enabled` and `crds.keep` in the values. Here is the full HelmRelease configuration.

```yaml
# helmrelease-cert-manager.yaml - Complete cert-manager deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 15m
  chart:
    spec:
      chart: cert-manager
      version: "v1.16.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
      interval: 15m
  install:
    # Create the cert-manager namespace if it does not exist
    createNamespace: true
    # Use atomic to roll back on any installation failure
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Install CRDs as part of the Helm release
    crds:
      enabled: true
      # Keep CRDs when the Helm release is uninstalled
      keep: true

    # Number of cert-manager controller replicas
    replicaCount: 2

    # Resource requests and limits for the controller
    resources:
      requests:
        cpu: 50m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi

    # Webhook configuration
    webhook:
      replicaCount: 2
      resources:
        requests:
          cpu: 25m
          memory: 64Mi
        limits:
          cpu: 100m
          memory: 128Mi

    # CA injector configuration
    cainjector:
      replicaCount: 2
      resources:
        requests:
          cpu: 25m
          memory: 128Mi
        limits:
          cpu: 100m
          memory: 256Mi

    # Enable Prometheus metrics
    prometheus:
      enabled: true
      servicemonitor:
        enabled: true
        namespace: cert-manager

    # Pod disruption budgets for high availability
    podDisruptionBudget:
      enabled: true
      minAvailable: 1

    # Global log level (1-5, higher is more verbose)
    global:
      logLevel: 2
```

## Configuring a ClusterIssuer for Let's Encrypt

After cert-manager is deployed, you need a ClusterIssuer to define how certificates are obtained. This is a separate Kubernetes resource, not part of the Helm chart values, but it should be stored in your GitOps repository alongside the HelmRelease.

```yaml
# clusterissuer-letsencrypt.yaml - Let's Encrypt ClusterIssuer for production certificates
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-production
spec:
  acme:
    # Let's Encrypt production ACME server
    server: https://acme-v02.api.letsencrypt.org/directory
    # Email for certificate expiry notifications
    email: admin@example.com
    # Secret to store the ACME account private key
    privateKeySecretRef:
      name: letsencrypt-production-key
    # HTTP-01 challenge solver using ingress
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

For testing, use the Let's Encrypt staging server to avoid rate limits:

```yaml
# clusterissuer-letsencrypt-staging.yaml - Staging issuer for testing
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-staging
spec:
  acme:
    server: https://acme-staging-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-staging-key
    solvers:
      - http01:
          ingress:
            ingressClassName: nginx
```

## Requesting a Certificate

Once the ClusterIssuer is in place, you can request certificates either by annotating your Ingress resources or by creating Certificate resources directly.

Using Ingress annotations:

```yaml
# ingress-with-tls.yaml - Ingress with automatic TLS certificate from cert-manager
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: apps
  annotations:
    # Tell cert-manager which issuer to use
    cert-manager.io/cluster-issuer: "letsencrypt-production"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - app.example.com
      secretName: app-example-com-tls
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

## Verifying the Deployment

After Flux reconciles the HelmRelease, verify that cert-manager is running and healthy.

```bash
# Check the HelmRelease status
flux get helmrelease cert-manager -n cert-manager

# Verify all cert-manager pods are running
kubectl get pods -n cert-manager

# Check that CRDs are installed
kubectl get crds | grep cert-manager

# Verify the ClusterIssuer is ready
kubectl get clusterissuer letsencrypt-production -o wide

# Check certificate status
kubectl get certificates --all-namespaces
```

## Troubleshooting

If certificates are not being issued, check the cert-manager logs and certificate request status.

```bash
# Check cert-manager controller logs
kubectl logs -n cert-manager deploy/cert-manager --tail=50

# Check certificate request status
kubectl get certificaterequests --all-namespaces

# Describe a specific certificate for detailed status
kubectl describe certificate app-example-com-tls -n apps

# Check ACME challenges
kubectl get challenges --all-namespaces
```

## Summary

Deploying cert-manager through a Flux HelmRelease provides a GitOps-native approach to TLS certificate management. The Jetstack Helm chart at `https://charts.jetstack.io` handles the complex installation of cert-manager components and CRDs, while Flux ensures the deployment stays in sync with your desired state. Combined with ClusterIssuers and Ingress annotations, this setup automates the entire certificate lifecycle from issuance to renewal.
