# How to Use Helm Values Files in ArgoCD Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Configuration

Description: Learn how to configure ArgoCD applications to use Helm values files for environment-specific configuration with practical examples and best practices.

---

Helm values files are the primary way to customize Helm chart deployments. When you use Helm charts with ArgoCD, you need to tell ArgoCD which values files to use and where to find them. ArgoCD supports values files from the chart directory, from the same Git repository, and even from different repositories using multi-source applications.

In this guide, we will cover how to configure values files in ArgoCD applications, how to structure them for multiple environments, and common patterns you should know.

## Basic Values File Configuration

The simplest case is referencing a `values.yaml` file that lives alongside your Helm chart:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      # Reference values files relative to the chart path
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

Your repository structure:

```text
charts/my-app/
  Chart.yaml
  templates/
  values.yaml          # Default values
  values-dev.yaml      # Dev overrides
  values-staging.yaml  # Staging overrides
  values-prod.yaml     # Production overrides
```

## Environment-Specific Values Files

A common pattern is to have a base `values.yaml` and environment-specific overrides:

```yaml
# values.yaml (base defaults)
replicaCount: 1
image:
  repository: myorg/my-app
  tag: latest
  pullPolicy: IfNotPresent
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "200m"
ingress:
  enabled: false
```

```yaml
# values-prod.yaml (production overrides)
replicaCount: 3
image:
  tag: v1.5.2
  pullPolicy: Always
resources:
  requests:
    memory: "512Mi"
    cpu: "500m"
  limits:
    memory: "1Gi"
    cpu: "1000m"
ingress:
  enabled: true
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix
```

Reference the environment-specific values file in your ArgoCD Application:

```yaml
# Production application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml       # Base values (applied first)
        - values-prod.yaml   # Production overrides (applied second)
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

The order matters. Files listed later override values from earlier files.

## Values Files from a Subdirectory

If your values files are in a different directory within the same repository, use relative paths:

```text
repo/
  charts/my-app/
    Chart.yaml
    templates/
    values.yaml
  environments/
    dev/
      my-app-values.yaml
    staging/
      my-app-values.yaml
    production/
      my-app-values.yaml
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-repo.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        # Relative path from the chart directory
        - ../../environments/production/my-app-values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Using the CLI to Set Values Files

You can specify values files when creating or updating an application via the ArgoCD CLI:

```bash
# Create with values files
argocd app create my-app \
  --repo https://github.com/myorg/my-charts.git \
  --path charts/my-app \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace production \
  --values values.yaml \
  --values values-prod.yaml

# Add another values file to an existing app
argocd app set my-app --values values.yaml --values values-prod.yaml
```

## Values Files with Helm Chart Repositories

When using a Helm chart from a chart repository (not a Git repo), your values must come from inline values or from a separate source using multi-source apps:

```yaml
# Single source with inline values
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx
  namespace: argocd
spec:
  source:
    chart: nginx
    repoURL: https://charts.bitnami.com/bitnami
    targetRevision: 15.4.0
    helm:
      # Inline values since there is no Git repo to reference files from
      values: |
        replicaCount: 3
        service:
          type: LoadBalancer
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
  destination:
    server: https://kubernetes.default.svc
    namespace: web
```

For values files from a Git repository, use multi-source applications (ArgoCD 2.6+):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx
  namespace: argocd
spec:
  sources:
    # Source 1: The Helm chart
    - chart: nginx
      repoURL: https://charts.bitnami.com/bitnami
      targetRevision: 15.4.0
      helm:
        valueFiles:
          # Reference values from the Git repo source using $ref
          - $values/nginx/production-values.yaml
    # Source 2: Git repo containing values files
    - repoURL: https://github.com/myorg/helm-values.git
      targetRevision: main
      ref: values  # This ref name is used with $ prefix above
  destination:
    server: https://kubernetes.default.svc
    namespace: web
```

## ApplicationSet with Values Files

When using ApplicationSets to generate applications for multiple environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            namespace: dev
            valuesFile: values-dev.yaml
          - env: staging
            namespace: staging
            valuesFile: values-staging.yaml
          - env: production
            namespace: production
            valuesFile: values-prod.yaml
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      source:
        repoURL: https://github.com/myorg/my-charts.git
        targetRevision: main
        path: charts/my-app
        helm:
          valueFiles:
            - values.yaml
            - '{{valuesFile}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

## Verifying Values Resolution

To check what values ArgoCD is using:

```bash
# See the effective values being passed to Helm
argocd app get my-app -o json | jq '.spec.source.helm'

# Preview what Helm would render with the current values
argocd app manifests my-app

# Diff to see what would change
argocd app diff my-app
```

## Common Pitfalls

1. **File paths are relative to the chart path**, not the repository root. If your chart is at `charts/my-app/`, a values file reference of `values-prod.yaml` looks for `charts/my-app/values-prod.yaml`.

2. **Values files must exist** at sync time. If a referenced values file is missing, the sync will fail.

3. **Order matters**. Later files override earlier ones. Always list your base `values.yaml` first and environment-specific files after.

4. **Inline values override file values**. If you specify both `valueFiles` and `values` (inline), the inline values take precedence.

## Summary

Helm values files in ArgoCD let you customize deployments per environment while keeping a single chart. Use `valueFiles` in the `helm` section of your Application spec, list base values first and overrides second, and consider multi-source applications when your values files live in a separate repository from your chart. For more advanced customization, see our guides on [overriding Helm values](https://oneuptime.com/blog/post/2026-02-26-argocd-override-helm-values/view) and [using multiple values files](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-helm-values-files/view).
