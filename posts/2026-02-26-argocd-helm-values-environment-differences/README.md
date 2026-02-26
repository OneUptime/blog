# How to Use Helm Values Files for Environment Differences in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Environment Management

Description: Learn how to use Helm values files with ArgoCD to manage configuration differences across multiple environments using per-environment overrides.

---

Helm charts are the most popular packaging format for Kubernetes applications, and one of their biggest strengths is the ability to customize deployments through values files. When deploying with ArgoCD, you can leverage multiple values files to handle environment-specific configuration without modifying the chart itself. This approach keeps your environments consistent while allowing the necessary differences between dev, staging, and production.

## The Values File Strategy

The idea is straightforward. Your Helm chart defines templates with configurable parameters. You create a base `values.yaml` with sensible defaults, then layer environment-specific values files on top. ArgoCD lets you specify multiple values files in order, where later files override earlier ones.

A typical repository structure looks like this:

```
my-app/
  chart/
    Chart.yaml
    templates/
      deployment.yaml
      service.yaml
      configmap.yaml
      hpa.yaml
    values.yaml                # Base defaults
  environments/
    values-dev.yaml            # Dev overrides
    values-staging.yaml        # Staging overrides
    values-production.yaml     # Production overrides
```

## Writing the Base Values File

Your base `values.yaml` should contain every configurable parameter with reasonable defaults:

```yaml
# chart/values.yaml - base defaults
replicaCount: 1

image:
  repository: myregistry/my-app
  tag: latest
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 200m
    memory: 256Mi

autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 5
  targetCPUUtilization: 80

config:
  logLevel: info
  databasePoolSize: 5
  cacheTTL: 300

ingress:
  enabled: true
  hostname: ""
  tls: false

monitoring:
  enabled: true
  serviceMonitor: false
```

## Environment-Specific Overrides

Each environment file only needs to contain the values that differ from the base:

```yaml
# environments/values-dev.yaml
image:
  tag: dev-latest
  pullPolicy: Always  # Always pull in dev

config:
  logLevel: debug
  databasePoolSize: 2

ingress:
  hostname: my-app.dev.internal
  tls: false

monitoring:
  serviceMonitor: false
```

```yaml
# environments/values-staging.yaml
replicaCount: 2

image:
  tag: rc-1.2.3

config:
  logLevel: info
  databasePoolSize: 10

ingress:
  hostname: my-app.staging.example.com
  tls: true

monitoring:
  serviceMonitor: true
```

```yaml
# environments/values-production.yaml
replicaCount: 3

image:
  tag: v1.2.3
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "1"
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 15
  targetCPUUtilization: 70

config:
  logLevel: warn
  databasePoolSize: 20
  cacheTTL: 3600

ingress:
  hostname: my-app.example.com
  tls: true

monitoring:
  serviceMonitor: true
```

## Configuring ArgoCD to Use Multiple Values Files

ArgoCD supports specifying multiple Helm values files in the Application spec. Files are merged in order, with later files taking precedence:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: chart
    helm:
      valueFiles:
        - values.yaml                      # Base defaults (loaded first)
        - ../environments/values-production.yaml  # Production overrides
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

For the dev environment, simply swap the values file:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: chart
    helm:
      valueFiles:
        - values.yaml
        - ../environments/values-dev.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Using ApplicationSets to Reduce Boilerplate

An ApplicationSet with a list generator eliminates the need for separate Application manifests per environment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-envs
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            cluster: https://kubernetes.default.svc
          - env: staging
            cluster: https://kubernetes.default.svc
          - env: production
            cluster: https://prod-cluster.example.com
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/my-app.git
        targetRevision: main
        path: chart
        helm:
          valueFiles:
            - values.yaml
            - '../environments/values-{{env}}.yaml'
      destination:
        server: '{{cluster}}'
        namespace: '{{env}}'
      syncPolicy:
        syncOptions:
          - CreateNamespace=true
```

## Inline Value Overrides

For quick overrides or sensitive values that should not live in Git, ArgoCD supports inline parameter values:

```yaml
source:
  repoURL: https://github.com/myorg/my-app.git
  path: chart
  helm:
    valueFiles:
      - values.yaml
      - ../environments/values-production.yaml
    parameters:
      - name: image.tag
        value: v1.2.4  # Override just the image tag
      - name: config.featureFlag
        value: "true"
```

This is particularly useful in CI/CD pipelines where you need to update the image tag after a build:

```bash
# Update the image tag via ArgoCD CLI
argocd app set my-app-production \
  --helm-set image.tag=v1.2.4
```

## Using Values from External Sources

ArgoCD 2.6 and later supports multi-source Applications, letting you pull values files from a separate repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  project: default
  sources:
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: main
      path: charts/my-app
      helm:
        valueFiles:
          - $values/production/my-app.yaml
    - repoURL: https://github.com/myorg/environment-config.git
      targetRevision: main
      ref: values  # Reference name used with $values
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

The `$values` reference points to the second source repository, letting you keep your chart and environment configuration in separate repos.

## Values File Layering Patterns

For complex applications, you might want multiple layers of values:

```yaml
helm:
  valueFiles:
    - values.yaml                           # Chart defaults
    - ../environments/values-common.yaml    # Shared across all envs
    - ../environments/values-production.yaml # Environment-specific
    - ../environments/values-us-east.yaml   # Region-specific
```

This layering pattern works well for organizations that deploy the same application across multiple regions with slight variations.

## Debugging Values Resolution

When values are not resolving as expected, use the ArgoCD CLI to see the final merged values:

```bash
# Show the computed parameters for an application
argocd app get my-app-production --show-params

# Preview the rendered manifests
argocd app manifests my-app-production

# Locally test with Helm to verify merging behavior
helm template my-app chart/ \
  -f chart/values.yaml \
  -f environments/values-production.yaml
```

## Best Practices

Keep your environment values files small. They should only contain the differences, not a copy of the entire base values file. This makes it easy to see at a glance what is different about each environment during code review.

Use explicit types in your values files. A common gotcha is YAML interpreting `"true"` as a boolean when you intended a string. Use quotes for string values and explicit typing when ambiguous.

Pin your chart versions in production. While dev might track `main`, production should reference a specific Git tag or commit SHA to ensure reproducibility.

Version your values files alongside the chart. When a chart upgrade adds new required values, all environment files should be updated in the same pull request. This prevents sync failures where one environment's values are incompatible with the chart version.

Using Helm values files with ArgoCD gives you a flexible, well-understood approach to environment management that works naturally with Git-based workflows and code review processes.
