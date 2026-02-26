# How to Structure Helm Values for Multiple Environments in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Environments

Description: Learn how to organize Helm values files for development, staging, and production environments when deploying through ArgoCD.

---

When you manage multiple environments with Helm and ArgoCD, the question of how to structure your values files comes up quickly. Should you have one massive values file per environment? A base with overlays? Separate repos? The wrong structure leads to duplicated configuration, missed updates, and environments that drift apart in unexpected ways.

Let me show you the patterns that work well in practice.

## The Problem

Say you have a Helm chart for a web application. Development needs 1 replica with debug logging, staging needs 2 replicas with standard logging, and production needs 5 replicas with structured logging, plus an HPA, PDB, and different resource limits.

Without a good structure, you end up copying the entire values file for each environment and changing a few lines. Then someone updates a setting in production and forgets to update it in staging. Six months later, you discover staging and production have completely different configurations.

## Pattern 1: Base Values with Environment Overrides

This is the most common and usually the best approach. Keep a `values.yaml` with shared defaults and create small override files per environment.

```
my-chart/
  Chart.yaml
  templates/
    deployment.yaml
    service.yaml
    hpa.yaml
    pdb.yaml
  values.yaml              # Base values (shared across all envs)
  values-dev.yaml          # Dev-specific overrides
  values-staging.yaml      # Staging-specific overrides
  values-production.yaml   # Production-specific overrides
```

The base `values.yaml` contains everything that is the same across environments.

```yaml
# values.yaml - base configuration
image:
  repository: myregistry.com/my-app
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

env:
  - name: APP_NAME
    value: my-app
  - name: LOG_FORMAT
    value: json

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 256Mi

replicaCount: 2

hpa:
  enabled: false

pdb:
  enabled: false

ingress:
  enabled: true
  annotations:
    kubernetes.io/ingress.class: nginx
```

Each environment file only contains what is different.

```yaml
# values-dev.yaml - minimal overrides
image:
  tag: latest

replicaCount: 1

resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 128Mi

env:
  - name: APP_NAME
    value: my-app
  - name: LOG_FORMAT
    value: text
  - name: LOG_LEVEL
    value: debug

ingress:
  hosts:
    - host: my-app.dev.example.com
```

```yaml
# values-staging.yaml
image:
  tag: v1.2.3

ingress:
  hosts:
    - host: my-app.staging.example.com
```

```yaml
# values-production.yaml
image:
  tag: v1.2.3

replicaCount: 5

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "2"
    memory: 1Gi

hpa:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

pdb:
  enabled: true
  minAvailable: 3

ingress:
  hosts:
    - host: my-app.example.com
  tls:
    - secretName: my-app-tls
      hosts:
        - my-app.example.com
```

### ArgoCD Applications for Each Environment

```yaml
# Dev application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-dev.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-dev
---
# Production application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://prod-cluster:6443
    namespace: my-app
```

Helm merges values files in order, with later files overriding earlier ones. So `values-production.yaml` overrides anything in `values.yaml`.

## Pattern 2: Values in a Separate Repository

When the chart lives in a separate repository from the environment configurations, use ArgoCD's multi-source feature.

```
# Chart repository
helm-charts/
  charts/
    my-app/
      Chart.yaml
      templates/
      values.yaml

# Config repository
deployment-config/
  apps/
    my-app/
      dev/
        values.yaml
      staging/
        values.yaml
      production/
        values.yaml
```

Use multi-source Applications to combine them.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  sources:
    # Reference the config repo for values
    - repoURL: https://github.com/my-org/deployment-config.git
      targetRevision: main
      ref: values
    # Reference the chart repo for the chart
    - repoURL: https://github.com/my-org/helm-charts.git
      targetRevision: main
      path: charts/my-app
      helm:
        valueFiles:
          - $values/apps/my-app/production/values.yaml
  destination:
    server: https://prod-cluster:6443
    namespace: my-app
```

The `$values` prefix references the first source in the list. This pattern lets application teams update values without modifying the chart.

## Pattern 3: Inline Values in ArgoCD Application

For small overrides, you can specify values directly in the ArgoCD Application spec.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/helm-charts.git
    targetRevision: main
    path: charts/my-app
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
      # Inline overrides take highest precedence
      values: |
        image:
          tag: v1.2.4
      # Or individual parameters
      parameters:
        - name: replicaCount
          value: "10"
  destination:
    server: https://prod-cluster:6443
    namespace: my-app
```

The precedence order is: `parameters` > `values` (inline) > last `valueFiles` entry > first `valueFiles` entry.

Use inline values sparingly. They are not version-controlled in the same way as values files in Git.

## Pattern 4: ApplicationSet with Value Generators

For managing the same application across many environments, ApplicationSets reduce duplication.

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
            cluster: https://kubernetes.default.svc
            namespace: my-app-dev
            valuesFile: values-dev.yaml
          - env: staging
            cluster: https://kubernetes.default.svc
            namespace: my-app-staging
            valuesFile: values-staging.yaml
          - env: production
            cluster: https://prod-cluster:6443
            namespace: my-app
            valuesFile: values-production.yaml
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      source:
        repoURL: https://github.com/my-org/helm-charts.git
        targetRevision: main
        path: charts/my-app
        helm:
          valueFiles:
            - values.yaml
            - '{{valuesFile}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
```

## Best Practices for Values Management

### Keep Environment Files Small

If your environment override files are almost as large as the base values file, you have too much in the overrides. Refactor common settings into the base.

### Use Explicit Naming

Name your values files clearly: `values-production.yaml` not `prod.yaml` or `p.yaml`. Six months from now, you will thank yourself.

### Version Pin in Production

Always pin image tags in production values. Never use `latest` or a branch-based tag.

```yaml
# Good
image:
  tag: v1.2.3

# Bad
image:
  tag: latest
```

### Validate Values Before Committing

Use `helm template` locally to verify your values produce valid manifests.

```bash
# Validate production values locally
helm template my-app ./charts/my-app \
  -f ./charts/my-app/values.yaml \
  -f ./charts/my-app/values-production.yaml \
  --debug
```

### Document Non-Obvious Values

Add comments to explain why certain values differ between environments.

```yaml
# Production needs higher limits because of batch processing jobs
# that run during peak hours (see JIRA-1234)
resources:
  limits:
    cpu: "4"
    memory: 4Gi
```

Monitor your deployments across all environments to catch configuration issues early. [OneUptime](https://oneuptime.com) can monitor application health across development, staging, and production, helping you identify when environment-specific configuration causes problems.

The key principle is minimizing duplication. Keep the base values comprehensive, keep the overrides small and focused, and use ArgoCD's multi-source feature when charts and values live in different repositories.
