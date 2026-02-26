# Understanding ArgoCD application.yaml: Every Field Explained

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, YAML, Configuration

Description: A comprehensive reference guide to every field in the ArgoCD Application YAML specification, with explanations, default values, and practical examples for each setting.

---

The ArgoCD Application resource is the central building block of your GitOps workflow. It tells ArgoCD what to deploy, where to deploy it, and how to manage the sync lifecycle. While simple applications only need a few fields, the full Application spec has dozens of options that control everything from sync behavior to health checks and retry logic. This guide walks through every field in the Application YAML.

## The Complete Application Structure

Here is the full structure of an ArgoCD Application with every field populated:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-application
  namespace: argocd
  labels:
    app.kubernetes.io/name: my-application
    app.kubernetes.io/part-of: platform
    environment: production
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: my-channel
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: HEAD
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

Let us break down every section and field.

## metadata Section

### metadata.name

The name of the Application resource. Must be unique within the ArgoCD namespace. This is what appears in the ArgoCD UI and CLI.

```yaml
metadata:
  name: frontend-production
```

### metadata.namespace

Must be the namespace where ArgoCD is installed, typically `argocd`. Applications created in other namespaces are not detected by default unless you configure ArgoCD to watch additional namespaces.

### metadata.labels

Standard Kubernetes labels. ArgoCD uses these for filtering in the UI and CLI. Common patterns:

```yaml
labels:
  team: frontend
  environment: production
  tier: web
```

### metadata.annotations

Used for ArgoCD notifications and custom metadata:

```yaml
annotations:
  # Notification subscriptions
  notifications.argoproj.io/subscribe.on-sync-succeeded.slack: "#deploys"
  notifications.argoproj.io/subscribe.on-health-degraded.slack: "#alerts"
  # Custom annotations
  argocd.argoproj.io/managed-by: platform-team
```

### metadata.finalizers

Controls what happens when the Application is deleted:

```yaml
finalizers:
  # Delete deployed resources when the Application is deleted
  - resources-finalizer.argocd.argoproj.io
```

Without this finalizer, deleting the Application leaves the deployed resources running in the cluster. With it, ArgoCD performs a cascade delete of all managed resources.

There is also a background deletion variant:

```yaml
finalizers:
  - resources-finalizer.argocd.argoproj.io/background
```

## spec.project

The AppProject this application belongs to. Controls which repos, clusters, and resources the application can access.

```yaml
spec:
  project: my-team
```

Use `default` for the built-in project with no restrictions. For production, always use a dedicated project with proper access controls.

## spec.source - Single Source

### repoURL

The Git repository URL or Helm chart repository URL:

```yaml
source:
  repoURL: https://github.com/org/repo.git          # Git repo
  # or
  repoURL: https://charts.helm.sh/stable             # Helm chart repo
  # or
  repoURL: oci://registry.example.com/charts          # OCI Helm repo
```

### targetRevision

The Git branch, tag, commit SHA, or Helm chart version:

```yaml
source:
  targetRevision: HEAD          # Latest commit on default branch
  targetRevision: main          # Specific branch
  targetRevision: v1.2.3        # Git tag
  targetRevision: abc1234       # Specific commit
  targetRevision: "1.2.3"       # Helm chart version
```

### path

The directory within the Git repository containing the manifests:

```yaml
source:
  path: k8s/overlays/production    # Kustomize overlay
  path: helm/my-chart              # Helm chart in repo
  path: manifests                  # Plain YAML manifests
```

Not used when deploying a Helm chart from a chart repository (use `chart` instead).

### chart

Used instead of `path` when deploying from a Helm chart repository:

```yaml
source:
  repoURL: https://charts.helm.sh/stable
  chart: nginx-ingress
  targetRevision: "4.0.0"
```

### helm

Helm-specific configuration:

```yaml
source:
  helm:
    # Override values inline
    values: |
      replicaCount: 3
      image:
        tag: v1.2.3

    # Override individual parameters
    parameters:
      - name: service.type
        value: LoadBalancer
      - name: image.tag
        value: v1.2.3
        forceString: true    # Treat as string even if it looks numeric

    # Values from files in the repo
    valueFiles:
      - values.yaml
      - values-production.yaml

    # Values from external ConfigMaps/Secrets
    valuesObject:
      replicaCount: 3

    # Release name (defaults to app name)
    releaseName: my-release

    # Skip CRD installation
    skipCrds: false

    # Pass credentials to Helm repos
    passCredentials: false

    # File parameters (contents of files as values)
    fileParameters:
      - name: config
        path: files/config.json

    # Helm version (v2 or v3, defaults to v3)
    version: v3

    # Ignore missing value files instead of erroring
    ignoreMissingValueFiles: false
```

### kustomize

