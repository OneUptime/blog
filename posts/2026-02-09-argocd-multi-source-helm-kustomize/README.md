# How to Build a Multi-Source ArgoCD Application That Combines Helm and Kustomize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Helm, Kustomize, Multi-Source, GitOps

Description: Learn how to use ArgoCD multi-source applications to combine Helm charts with Kustomize overlays for flexible configuration management in GitOps workflows.

---

Many applications need both Helm charts for third-party components and Kustomize overlays for custom configuration. Traditionally, you had to choose one or the other. ArgoCD multi-source applications solve this by letting you combine multiple sources in a single application. This guide shows you how to leverage multi-source apps for maximum flexibility.

## Understanding Multi-Source Applications

Multi-source applications reference multiple Git repositories, Helm repositories, or combinations. Common use cases:

- Helm chart from upstream repository plus custom values from your Git repo
- Multiple Git repositories with different access controls
- Helm chart plus Kustomize overlays for additional resources
- OCI registry artifacts combined with Git configuration

## Enabling Multi-Source Support

Multi-source applications require ArgoCD 2.6 or later. Verify your version:

```bash
argocd version
```

The feature is enabled by default in recent versions.

## Basic Multi-Source Application

Combine a Helm chart with values from Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-ingress
  namespace: argocd
spec:
  project: default
  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx
  sources:
    # Source 1: Helm chart from repository
    - repoURL: https://kubernetes.github.io/ingress-nginx
      chart: ingress-nginx
      targetRevision: 4.8.3
      helm:
        valueFiles:
          - $values/ingress-nginx/values.yaml

    # Source 2: Values from Git repository
    - repoURL: https://github.com/yourorg/k8s-config
      targetRevision: main
      ref: values
```

The `$values` reference points to the second source named `values`.

## Helm Chart Plus Kustomize Overlay

Deploy a Helm chart and add custom resources via Kustomize:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: postgresql
  namespace: argocd
spec:
  project: default
  destination:
    server: https://kubernetes.default.svc
    namespace: database
  sources:
    # Helm chart for PostgreSQL
    - repoURL: https://charts.bitnami.com/bitnami
      chart: postgresql
      targetRevision: 13.2.24
      helm:
        parameters:
          - name: auth.postgresPassword
            value: $postgresPassword
        values: |
          primary:
            persistence:
              size: 100Gi
          metrics:
            enabled: true

    # Kustomize overlay for additional resources
    - repoURL: https://github.com/yourorg/k8s-config
      targetRevision: main
      path: overlays/database/postgresql
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

The Kustomize overlay can add monitoring ServiceMonitors, backup CronJobs, or network policies.

## Multiple Git Repositories

Combine configuration from different repositories:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: multi-repo-app
  namespace: argocd
spec:
  project: default
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  sources:
    # Base configuration from shared repository
    - repoURL: https://github.com/platform-team/base-configs
      targetRevision: main
      path: apps/base
      ref: base

    # Team-specific overrides
    - repoURL: https://github.com/app-team/configs
      targetRevision: main
      path: production
      kustomize:
        patches:
          - target:
              kind: Deployment
            patch: |-
              - op: add
                path: /spec/template/spec/containers/0/resources
                value:
                  requests:
                    cpu: 500m
                    memory: 512Mi
```

## Practical Example: Complete Application Stack

Deploy Grafana with custom dashboards and data sources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: grafana
  namespace: argocd
spec:
  project: monitoring
  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  sources:
    # Official Grafana Helm chart
    - repoURL: https://grafana.github.io/helm-charts
      chart: grafana
      targetRevision: 7.0.8
      helm:
        valueFiles:
          - $config/grafana/values-production.yaml
        parameters:
          - name: adminPassword
            value: $ARGOCD_ENV_ADMIN_PASSWORD

    # Custom configuration repository
    - repoURL: https://github.com/yourorg/monitoring-config
      targetRevision: main
      ref: config

    # Dashboard definitions
    - repoURL: https://github.com/yourorg/grafana-dashboards
      targetRevision: main
      path: dashboards
      directory:
        recurse: true

  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Repository structure for monitoring-config:

```
monitoring-config/
└── grafana/
    ├── values-production.yaml
    └── datasources/
        ├── prometheus.yaml
        └── loki.yaml
```

Repository structure for grafana-dashboards:

```
grafana-dashboards/
└── dashboards/
    ├── application-metrics.json
    ├── infrastructure.json
    └── kubernetes-cluster.json
```

## Referencing Resources Between Sources

Use the `$` syntax to reference files from other sources:

