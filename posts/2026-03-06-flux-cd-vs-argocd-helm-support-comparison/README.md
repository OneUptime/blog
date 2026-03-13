# Flux CD vs ArgoCD: Helm Support Comparison

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Helm, GitOps, Kubernetes, Comparison, Helm Charts, Deployments

Description: A detailed comparison of Helm chart support in Flux CD and ArgoCD, covering chart management, values handling, lifecycle hooks, and deployment strategies.

---

## Introduction

Helm is the most popular package manager for Kubernetes, and both Flux CD and ArgoCD provide first-class support for deploying Helm charts. However, their approaches differ significantly in architecture, configuration, and flexibility. This guide compares how each tool handles Helm chart deployments to help you choose the right GitOps solution for your Helm-based workflows.

## Architecture Overview

Flux CD and ArgoCD take fundamentally different approaches to Helm integration. Understanding these architectural differences is key to making the right choice.

### Flux CD Helm Architecture

Flux CD uses a dedicated **Helm Controller** that operates as a separate component in the Flux system. It introduces two custom resources: `HelmRepository` (or `HelmChart` sources) and `HelmRelease`. The Helm Controller uses the Helm SDK internally, meaning it performs native Helm operations including proper lifecycle management.

### ArgoCD Helm Architecture

ArgoCD treats Helm charts as one of several manifest generation tools. It renders Helm templates into plain Kubernetes manifests and then applies them using its standard sync mechanism. This means ArgoCD does not use `helm install` or `helm upgrade` under the hood -- it uses `helm template` and then applies the output with `kubectl`.

## Feature Comparison Table

| Feature | Flux CD | ArgoCD |
|---|---|---|
| Helm SDK Integration | Native (helm install/upgrade) | Template-only (helm template) |
| HelmRelease CRD | Yes | No (uses Application CRD) |
| Chart Sources | HelmRepository, GitRepository, S3, OCI | Helm repos, Git repos, OCI |
| Values Files | Multiple files, inline values | Multiple files, inline values |
| Values From Secrets/ConfigMaps | Yes (native support) | Limited (via plugins) |
| Helm Hooks | Full support | Partial (PreSync/PostSync annotations) |
| Helm Tests | Supported via HelmRelease | Not natively supported |
| Rollback Support | Automatic rollback on failure | Manual rollback via UI/CLI |
| Dependency Management | chart dependencies resolved | chart dependencies resolved |
| OCI Registry Support | Yes | Yes |
| Drift Detection | Via Helm release state | Via manifest comparison |
| Post-Renderers | Supported (Kustomize overlays) | Not supported |
| CRD Installation Policy | Configurable (Create, CreateReplace) | Automatic |

## Chart Source Configuration

### Flux CD: HelmRepository and HelmRelease

Flux CD separates the chart source definition from the release configuration, providing clean separation of concerns.

```yaml
# Define the Helm repository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  # The Helm repository URL
  url: https://charts.bitnami.com/bitnami
  # How often to fetch the repository index
  interval: 30m
  # Optional: timeout for fetching the index
  timeout: 1m
---
# Define the Helm release
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  # Reconciliation interval
  interval: 5m
  chart:
    spec:
      # Chart name from the repository
      chart: nginx
      # Semver version constraint
      version: ">=15.0.0 <16.0.0"
      # Reference to the HelmRepository
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      # How often to check for new chart versions
      interval: 10m
  # Inline values for the chart
  values:
    replicaCount: 3
    service:
      type: ClusterIP
      port: 80
    resources:
      limits:
        cpu: 200m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
```

### ArgoCD: Application with Helm Source

ArgoCD configures Helm charts within the Application resource, combining source and release configuration in one place.

```yaml
# ArgoCD Application for a Helm chart
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx
  namespace: argocd
spec:
  project: default
  source:
    # Helm repository URL specified directly
    repoURL: https://charts.bitnami.com/bitnami
    # Chart name
    chart: nginx
    # Exact version to deploy
    targetRevision: 15.3.5
    helm:
      # Inline values
      values: |
        replicaCount: 3
        service:
          type: ClusterIP
          port: 80
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Values Management

### Flux CD: Advanced Values Handling

Flux CD offers powerful values management including referencing values from Kubernetes secrets and ConfigMaps.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
        namespace: flux-system
  # Multiple values sources are merged in order
  valuesFrom:
    # Load values from a ConfigMap
    - kind: ConfigMap
      name: my-app-base-values
      # Optional: specify the key in the ConfigMap
      valuesKey: values.yaml
    # Load sensitive values from a Secret
    - kind: Secret
      name: my-app-secret-values
      valuesKey: secrets.yaml
      # Optional: target a specific path in the values
      targetPath: database.credentials
  # Inline values take highest priority
  values:
    image:
      tag: "v2.1.0"
    ingress:
      enabled: true
      hostname: my-app.example.com
```