Kustomize-specific configuration:

```yaml
source:
  kustomize:
    # Override image tags
    images:
      - myrepo/myimage:v1.2.3
      - myrepo/other=myrepo/other:v2.0

    # Add name prefix/suffix to all resources
    namePrefix: prod-
    nameSuffix: -v2

    # Set common labels
    commonLabels:
      environment: production

    # Set common annotations
    commonAnnotations:
      managed-by: argocd

    # Kustomize version
    version: v5.0.0

    # Force common labels
    forceCommonLabels: false
    forceCommonAnnotations: false
```

### directory

Configuration for plain YAML manifests:

```yaml
source:
  directory:
    # Recursive directory search
    recurse: true

    # File include/exclude patterns
    include: "*.yaml"
    exclude: "test-*"

    # Jsonnet configuration
    jsonnet:
      tlas:
        - name: env
          value: production
      extVars:
        - name: cluster
          value: us-east-1
      libs:
        - vendor/
```

### plugin

Use a config management plugin:

```yaml
source:
  plugin:
    name: my-plugin
    env:
      - name: ENV_VAR
        value: "some-value"
    parameters:
      - name: param1
        string: value1
      - name: param2
        array: ["a", "b", "c"]
      - name: param3
        map:
          key1: val1
          key2: val2
```

## spec.sources - Multiple Sources

For applications that combine manifests from multiple repositories:

```yaml
spec:
  sources:
    - repoURL: https://github.com/org/manifests.git
      targetRevision: HEAD
      path: base
    - repoURL: https://charts.helm.sh/stable
      chart: redis
      targetRevision: "17.0.0"
      helm:
        values: |
          replica:
            replicaCount: 3
```

When using `sources` (plural), you cannot use `source` (singular).

## spec.destination

### server

The Kubernetes API server URL:

```yaml
destination:
  server: https://kubernetes.default.svc    # In-cluster
  server: https://remote-cluster.example.com  # Remote cluster
```

### name

Alternative to `server` - use the cluster name as registered in ArgoCD:

```yaml
destination:
  name: production-cluster
```

You can use either `server` or `name`, not both.

### namespace

The target namespace for deployment:

```yaml
destination:
  namespace: my-app-production
```

## spec.syncPolicy

### automated

Enable automatic sync:

```yaml
syncPolicy:
  automated:
    prune: true       # Delete resources removed from Git
    selfHeal: true    # Revert manual changes to match Git
    allowEmpty: false  # Prevent sync if Git returns zero resources
```

### syncOptions

Fine-tune sync behavior:

```yaml
syncPolicy:
  syncOptions:
    - CreateNamespace=true              # Create namespace if missing
    - PrunePropagationPolicy=foreground # Delete order (foreground/background/orphan)
    - PruneLast=true                    # Prune after other resources sync
    - ApplyOutOfSyncOnly=true           # Only sync changed resources
    - Validate=false                    # Skip kubectl validation
    - SkipDryRunOnMissingResource=true  # Skip dry run for missing CRDs
    - RespectIgnoreDifferences=true     # Apply ignoreDifferences during sync
    - ServerSideApply=true              # Use server-side apply
    - Replace=true                      # Use kubectl replace instead of apply
    - FailOnSharedResource=true         # Fail if resource is managed by another app
```

### retry

Configure sync retry behavior:

```yaml
syncPolicy:
  retry:
    limit: 5           # Max retry attempts (0 = no retry, -1 = unlimited)
    backoff:
      duration: 5s     # Initial retry delay
      factor: 2        # Multiplier for each retry
      maxDuration: 3m  # Maximum delay between retries
```

## spec.ignoreDifferences

Ignore specific differences during diff and sync:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas          # Ignore HPA-managed replicas
    - group: ""
      kind: Service
      jqPathExpressions:
        - .spec.clusterIP         # Ignore auto-assigned cluster IP
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jsonPointers:
        - /webhooks/0/clientConfig/caBundle
    - kind: ConfigMap
      name: my-configmap
      jsonPointers:
        - /data/generated-field
```

## spec.info

Metadata displayed in the ArgoCD UI:

```yaml
spec:
  info:
    - name: Owner
      value: platform-team
    - name: Slack
      value: "#platform-deploys"
    - name: Documentation
      value: https://wiki.example.com/my-app
```

## spec.revisionHistoryLimit

How many sync revisions to keep in history:

```yaml
spec:
  revisionHistoryLimit: 10    # Default is 10
```

## Summary

The ArgoCD Application YAML is deceptively deep. While most applications only need the basics - source, destination, and sync policy - understanding every field gives you the power to handle complex deployment scenarios. Keep this reference handy as you build out your GitOps workflows, and remember that the ArgoCD documentation evolves with each release, so always check for new fields in the version you are running.
