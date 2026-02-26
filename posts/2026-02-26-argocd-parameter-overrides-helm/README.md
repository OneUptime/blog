# How to Use Parameter Overrides with Helm in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Configuration

Description: Learn how to use Helm parameter overrides in ArgoCD applications, including inline values, parameter lists, values files, and advanced override patterns for production deployments.

---

Helm is the most popular package manager for Kubernetes, and ArgoCD has deep integration with it. One of the key features of this integration is the ability to override Helm values at the ArgoCD Application level. This lets you customize chart behavior per environment, per cluster, or per deployment without forking the chart.

This guide covers every method of overriding Helm parameters in ArgoCD with practical examples.

## The Three Override Methods

ArgoCD provides three ways to override Helm values:

1. **Individual parameters** - dot-notation key-value pairs
2. **Inline values block** - a YAML block that merges with default values
3. **External values files** - references to values files in the same or different repos

Each has its strengths, and you can combine them.

## Method 1: Individual Parameters

The `parameters` field accepts a list of key-value pairs using Helm's dot-notation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-production
  namespace: argocd
spec:
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: nginx
    targetRevision: 15.14.0
    helm:
      parameters:
        - name: replicaCount
          value: "5"
        - name: image.tag
          value: "1.25.4"
        - name: service.type
          value: "ClusterIP"
        - name: resources.limits.memory
          value: "256Mi"
        - name: resources.limits.cpu
          value: "250m"
        - name: resources.requests.memory
          value: "128Mi"
        - name: resources.requests.cpu
          value: "100m"
  destination:
    server: https://kubernetes.default.svc
    namespace: nginx
```

### Setting Parameters via CLI

```bash
# Set a single parameter
argocd app set nginx-production --helm-set replicaCount=5

# Set nested parameters
argocd app set nginx-production --helm-set image.tag=1.25.4

# Set multiple parameters at once
argocd app set nginx-production \
  --helm-set replicaCount=5 \
  --helm-set image.tag=1.25.4 \
  --helm-set service.type=ClusterIP

# Set a parameter with special characters (use quotes)
argocd app set nginx-production \
  --helm-set 'annotations.kubernetes\.io/ingress-class=nginx'
```

### Working with Arrays

Helm array values use index notation:

```yaml
helm:
  parameters:
    - name: ingress.hosts[0].host
      value: "app.example.com"
    - name: ingress.hosts[0].paths[0].path
      value: "/"
    - name: ingress.hosts[0].paths[0].pathType
      value: "Prefix"
    - name: ingress.tls[0].secretName
      value: "app-tls"
    - name: ingress.tls[0].hosts[0]
      value: "app.example.com"
```

Via CLI:

```bash
argocd app set nginx-production \
  --helm-set 'ingress.hosts[0].host=app.example.com' \
  --helm-set 'ingress.hosts[0].paths[0].path=/' \
  --helm-set 'ingress.hosts[0].paths[0].pathType=Prefix'
```

## Method 2: Inline Values Block

The `values` field accepts a YAML string that merges with the chart's default values:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-staging
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/helm-charts.git
    targetRevision: main
    path: charts/backend-api
    helm:
      values: |
        replicaCount: 3

        image:
          repository: myorg/backend-api
          tag: v2.1.0
          pullPolicy: IfNotPresent

        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 250m
            memory: 256Mi

        autoscaling:
          enabled: true
          minReplicas: 3
          maxReplicas: 10
          targetCPUUtilizationPercentage: 70

        env:
          - name: LOG_LEVEL
            value: info
          - name: DATABASE_POOL_SIZE
            value: "20"

        ingress:
          enabled: true
          className: nginx
          hosts:
            - host: api-staging.example.com
              paths:
                - path: /
                  pathType: Prefix
          tls:
            - secretName: api-staging-tls
              hosts:
                - api-staging.example.com
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api-staging
```

The inline values block is easier to read than individual parameters for complex configurations and preserves YAML structure.

