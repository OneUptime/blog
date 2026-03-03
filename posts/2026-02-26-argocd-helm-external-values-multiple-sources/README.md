# How to Combine Helm Chart with External Values File Using Multiple Sources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Multi-Source

Description: Learn how to deploy Helm charts in ArgoCD with values files stored in a separate Git repository using the multi-source ref mechanism for clean configuration separation.

---

One of the most common ArgoCD multi-source patterns is deploying a Helm chart from a chart repository while pulling the values file from a separate Git repository. This separation keeps your environment-specific configuration in version control while consuming upstream charts without forking them. ArgoCD's `ref` mechanism makes this connection seamless.

## Why Separate Values from Charts

When you deploy a third-party Helm chart (like nginx-ingress, cert-manager, or Prometheus), you typically want to:

- Use the official chart from the vendor's repository
- Store your custom values in your own Git repository
- Version control your configuration changes independently from chart upgrades
- Review values changes through pull requests before they reach the cluster

Without multi-source, you would either inline all values in the ArgoCD Application spec (messy for large configurations) or fork the chart just to include your values file (maintenance burden).

## Basic Pattern: Chart + External Values

Here is the fundamental pattern:

```yaml
# prometheus-app.yaml - Helm chart with external values file
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus
  namespace: argocd
spec:
  project: default
  sources:
    # Source 1: The Helm chart from its official repository
    - repoURL: https://prometheus-community.github.io/helm-charts
      chart: kube-prometheus-stack
      targetRevision: 56.6.2
      helm:
        releaseName: prometheus
        # Reference values file from the second source
        valueFiles:
          - $values/monitoring/prometheus/values.yaml

    # Source 2: Your Git repo containing values files
    - repoURL: https://github.com/your-org/helm-values.git
      targetRevision: main
      ref: values  # This creates the $values reference

  destination:
    server: https://kubernetes.default.svc
    namespace: monitoring
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

The key connection is:
1. The second source has `ref: values` which makes it available as `$values`
2. The first source references `$values/monitoring/prometheus/values.yaml` in its `valueFiles`
3. The path after `$values/` is relative to the root of the referenced Git repository

## Values Repository Structure

Organize your values repository to mirror your deployment structure:

```text
helm-values/
  monitoring/
    prometheus/
      values.yaml
      values-staging.yaml
      values-production.yaml
    grafana/
      values.yaml
  ingress/
    nginx/
      values.yaml
      values-internal.yaml
  security/
    cert-manager/
      values.yaml
    external-secrets/
      values.yaml
```

A typical values file:

```yaml
# monitoring/prometheus/values.yaml
prometheus:
  prometheusSpec:
    replicas: 2
    retention: 30d
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi

alertmanager:
  alertmanagerSpec:
    replicas: 2
    resources:
      requests:
        cpu: 100m
        memory: 128Mi

grafana:
  enabled: true
  adminPassword: ""  # Managed by external-secrets
  ingress:
    enabled: true
    hosts:
      - grafana.example.com
    tls:
      - secretName: grafana-tls
        hosts:
          - grafana.example.com
```

## Multiple Values Files from the Same Ref

You can reference multiple values files from the same source. ArgoCD merges them in order, with later files overriding earlier ones:

```yaml
sources:
  - repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 56.6.2
    helm:
      releaseName: prometheus
      valueFiles:
        # Base values applied first
        - $values/monitoring/prometheus/values-base.yaml
        # Environment-specific overrides applied second
        - $values/monitoring/prometheus/values-production.yaml
        # Cluster-specific overrides applied last
        - $values/monitoring/prometheus/values-us-east-1.yaml

  - repoURL: https://github.com/your-org/helm-values.git
    targetRevision: main
    ref: values
```

The merge order is important. If `values-base.yaml` sets `replicas: 1` and `values-production.yaml` sets `replicas: 3`, the result is `replicas: 3`.

## Combining External Values with Inline Values

You can use both external values files and inline values in the same source. Inline values override file values:

```yaml
sources:
  - repoURL: https://prometheus-community.github.io/helm-charts
    chart: kube-prometheus-stack
    targetRevision: 56.6.2
    helm:
      releaseName: prometheus
      # Values files applied first
      valueFiles:
        - $values/monitoring/prometheus/values.yaml
      # Inline values override file values
      valuesObject:
        grafana:
          adminPassword: override-for-testing
        prometheus:
          prometheusSpec:
            replicas: 1  # Override for dev environment

  - repoURL: https://github.com/your-org/helm-values.git
    targetRevision: main
    ref: values