### ArgoCD: Values Files and Parameters

ArgoCD supports values files from the same repository and inline parameters.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      # Reference values files relative to the chart path
      valueFiles:
        - values.yaml
        - values-production.yaml
      # Override specific parameters
      parameters:
        - name: image.tag
          value: "v2.1.0"
        - name: ingress.enabled
          value: "true"
      # Inline values (merged with valueFiles)
      values: |
        ingress:
          hostname: my-app.example.com
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

## Helm Lifecycle Hooks

One of the most significant differences is how each tool handles Helm hooks.

### Flux CD Hook Support

Since Flux CD uses the Helm SDK natively, all Helm hooks work as expected:

```yaml
# A Helm hook for database migration (works in Flux CD)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    # Standard Helm hooks are fully supported
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: my-app:v2.1.0
          command: ["./migrate.sh"]
      restartPolicy: Never
  backoffLimit: 3
```

### ArgoCD Hook Support

ArgoCD maps Helm hooks to its own sync wave system. Some hooks translate directly, while others require adaptation:

```yaml
# ArgoCD uses its own annotation system for hooks
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    # ArgoCD-specific hook annotations
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    # Sync wave controls ordering
    argocd.argoproj.io/sync-wave: "-5"
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: my-app:v2.1.0
          command: ["./migrate.sh"]
      restartPolicy: Never
  backoffLimit: 3
```

## Rollback and Remediation

### Flux CD: Automatic Remediation

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
  # Install remediation settings
  install:
    # Number of retries on install failure
    remediation:
      retries: 3
  # Upgrade remediation settings
  upgrade:
    # Number of retries on upgrade failure
    remediation:
      retries: 3
      # Automatically rollback on failure
      remediateLastFailure: true
    # Clean up failed resources before retrying
    cleanupOnFail: true
  # Rollback configuration
  rollback:
    # Keep the rollback history
    cleanupOnFail: true
    # Recreate resources if needed
    recreate: false
    # Use force for resource updates
    force: false
  # Uninstall configuration
  uninstall:
    keepHistory: false
    timeout: 5m
```

### ArgoCD: Manual Rollback

ArgoCD provides rollback through its UI, CLI, or by reverting the Git commit:

```bash
# Rollback using ArgoCD CLI to a previous revision
argocd app rollback my-app 2

# View application history
argocd app history my-app

# Sync to a specific revision from Git
argocd app sync my-app --revision abc123
```

## OCI Registry Support

Both tools support OCI-based Helm registries, but the configuration differs.

### Flux CD OCI Configuration

```yaml
# OCI HelmRepository source
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: oci-charts
  namespace: flux-system
spec:
  # OCI registry type
  type: oci
  # OCI registry URL
  url: oci://ghcr.io/my-org/charts
  interval: 10m
  # Authentication via Kubernetes secret
  secretRef:
    name: oci-registry-creds
---
# HelmRelease using OCI source
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: oci-charts
        namespace: flux-system
```

### ArgoCD OCI Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  source:
    # OCI registry URL for ArgoCD
    repoURL: ghcr.io/my-org/charts
    chart: my-app
    targetRevision: 1.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

## Post-Rendering with Kustomize (Flux CD Exclusive)

Flux CD supports post-rendering Helm output with Kustomize, which is a powerful feature not available in ArgoCD.

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
  values:
    replicaCount: 3
  # Post-renderers apply transformations after Helm template rendering
  postRenderers:
    - kustomize:
        # Add common labels to all resources
        patches:
          - target:
              kind: Deployment
            patch: |
              - op: add
                path: /metadata/labels/team
                value: platform
          - target:
              kind: Service
            patch: |
              - op: add
                path: /metadata/labels/team
                value: platform
```

## When to Choose Which

### Choose Flux CD for Helm If

- You need full Helm lifecycle hook support
- You require automatic rollback on upgrade failure
- You want to inject values from Kubernetes Secrets and ConfigMaps
- You need post-rendering with Kustomize overlays
- You prefer a declarative, CRD-based approach for all Helm configuration
- You run Helm tests as part of your deployment pipeline

### Choose ArgoCD for Helm If

- You want a visual UI for managing Helm releases
- You prefer a single Application CRD for all deployment types
- Your team is comfortable with template-only rendering
- You do not rely heavily on Helm hooks
- You want an integrated dashboard showing all Helm release statuses
- You need multi-cluster Helm deployments with a centralized control plane

## Conclusion

Both Flux CD and ArgoCD are capable GitOps tools for managing Helm deployments. Flux CD offers deeper Helm integration with native SDK usage, automatic rollback, and advanced features like post-rendering and values from secrets. ArgoCD provides a more unified approach with its visual dashboard and simpler configuration model. Your choice should depend on how heavily you rely on Helm-specific features versus preferring a generalized GitOps platform with a strong UI.
