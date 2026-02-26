# How to Define an ArgoCD Application Spec from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Configuration, Reference

Description: A comprehensive reference for every field in the ArgoCD Application spec, explaining what each option does and when to use it with real-world examples.

---

Building an ArgoCD Application spec from scratch can be overwhelming. The Application CRD has dozens of fields, and the documentation scatters information across multiple pages. This guide is a single reference that explains every important field in the Application spec, what it does, and when you need it. Use this as your go-to resource when writing Application manifests.

## The Application Spec Structure

An ArgoCD Application spec has four main sections:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  # Identity and organization
spec:
  project: ""       # Which project this belongs to
  source: {}         # Where to get manifests
  destination: {}    # Where to deploy
  syncPolicy: {}     # How to keep in sync
  ignoreDifferences: []  # What differences to ignore
```

Let us break down each section in detail.

## Metadata Section

```yaml
metadata:
  # Required: unique name within the ArgoCD namespace
  name: my-application

  # Required: must be the ArgoCD installation namespace
  namespace: argocd

  # Optional: labels for filtering and selection
  labels:
    team: platform
    env: production
    tier: backend

  # Optional: annotations for integrations
  annotations:
    # Notification subscriptions
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deploys
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: critical

  # Optional: controls cascade deletion behavior
  finalizers:
    # Include this to delete managed resources when Application is deleted
    - resources-finalizer.argocd.argoproj.io
    # Omit to keep resources in cluster when Application is deleted (orphan)
```

### About Finalizers

The finalizer is critical for controlling deletion behavior:

- **With finalizer**: Deleting the Application also deletes all resources it manages from the cluster (cascade delete)
- **Without finalizer**: Deleting the Application leaves all resources running in the cluster (orphan)

Choose based on your use case. For production applications, you might want to omit the finalizer as a safety measure to prevent accidental deletion of running workloads.

## Project Field

```yaml
spec:
  # The ArgoCD project this application belongs to
  project: default
```

Projects define what repositories, clusters, and namespaces an application can use. The `default` project allows everything. Production environments should use custom projects with restrictions:

```bash
# List available projects
argocd proj list

# Create a project
argocd proj create my-team \
  --src https://github.com/myorg/* \
  --dest https://kubernetes.default.svc,my-namespace
```

## Source Section

The source section defines where ArgoCD gets the manifests.

### Plain Manifests (Directory)

```yaml
spec:
  source:
    # Git repository URL
    repoURL: https://github.com/myorg/myrepo.git

    # Directory containing YAML/JSON manifests
    path: deploy/manifests

    # Git branch, tag, or commit SHA
    targetRevision: main

    # Directory-specific options
    directory:
      # Recurse into subdirectories
      recurse: true

      # Include specific files only
      include: "*.yaml"

      # Exclude files matching pattern
      exclude: "test-*"

      # Process YAML as Jsonnet
      jsonnet:
        tlas:
          - name: env
            value: production
```

### Helm Chart from Chart Repository

```yaml
spec:
  source:
    # Helm chart repository URL
    repoURL: https://charts.bitnami.com/bitnami

    # Chart name (instead of path)
    chart: nginx

    # Chart version
    targetRevision: 15.0.0

    helm:
      # Override release name (default: application name)
      releaseName: my-nginx

      # Inline values (same as values.yaml content)
      values: |
        replicaCount: 3
        service:
          type: LoadBalancer
        resources:
          limits:
            cpu: 200m
            memory: 256Mi

      # Individual parameter overrides (override values above)
      parameters:
        - name: image.tag
          value: "1.25"
        - name: service.port
          value: "8080"
          # Force string type for values that look like numbers
          forceString: true

      # Skip CRD installation
      skipCrds: false

      # Pass credentials to Helm repos
      passCredentials: false
```

### Helm Chart from Git Repository

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/myrepo.git
    path: charts/my-app
    targetRevision: main

    helm:
      # Reference values files relative to the chart path
      valueFiles:
        - values.yaml
        - values-production.yaml

      # Inline values override values files
      values: |
        image:
          tag: v2.0.0

      parameters:
        - name: replicas
          value: "5"
```

### Kustomize Source

```yaml
spec:
  source:
    repoURL: https://github.com/myorg/myrepo.git
    path: overlays/production
    targetRevision: main

    kustomize:
      # Override container images
      images:
        - myapp=myregistry.com/myapp:v2.0.0
        - sidecar=myregistry.com/sidecar:latest

      # Add name prefix to all resources
      namePrefix: prod-

      # Add name suffix to all resources
      nameSuffix: -v2

      # Add labels to all resources
      commonLabels:
        env: production
        managed-by: argocd

      # Add annotations to all resources
      commonAnnotations:
        team: platform

      # Force common labels (even if they override existing ones)
      forceCommonLabels: true

      # Specify Kustomize version
      version: v5.0.0
```

