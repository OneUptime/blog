# How to Create an ArgoCD Application Declaratively with YAML

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, YAML, Declarative

Description: Learn how to define ArgoCD applications as YAML manifests for version-controlled, reproducible, and GitOps-managed application deployments.

---

Creating ArgoCD applications declaratively with YAML manifests is the most GitOps-native approach. Instead of using the UI or CLI to create applications, you define them as Kubernetes custom resources and store them in Git. This means your ArgoCD applications themselves are managed through GitOps - any change to how an application is configured goes through a pull request, gets reviewed, and is version-controlled.

## Why Declarative Applications

The CLI and UI are great for experimentation, but for production you want:

- **Version control**: Every change to application configuration is tracked in Git
- **Code review**: Changes go through pull requests
- **Reproducibility**: You can recreate the entire ArgoCD setup from Git
- **Automation**: Applications are created automatically when manifests are applied
- **Consistency**: All applications follow the same template

## The Application CRD

An ArgoCD Application is a Kubernetes Custom Resource. Here is the full structure:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  # Labels for filtering and organization
  labels:
    team: backend
    env: production
  # Annotations for notifications, sync options, etc.
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments
  # Finalizer controls what happens when the Application is deleted
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  # The ArgoCD project this application belongs to
  project: default

  # Source: where to get the manifests
  source:
    repoURL: https://github.com/myorg/myrepo.git
    targetRevision: main
    path: manifests/my-app

  # Destination: where to deploy
  destination:
    server: https://kubernetes.default.svc
    namespace: production

  # Sync policy: how to keep it in sync
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

## Minimal Application

The smallest valid Application manifest:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myrepo.git
    path: manifests
    targetRevision: HEAD
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

Apply it:

```bash
kubectl apply -f my-app.yaml
```

## Application with Helm Source

For deploying a Helm chart from a chart repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 55.0.0
    helm:
      # Release name override
      releaseName: monitoring
      # Values files from the chart
      values: |
        prometheus:
          prometheusSpec:
            retention: 30d
            storageSpec:
              volumeClaimTemplate:
                spec:
                  accessModes: ["ReadWriteOnce"]
                  resources:
                    requests:
                      storage: 50Gi
        grafana:
          enabled: true
          adminPassword: change-me
      # Individual parameter overrides
      parameters:
        - name: alertmanager.enabled
          value: "true"
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

For deploying a Helm chart from a Git repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myrepo.git
    path: charts/my-app
    targetRevision: main
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
      parameters:
        - name: image.tag
          value: v1.2.3
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Application with Kustomize Source

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-kustomize-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myrepo.git
    path: overlays/production
    targetRevision: main
    kustomize:
      # Override images
      images:
        - myapp=myregistry.com/myapp:v2.0.0
      # Add name prefix
      namePrefix: prod-
      # Add common labels
      commonLabels:
        env: production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Sync Policy Configuration

### Manual Sync (Default)

```yaml
spec:
  syncPolicy: {}
  # Or simply omit the syncPolicy field
```

### Automated Sync with All Options

```yaml
spec:
  syncPolicy:
    automated:
      # Delete resources from cluster that are no longer in Git
      prune: true
      # Revert manual changes made directly to the cluster
      selfHeal: true
      # Only sync when there is a difference (default true)
      allowEmpty: false
    syncOptions:
      # Create the namespace if it does not exist
      - CreateNamespace=true
      # Use server-side apply
      - ServerSideApply=true
      # Only apply resources that are out of sync
      - ApplyOutOfSyncOnly=true
      # Prune resources last (after all other resources sync)
      - PruneLast=true
      # Skip schema validation
      - Validate=false
      # Replace resources instead of apply
      - Replace=true
      # Fail if a resource is shared with another application
      - FailOnSharedResource=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Ignore Differences

Tell ArgoCD to ignore certain fields that change at runtime:

```yaml
spec:
  ignoreDifferences:
    # Ignore replica count (managed by HPA)
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
    # Ignore webhook CA bundle (injected by cert-manager)
    - group: admissionregistration.k8s.io
      kind: MutatingWebhookConfiguration
      jqPathExpressions:
        - .webhooks[]?.clientConfig.caBundle
    # Ignore all metadata annotations matching a pattern
    - group: "*"
      kind: "*"
      managedFieldsManagers:
        - kube-controller-manager
```

## Finalizers

Finalizers control what happens when you delete the Application resource:

```yaml
metadata:
  finalizers:
    # Delete all managed resources when the Application is deleted (cascade delete)
    - resources-finalizer.argocd.argoproj.io

# Without the finalizer, deleting the Application leaves resources in the cluster
# (orphan behavior)
```

## Multi-Source Applications

Deploy from multiple sources (available since ArgoCD 2.6):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: multi-source-app
  namespace: argocd
spec:
  project: default
  sources:
    # Helm chart from a chart repo
    - repoURL: https://charts.bitnami.com/bitnami
      chart: nginx
      targetRevision: 15.0.0
      helm:
        valueFiles:
          # Reference values from the second source
          - $values/nginx/values-production.yaml
    # Git repo with values files
    - repoURL: https://github.com/myorg/config.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Storing Application Manifests in Git

The recommended repository structure for managing ArgoCD applications:

```
argocd-apps/
  apps/
    nginx-demo.yaml
    backend-api.yaml
    frontend.yaml
  projects/
    team-a.yaml
    team-b.yaml
```

Then create an ArgoCD Application that manages these application manifests (the App of Apps pattern):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-apps
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/argocd-apps.git
    path: apps
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

This creates a self-managing system where adding a new YAML file to the `apps/` directory automatically creates a new ArgoCD Application.

## Applying and Verifying

```bash
# Apply the application manifest
kubectl apply -f my-app.yaml

# Verify it was created
kubectl get applications -n argocd

# Check the application details
kubectl get application my-app -n argocd -o yaml

# Watch the sync status
argocd app get my-app --refresh
```

## Templating Application Manifests

For managing many similar applications, use Helm or Kustomize to template the Application manifests themselves:

```yaml
# Kustomize base for Application resources
# base/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: PLACEHOLDER
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myrepo.git
    path: PLACEHOLDER
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: PLACEHOLDER
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Then use patches for each application:

```yaml
# overlays/frontend/kustomization.yaml
resources:
  - ../../base
patches:
  - patch: |
      - op: replace
        path: /metadata/name
        value: frontend
      - op: replace
        path: /spec/source/path
        value: services/frontend
      - op: replace
        path: /spec/destination/namespace
        value: frontend
    target:
      kind: Application
```

For the App of Apps pattern in detail, see [ArgoCD App of Apps](https://oneuptime.com/blog/post/2026-01-30-argocd-app-of-apps-pattern/view). For ApplicationSets as an alternative to templating, see [ArgoCD ApplicationSets](https://oneuptime.com/blog/post/2026-01-25-application-sets-argocd/view).