```yaml
sources:
  - repoURL: https://charts.example.com
    chart: myapp
    targetRevision: 1.0.0
    helm:
      valueFiles:
        - $values/base-values.yaml
        - $environment/production/values.yaml
      parameters:
        - name: image.tag
          value: $IMAGE_TAG

  - repoURL: https://github.com/org/values
    targetRevision: main
    ref: values

  - repoURL: https://github.com/org/environments
    targetRevision: main
    ref: environment
```

## Combining OCI Artifacts

Use Helm charts from OCI registries:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-from-oci
  namespace: argocd
spec:
  project: default
  destination:
    server: https://kubernetes.default.svc
    namespace: apps
  sources:
    # Helm chart from OCI registry
    - repoURL: oci://registry.company.com/charts
      chart: myapp
      targetRevision: 2.1.0
      helm:
        valueFiles:
          - $config/values.yaml

    # Configuration from Git
    - repoURL: https://github.com/yourorg/config
      targetRevision: main
      ref: config
```

## Handling Dependencies

When sources depend on each other, order matters:

```yaml
sources:
  # Source 1: CRDs must be applied first
  - repoURL: https://github.com/yourorg/crds
    targetRevision: main
    path: definitions

  # Source 2: Operator depends on CRDs
  - repoURL: https://charts.operator.com
    chart: my-operator
    targetRevision: 1.0.0

  # Source 3: Custom resources depend on operator
  - repoURL: https://github.com/yourorg/resources
    targetRevision: main
    path: custom-resources
```

Use sync waves to control order:

```yaml
# In custom-resources manifests
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "2"
```

## Source-Specific Sync Options

Apply different sync options per source:

```yaml
sources:
  - repoURL: https://charts.cert-manager.io
    chart: cert-manager
    targetRevision: v1.13.0
    helm:
      skipCrds: false  # Install CRDs

  - repoURL: https://github.com/yourorg/config
    targetRevision: main
    path: certificates
    directory:
      recurse: true
      jsonnet: {}
```

## Multi-Environment Strategy

Share base configuration across environments:

```yaml
# Production
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: app-production
spec:
  sources:
    - repoURL: https://github.com/org/apps
      path: base
      ref: base

    - repoURL: https://github.com/org/apps
      path: overlays/production
      kustomize:
        components:
          - $base

    - repoURL: https://github.com/org/secrets
      targetRevision: production
      path: secrets
      ref: secrets
```

## Testing Multi-Source Applications

Preview what will be deployed:

```bash
# Dry run
argocd app diff grafana --local-repo-root .

# Show manifests
argocd app manifests grafana
```

## Monitoring Multi-Source Sync

Check sync status:

```bash
argocd app get grafana

# Output shows status for each source
Name:               grafana
Project:            monitoring
Sources:
  1. Chart: grafana
     RepoURL: https://grafana.github.io/helm-charts
     Status: Synced
  2. Path: dashboards
     RepoURL: https://github.com/yourorg/grafana-dashboards
     Status: Synced
```

## Debugging Multi-Source Issues

Common problems and solutions:

**Reference not resolving:**
```yaml
# Wrong
valueFiles:
  - $wrongref/values.yaml

# Correct - ref must match a source
valueFiles:
  - $config/values.yaml

sources:
  - repoURL: https://...
    ref: config  # Must match $config
```

**Circular dependencies:**
```yaml
# Avoid having sources reference each other in a loop
# ArgoCD will fail to sync
```

**Path not found:**
```bash
# Verify paths exist in the repository
git clone <repoURL>
cd <repo>
git checkout <targetRevision>
ls -la <path>
```

## Best Practices

1. **Name refs clearly**: Use descriptive ref names like `config`, `values`, `dashboards`
2. **Limit source count**: Keep to 2-3 sources for maintainability
3. **Document dependencies**: Explain why multiple sources are needed
4. **Test separately**: Verify each source independently first
5. **Use sync waves**: Control deployment order explicitly
6. **Version everything**: Pin targetRevision for reproducibility
7. **Monitor sync status**: Watch for partial sync failures

## Migration from Single Source

Convert existing single-source application:

```yaml
# Before: Single source
spec:
  source:
    repoURL: https://github.com/org/repo
    path: apps/myapp

# After: Multi-source
spec:
  sources:
    - repoURL: https://github.com/org/repo
      path: apps/myapp
```

The syntax is backward compatible.

## Conclusion

Multi-source applications unlock powerful GitOps patterns. Combine upstream Helm charts with your custom configuration, separate concerns across multiple repositories, and compose applications from multiple sources of truth. This flexibility lets you adopt vendor charts without forking while maintaining environment-specific customizations in your own repositories. Start with simple two-source combinations, then expand to complex multi-source architectures as your needs grow.
