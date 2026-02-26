# How to Use the ArgoCD Application Manifest Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Application Management

Description: A comprehensive reference guide to every field in the ArgoCD Application manifest with practical examples, common patterns, and configuration best practices.

---

The ArgoCD Application manifest is the central configuration object that defines how your application is deployed and managed. With dozens of fields across the spec, it can be overwhelming to know what each one does and when to use it. This guide serves as a practical reference for the complete Application manifest, with examples for every major section.

## Application Manifest Structure

At its core, an ArgoCD Application manifest has this structure:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  # Standard Kubernetes metadata
spec:
  # ArgoCD-specific specification
  project: ""
  source: {}          # or sources: []
  destination: {}
  syncPolicy: {}
  ignoreDifferences: []
  info: []
  revisionHistoryLimit: 10
```

Let us examine each section in detail.

## The `metadata` Section

```yaml
metadata:
  name: my-app                  # Required: unique name
  namespace: argocd             # Required: ArgoCD installation namespace
  labels:                       # Optional: for filtering and grouping
    team: platform
    env: production
  annotations:                  # Optional: for tooling and configuration
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deploys
  finalizers:                   # Optional: for cleanup on deletion
    - resources-finalizer.argocd.argoproj.io
```

The `name` must be unique within the namespace. The `namespace` should be the ArgoCD namespace unless you have enabled apps-in-any-namespace.

## The `spec.project` Field

```yaml
spec:
  project: default              # ArgoCD project name
```

Every Application must belong to an ArgoCD Project. The project controls:
- Which repositories the app can pull from
- Which clusters and namespaces it can deploy to
- Which resource kinds it can create
- Role-based access control

Use `default` for quick testing. For production, create dedicated projects with restricted permissions.

## The `spec.source` Section

The source defines where your manifests live and how to process them.

### Git Directory Source

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/manifests.git  # Repository URL
    targetRevision: main                               # Branch, tag, or commit SHA
    path: apps/my-app                                  # Path within the repo
    directory:
      recurse: true                   # Include subdirectories
      include: '*.yaml'               # Only process matching files
      exclude: '{test-*,*.bak}'       # Skip matching files
```

### Helm Source from Git

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      releaseName: my-app            # Helm release name (defaults to app name)
      valueFiles:                    # Values files relative to the chart path
        - values.yaml
        - values-production.yaml
      values: |                      # Inline values (override files)
        replicaCount: 3
        image:
          tag: v1.2.0
      parameters:                    # Individual value overrides
        - name: service.type
          value: LoadBalancer
        - name: ingress.enabled
          value: "true"
          forceString: true          # Treat as string even if it looks like bool
      fileParameters:                # Values from files
        - name: config
          path: files/config.json
      ignoreMissingValueFiles: true  # Do not fail if a values file is missing
      skipCrds: false                # Whether to skip CRD installation
      passCredentials: false         # Pass credentials to all chart domains
```

### Helm Chart Repository Source

```yaml
spec:
  source:
    repoURL: https://charts.bitnami.com/bitnami  # Helm repo URL
    chart: nginx                                    # Chart name
    targetRevision: 15.0.0                          # Chart version
    helm:
      values: |
        service:
          type: ClusterIP
```

### Kustomize Source

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/manifests.git
    targetRevision: main
    path: overlays/production
    kustomize:
      images:                              # Image overrides
        - myregistry.io/app=myregistry.io/app:v2.0
      namePrefix: prod-                    # Prefix all resource names
      nameSuffix: -v2                      # Suffix all resource names
      commonLabels:                        # Add labels to all resources
        env: production
      commonAnnotations:                   # Add annotations to all resources
        team: platform
      forceCommonLabels: true             # Override existing labels
      forceCommonAnnotations: true         # Override existing annotations
      version: v5.0.0                      # Kustomize version to use
      patches:                             # Inline patches
        - target:
            kind: Deployment
          patch: |
            - op: replace
              path: /spec/replicas
              value: 5
```

### Plugin Source

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/manifests.git
    targetRevision: main
    path: apps/my-app
    plugin:
      name: my-plugin                  # Plugin name (registered in ArgoCD)
      env:                             # Environment variables for the plugin
        - name: ENV
          value: production
```

## The `spec.sources` Section (Multi-Source)

For combining multiple sources in a single application:

```yaml
spec:
  sources:
    # Helm chart from a chart repository
    - repoURL: https://charts.bitnami.com/bitnami
      chart: nginx
      targetRevision: 15.0.0
      helm:
        valueFiles:
          - $values/envs/production/values.yaml  # Reference another source
    # Values from a separate Git repo
    - repoURL: https://github.com/myorg/config.git
      targetRevision: main
      ref: values                                  # Reference name for $values