### Setting Values via CLI

```bash
argocd app set backend-api-staging --values '
replicaCount: 3
image:
  tag: v2.1.0
resources:
  limits:
    memory: 512Mi
'
```

## Method 3: External Values Files

Reference values files from the chart repository or other repos:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/helm-charts.git
    targetRevision: main
    path: charts/backend-api
    helm:
      valueFiles:
        - values.yaml                    # Default values
        - values-production.yaml         # Production overrides
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api
```

### Values Files from a Different Repository

Using multi-source applications, you can pull values from a separate repo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
  namespace: argocd
spec:
  sources:
    # Source 1: The Helm chart
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: main
      path: charts/backend-api
      helm:
        valueFiles:
          - $configRepo/environments/production/backend-api.yaml

    # Source 2: The config repo (referenced as $configRepo)
    - repoURL: https://github.com/myorg/config-repo.git
      targetRevision: main
      ref: configRepo
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api
```

This pattern separates the chart (shared across environments) from the values (environment-specific).

## Combining Override Methods

You can use all three methods together. The priority order from lowest to highest is:

1. Chart's default `values.yaml`
2. Files listed in `valueFiles` (in order)
3. Inline `values` block
4. Individual `parameters`

Example combining all methods:

```yaml
spec:
  source:
    helm:
      # Loaded second (after defaults)
      valueFiles:
        - values-production.yaml

      # Loaded third
      values: |
        replicaCount: 5
        resources:
          limits:
            memory: 1Gi

      # Loaded last (highest priority)
      parameters:
        - name: image.tag
          value: "v2.2.0-hotfix"
```

This is useful when you have a standard production values file but need a quick override (like a hotfix image tag) on top.

## Handling Sensitive Values

Never put secrets directly in parameter overrides. They are stored in the Application resource which is visible to anyone with ArgoCD access.

Instead, use Kubernetes secrets and reference them in your chart:

```yaml
helm:
  values: |
    database:
      existingSecret: db-credentials
      existingSecretPasswordKey: password
```

Or use the External Secrets Operator to create the Kubernetes secret, and reference it in your Helm values.

## Viewing Current Overrides

Check what overrides are applied to an application:

```bash
# View application details including overrides
argocd app get backend-api-production

# View just the Helm parameters as JSON
argocd app get backend-api-production -o json | \
  jq '.spec.source.helm'

# View the rendered manifest to see final values
argocd app manifests backend-api-production
```

## Removing Overrides

Remove individual parameter overrides:

```bash
# Remove a specific parameter override
argocd app unset backend-api-production --helm-set replicaCount

# Remove all parameter overrides
argocd app unset backend-api-production --helm-set-all

# Remove the values block
argocd app unset backend-api-production --values
```

## Common Pitfalls

**String values that look like numbers.** Helm treats unquoted values as their native type. If you need a string "true" instead of boolean true:

```yaml
parameters:
  - name: config.debugMode
    value: "true"        # ArgoCD passes this as a string
    forceString: true    # Ensure Helm treats it as a string
```

Via CLI:

```bash
argocd app set myapp --helm-set-string config.debugMode=true
```

**Multiline values.** Individual parameters cannot hold multiline strings. Use the values block instead:

```yaml
helm:
  values: |
    config:
      nginx.conf: |
        server {
          listen 80;
          location / {
            proxy_pass http://backend;
          }
        }
```

**Forgetting to sync after override.** Setting a parameter does not automatically trigger a sync unless auto-sync is enabled:

```bash
argocd app set myapp --helm-set replicaCount=5
argocd app sync myapp    # Required if auto-sync is off
```

## Summary

Helm parameter overrides in ArgoCD give you flexible control over chart values at deployment time. Use individual parameters for simple overrides, inline values for complex YAML structures, and external values files for environment-specific configuration. Combine methods when needed, but remember that overrides outside of Git break the GitOps audit trail. For permanent configuration, commit your values to a Git repository and reference them through values files.