```

The priority order (lowest to highest) is:
1. Chart default values
2. Values files (in the order listed)
3. Inline `valuesObject` / `values`
4. Individual `parameters`

## Multi-Environment Pattern

Use the same chart and values repo for multiple environments by varying the values file path and target revision:

```yaml
# staging-prometheus.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-staging
  namespace: argocd
spec:
  sources:
    - repoURL: https://prometheus-community.github.io/helm-charts
      chart: kube-prometheus-stack
      targetRevision: 56.6.2  # Same chart version across environments
      helm:
        releaseName: prometheus
        valueFiles:
          - $values/monitoring/prometheus/values-base.yaml
          - $values/monitoring/prometheus/values-staging.yaml

    - repoURL: https://github.com/your-org/helm-values.git
      targetRevision: main  # Staging tracks main branch
      ref: values
  destination:
    server: https://staging-cluster.example.com
    namespace: monitoring
```

```yaml
# production-prometheus.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: prometheus-production
  namespace: argocd
spec:
  sources:
    - repoURL: https://prometheus-community.github.io/helm-charts
      chart: kube-prometheus-stack
      targetRevision: 56.6.2
      helm:
        releaseName: prometheus
        valueFiles:
          - $values/monitoring/prometheus/values-base.yaml
          - $values/monitoring/prometheus/values-production.yaml

    - repoURL: https://github.com/your-org/helm-values.git
      targetRevision: release  # Production tracks release branch
      ref: values
  destination:
    server: https://production-cluster.example.com
    namespace: monitoring
```

## Using ApplicationSets for Scalability

When you have many charts with external values, ApplicationSets reduce boilerplate:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: helm-apps
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - name: prometheus
            chart: kube-prometheus-stack
            repo: https://prometheus-community.github.io/helm-charts
            version: 56.6.2
            valuesPath: monitoring/prometheus
          - name: cert-manager
            chart: cert-manager
            repo: https://charts.jetstack.io
            version: 1.14.2
            valuesPath: security/cert-manager
          - name: nginx-ingress
            chart: ingress-nginx
            repo: https://kubernetes.github.io/ingress-nginx
            version: 4.9.0
            valuesPath: ingress/nginx
  template:
    metadata:
      name: '{{name}}'
    spec:
      project: default
      sources:
        - repoURL: '{{repo}}'
          chart: '{{chart}}'
          targetRevision: '{{version}}'
          helm:
            releaseName: '{{name}}'
            valueFiles:
              - '$values/{{valuesPath}}/values.yaml'
        - repoURL: https://github.com/your-org/helm-values.git
          targetRevision: main
          ref: values
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{name}}'
```

## Debugging Values File Issues

When values are not applied as expected:

```bash
# View the rendered Helm output to verify values
argocd app manifests prometheus

# Check that the values file exists in the referenced repo
git clone https://github.com/your-org/helm-values.git
ls helm-values/monitoring/prometheus/values.yaml

# Test Helm rendering locally with the same values
helm template prometheus prometheus-community/kube-prometheus-stack \
  --version 56.6.2 \
  -f helm-values/monitoring/prometheus/values.yaml

# Check for YAML syntax errors in values files
python3 -c "import yaml; yaml.safe_load(open('values.yaml'))"
```

Common issues include:
- **Wrong path in valueFiles** - The path must be relative to the root of the referenced repo
- **Missing ref** - Forgetting to add `ref: values` on the source
- **Wrong ref name** - The ref name in the source must match the `$name` in valueFiles
- **Branch mismatch** - The values file might not exist on the branch specified in `targetRevision`

## Best Practices

**Keep one values repo** - Use a single repository for all your Helm values rather than scattering them across many repos.

**Pin chart versions** - Always specify explicit chart versions in `targetRevision`, never use `*` or floating references.

**Use a consistent directory structure** - Mirror your chart names in the values repo for easy navigation.

**Review values changes separately** - Since values and charts live in different repos, changes to each can be reviewed independently.

For more on multi-source patterns, see our guide on [using multiple sources for a single ArgoCD application](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-sources-single-application/view) and [remote Helm values with multiple sources](https://oneuptime.com/blog/post/2026-02-26-argocd-remote-helm-values-multiple-sources/view).