```

Note: When using `sources`, you cannot use `source`. They are mutually exclusive.

## The `spec.destination` Section

```yaml
spec:
  destination:
    server: https://kubernetes.default.svc  # Cluster API server URL
    # OR
    name: production-cluster                 # Cluster name (registered in ArgoCD)

    namespace: my-app                        # Target namespace
```

Use `server` for direct URL references. Use `name` when you have registered clusters with friendly names in ArgoCD.

## The `spec.syncPolicy` Section

This section controls automatic sync behavior:

```yaml
spec:
  syncPolicy:
    automated:                     # Enable auto-sync
      prune: true                  # Delete resources not in Git
      selfHeal: true               # Fix manual changes to match Git
      allowEmpty: false            # Do not sync if source produces empty manifests
    syncOptions:                   # Per-sync options
      - CreateNamespace=true       # Create namespace if missing
      - PrunePropagationPolicy=foreground  # How to delete resources
      - PruneLast=true             # Prune after all other syncs complete
      - Replace=true               # Use replace instead of apply
      - ServerSideApply=true       # Use server-side apply
      - ApplyOutOfSyncOnly=true    # Only apply out-of-sync resources
      - Validate=false             # Skip schema validation
      - FailOnSharedResource=true  # Fail if resource managed by another app
      - RespectIgnoreDifferences=true  # Use ignoreDifferences during sync
    retry:                         # Retry failed syncs
      limit: 5                     # Max retry attempts (-1 for unlimited)
      backoff:
        duration: 5s               # Initial backoff duration
        factor: 2                  # Multiplication factor for each retry
        maxDuration: 3m            # Maximum backoff duration
    managedNamespaceMetadata:      # Metadata for auto-created namespace
      labels:
        env: production
      annotations:
        team: platform
```

## The `spec.ignoreDifferences` Section

Configure which fields to ignore when comparing live vs desired state:

```yaml
spec:
  ignoreDifferences:
    # Ignore specific JSON paths
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas           # Ignore replica count (managed by HPA)

    # Ignore using jq expressions (more powerful)
    - group: ""
      kind: Service
      jqPathExpressions:
        - .spec.clusterIP          # Ignore auto-assigned cluster IP

    # Ignore for a specific named resource
    - group: apps
      kind: Deployment
      name: web                    # Only for the Deployment named "web"
      jsonPointers:
        - /metadata/annotations/kubectl.kubernetes.io~1last-applied-configuration

    # Ignore for resources in a specific namespace
    - group: ""
      kind: ConfigMap
      namespace: kube-system
      jsonPointers:
        - /data
```

## The `spec.info` Section

Add arbitrary metadata visible in the UI:

```yaml
spec:
  info:
    - name: "Documentation"
      value: "https://wiki.example.com/my-app"
    - name: "Owner"
      value: "platform-team@example.com"
    - name: "Slack"
      value: "#platform-support"
```

These key-value pairs appear in the application details panel in the ArgoCD UI.

## The `spec.revisionHistoryLimit` Field

```yaml
spec:
  revisionHistoryLimit: 10     # Number of sync history entries to retain
```

Controls how many sync operations are kept in the application's history. Default is 10. Set higher for compliance needs, lower to reduce etcd storage.

## Complete Example

Here is a production-ready Application manifest combining the most commonly used fields:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prod-user-service
  namespace: argocd
  labels:
    team: identity
    env: production
    tier: backend
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: identity-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: identity-alerts
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: identity-team
  source:
    repoURL: https://github.com/myorg/services.git
    targetRevision: main
    path: services/user-service/overlays/production
    kustomize:
      images:
        - myregistry.io/user-service:v3.1.0
  destination:
    server: https://kubernetes.default.svc
    namespace: identity
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=foreground
      - ServerSideApply=true
    retry:
      limit: 3
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 5m
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
  info:
    - name: "Runbook"
      value: "https://wiki.example.com/runbooks/user-service"
  revisionHistoryLimit: 15
```

## Common Patterns

1. **Helm + external values** - Use multi-source with one source for the chart and another for values
2. **Kustomize with image overrides** - Use the `kustomize.images` field to update image tags without modifying the overlay
3. **HPA-managed replicas** - Always add `/spec/replicas` to `ignoreDifferences` when using HPA
4. **Safe pruning** - Use `PruneLast=true` to ensure pruning happens after all other resources are synced

This reference covers the fields you will use most often. The ArgoCD project documentation contains additional fields for edge cases, but the fields covered here handle the vast majority of production use cases. Bookmark this page and refer back to it when constructing new Application manifests.
