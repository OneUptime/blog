# How to Use HelmRelease for Deploying ArgoCD with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, ArgoCD, Continuous Delivery

Description: Learn how to deploy ArgoCD on Kubernetes using a Flux HelmRelease, enabling a multi-tool GitOps strategy for application delivery.

---

While Flux CD and ArgoCD are both GitOps tools, there are legitimate reasons to run them together. Some organizations use Flux to manage cluster infrastructure and ArgoCD for application delivery, taking advantage of ArgoCD's web UI for developer self-service. This guide shows how to deploy ArgoCD using a Flux HelmRelease, giving your platform team control over the ArgoCD installation while application teams use its interface.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- An understanding of both Flux and ArgoCD GitOps models

## Creating the HelmRepository

ArgoCD publishes its Helm charts through the Argo project repository.

```yaml
# helmrepository-argocd.yaml - ArgoCD Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: argo
  namespace: flux-system
spec:
  interval: 1h
  url: https://argoproj.github.io/argo-helm
```

## Deploying ArgoCD with HelmRelease

The following HelmRelease deploys ArgoCD with its server, repo server, application controller, and optional components configured for production use.

```yaml
# helmrelease-argocd.yaml - ArgoCD deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: argocd
  namespace: argocd
spec:
  interval: 15m
  chart:
    spec:
      chart: argo-cd
      version: "7.x"
      sourceRef:
        kind: HelmRepository
        name: argo
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
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
    # Global settings
    global:
      # Domain for ArgoCD server
      domain: argocd.example.com

    # ArgoCD Server (API and UI)
    server:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi

      # Ingress configuration for the ArgoCD UI
      ingress:
        enabled: true
        ingressClassName: nginx
        annotations:
          cert-manager.io/cluster-issuer: "letsencrypt-production"
          nginx.ingress.kubernetes.io/ssl-passthrough: "true"
          nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
        tls: true

      # Configure ArgoCD to run in insecure mode behind TLS-terminating proxy
      # Uncomment the next line if your ingress handles TLS termination
      # extraArgs:
      #   - --insecure

    # Application Controller
    controller:
      replicas: 1
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
      # Metrics for Prometheus
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true

    # Repo Server (handles Git operations)
    repoServer:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
      metrics:
        enabled: true
        serviceMonitor:
          enabled: true

    # Redis (used for caching)
    redis:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi

    # Application Set Controller
    applicationSet:
      replicas: 1
      resources:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi

    # Notifications Controller
    notifications:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 100m
          memory: 128Mi

    # ArgoCD configuration
    configs:
      # ConfigMap-based configuration
      cm:
        # Allow ArgoCD to manage resources in all namespaces
        application.resourceTrackingMethod: annotation
        # Status badge for repositories
        statusbadge.enabled: "true"
        # OIDC configuration (example for Dex)
        url: "https://argocd.example.com"

      # RBAC configuration
      rbac:
        # Default policy for authenticated users
        policy.default: role:readonly
        policy.csv: |
          p, role:admin, applications, *, */*, allow
          p, role:admin, clusters, *, *, allow
          p, role:admin, repositories, *, *, allow
          g, admin-group, role:admin

      # Repository credentials
      repositories: {}

      # Parameters and secrets
      params:
        # Server-side diff for better performance
        server.enable.gzip: true
        # Number of application operation processors
        controller.operation.processors: "10"
        controller.status.processors: "20"
```

## Accessing ArgoCD

After deployment, retrieve the initial admin password and access the UI.

```bash
# Check HelmRelease status
flux get helmrelease argocd -n argocd

# Get the initial admin password
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath='{.data.password}' | base64 -d

# Port-forward to access the UI locally
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Login via CLI
argocd login localhost:8080 --username admin --password <password> --insecure
```

## Configuring ArgoCD Applications via Git

Once ArgoCD is deployed by Flux, you can create ArgoCD Application resources in your GitOps repository. Flux will apply these, and ArgoCD will then manage the applications.

```yaml
# argocd-application.yaml - Example ArgoCD Application managed by Flux
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-web-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/my-web-app.git
    targetRevision: HEAD
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: apps
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Setting Up SSO with OIDC

For production environments, configure single sign-on through an OIDC provider.

```yaml
# Snippet: OIDC configuration in ArgoCD values
configs:
  cm:
    url: "https://argocd.example.com"
    oidc.config: |
      name: Keycloak
      issuer: https://keycloak.example.com/realms/master
      clientID: argocd
      clientSecret: $oidc.keycloak.clientSecret
      requestedScopes:
        - openid
        - profile
        - email
```

## Verifying the Deployment

```bash
# Verify all ArgoCD components are running
kubectl get pods -n argocd

# Check ArgoCD server health
kubectl get svc -n argocd

# Verify CRDs are installed
kubectl get crds | grep argoproj

# List ArgoCD applications
argocd app list
```

## Summary

Deploying ArgoCD through a Flux HelmRelease from `https://argoproj.github.io/argo-helm` enables a layered GitOps approach where Flux manages infrastructure (including ArgoCD itself) while ArgoCD provides a developer-friendly UI for application delivery. This pattern gives platform teams infrastructure control and application teams a self-service deployment experience, all maintained declaratively in Git.