### Multi-Source Application

```yaml
spec:
  sources:
    # Source 1: Helm chart
    - repoURL: https://charts.bitnami.com/bitnami
      chart: postgresql
      targetRevision: 14.0.0
      helm:
        valueFiles:
          - $values/database/values-production.yaml

    # Source 2: Git repo with values (referenced above)
    - repoURL: https://github.com/myorg/config.git
      targetRevision: main
      ref: values  # This name is used as $values above

    # Source 3: Additional manifests
    - repoURL: https://github.com/myorg/myrepo.git
      path: additional-resources
      targetRevision: main
```

## Destination Section

```yaml
spec:
  destination:
    # Target cluster - use one of these:

    # Option 1: Cluster URL (always works)
    server: https://kubernetes.default.svc

    # Option 2: Cluster name (if registered with a name)
    # name: production-cluster

    # Target namespace
    namespace: production
```

The special URL `https://kubernetes.default.svc` refers to the cluster where ArgoCD is installed. External clusters must be registered first:

```bash
argocd cluster add my-cluster-context --name production-cluster
```

## Sync Policy Section

```yaml
spec:
  syncPolicy:
    # Automated sync configuration
    automated:
      # Delete resources from cluster that no longer exist in Git
      prune: true

      # Revert manual changes made to cluster resources
      selfHeal: true

      # Allow syncing when the source has no resources (dangerous)
      allowEmpty: false

    # Sync options (list of key=value strings)
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
      - ServerSideApply=true
      - ApplyOutOfSyncOnly=true
      - Validate=false
      - Replace=true
      - FailOnSharedResource=true
      - RespectIgnoreDifferences=true
      - PrunePropagationPolicy=foreground

    # Retry configuration for failed syncs
    retry:
      # Maximum number of retry attempts
      limit: 5
      backoff:
        # Initial retry delay
        duration: 5s
        # Multiplier for each subsequent retry
        factor: 2
        # Maximum delay between retries
        maxDuration: 3m

    # Managed namespace metadata (when CreateNamespace=true)
    managedNamespaceMetadata:
      labels:
        team: platform
      annotations:
        contact: platform-team@company.com
```

### Sync Options Explained

| Option | Purpose |
|--------|---------|
| `CreateNamespace=true` | Create target namespace if missing |
| `PruneLast=true` | Delete removed resources after all others sync |
| `ServerSideApply=true` | Use Kubernetes server-side apply (better for CRDs) |
| `ApplyOutOfSyncOnly=true` | Skip resources already in sync |
| `Validate=false` | Skip schema validation (for CRDs not yet installed) |
| `Replace=true` | Replace resources instead of apply (destructive) |
| `FailOnSharedResource=true` | Fail if resource belongs to another app |
| `RespectIgnoreDifferences=true` | Respect ignoreDifferences during sync |
| `PrunePropagationPolicy=foreground` | Wait for dependents to be deleted |

## Ignore Differences Section

```yaml
spec:
  ignoreDifferences:
    # Ignore by JSON pointer
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

    # Ignore by JQ path expression (more flexible)
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .spec.template.metadata.annotations."kubectl.kubernetes.io/restartedAt"

    # Ignore for specific named resource
    - group: apps
      kind: Deployment
      name: my-specific-deployment
      jsonPointers:
        - /spec/replicas

    # Ignore fields managed by specific controllers
    - group: "*"
      kind: "*"
      managedFieldsManagers:
        - kube-controller-manager
        - argo-rollouts
```

## Putting It All Together

Here is a production-ready Application spec:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api
  namespace: argocd
  labels:
    team: backend
    env: production
    tier: api
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: backend-deploys
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: backend-critical
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: backend-team
  source:
    repoURL: https://github.com/myorg/backend-api.git
    path: charts/backend
    targetRevision: main
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
      parameters:
        - name: image.tag
          value: v3.2.1
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
      - ApplyOutOfSyncOnly=true
      - PruneLast=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    - group: autoscaling
      kind: HorizontalPodAutoscaler
      jqPathExpressions:
        - .metadata.annotations
```

## Validating Your Spec

Before applying, validate the manifest:

```bash
# Dry-run with kubectl
kubectl apply -f my-app.yaml --dry-run=client

# Validate with ArgoCD CLI
argocd app create --file my-app.yaml --validate

# Check for common mistakes
kubectl apply -f my-app.yaml --dry-run=server
```

For examples of creating applications through different methods, see [creating applications with the CLI](https://oneuptime.com/blog/post/2026-02-26-argocd-create-application-cli/view), [creating applications through the UI](https://oneuptime.com/blog/post/2026-02-26-argocd-create-application-ui/view), and [creating your first ArgoCD application](https://oneuptime.com/blog/post/2026-02-26-argocd-create-first-application/view).
