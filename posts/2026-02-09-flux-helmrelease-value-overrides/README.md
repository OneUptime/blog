# How to Manage Helm Value Overrides Across Environments Using Flux HelmRelease Patches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, Helm, GitOps, Configuration Management, Kubernetes

Description: Learn how to use Flux HelmRelease resources with strategic merge patches, JSON patches, and values references to manage environment-specific Helm chart configurations without duplicating values files.

---

Helm charts need different configurations per environment. Production runs three replicas while development runs one. Staging uses a test database while production uses RDS. Managing these differences through separate values files creates duplication and drift. Flux HelmRelease patches solve this by letting you define a base configuration and apply targeted overrides per environment.

This guide shows you how to use HelmRelease patches to manage Helm configurations across environments efficiently.

## Understanding HelmRelease Value Management

Flux provides multiple ways to set Helm values. You can inline values directly in the HelmRelease, reference ConfigMaps or Secrets containing values, or use patches to modify the base values. Patches are the most powerful approach because they let you define common values once and override only what differs per environment.

Strategic merge patches merge your overrides with base values, while JSON patches provide precise modifications using JSONPath selectors.

## Creating a Base HelmRelease

Define common configuration shared across environments:

```yaml
# base/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.8.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
      service:
        type: LoadBalancer
      metrics:
        enabled: true
```

## Using Kustomize Patches for Environment Overrides

Create environment-specific overlays:

```yaml
# environments/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- patch: |
    apiVersion: helm.toolkit.fluxcd.io/v2beta1
    kind: HelmRelease
    metadata:
      name: nginx-ingress
    spec:
      values:
        controller:
          replicaCount: 5
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 2Gi
          autoscaling:
            enabled: true
            minReplicas: 5
            maxReplicas: 20
  target:
    kind: HelmRelease
    name: nginx-ingress
```

For development:

```yaml
# environments/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base
patches:
- patch: |
    apiVersion: helm.toolkit.fluxcd.io/v2beta1
    kind: HelmRelease
    metadata:
      name: nginx-ingress
    spec:
      values:
        controller:
          replicaCount: 1
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
          service:
            type: ClusterIP  # No LoadBalancer in dev
  target:
    kind: HelmRelease
    name: nginx-ingress
```

## Using ValuesFrom to Reference ConfigMaps

Store environment values in ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-production-values
  namespace: flux-system
data:
  values.yaml: |
    controller:
      replicaCount: 5
      ingressClass: nginx-prod
      service:
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:us-east-1:xxx
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  valuesFrom:
  - kind: ConfigMap
    name: nginx-production-values
    valuesKey: values.yaml
```

## Managing Secrets with ValuesFrom

Reference secrets for sensitive values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: flux-system
type: Opaque
stringData:
  values.yaml: |
    postgresql:
      auth:
        username: appuser
        password: super-secret-password
        database: production_db
---
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: postgresql
      sourceRef:
        kind: HelmRepository
        name: bitnami
  values:
    primary:
      persistence:
        size: 20Gi
  valuesFrom:
  - kind: Secret
    name: database-credentials
    valuesKey: values.yaml
```

## Combining Multiple Value Sources

Merge values from multiple sources:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: application
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: myapp
      sourceRef:
        kind: HelmRepository
        name: myrepo
  # Base values
  values:
    replicaCount: 2
    image:
      repository: myapp
      tag: v1.0.0
  # Override from ConfigMap
  valuesFrom:
  - kind: ConfigMap
    name: app-config
    valuesKey: values.yaml
  # Override from Secret (highest priority)
  - kind: Secret
    name: app-secrets
    valuesKey: values.yaml
```

Flux merges values in order: inline values, then ConfigMap values, then Secret values.

## Using JSON Patches for Precise Modifications

Apply surgical changes with JSON patches:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      sourceRef:
        kind: HelmRepository
        name: jetstack
  values:
    installCRDs: true
  # JSON patch to add specific configuration
  postRenderers:
  - kustomize:
      patches:
      - target:
          kind: Deployment
          name: cert-manager
        patch: |
          - op: add
            path: /spec/template/spec/containers/0/args/-
            value: --dns01-recursive-nameservers-only
          - op: add
            path: /spec/template/spec/containers/0/args/-
            value: --dns01-recursive-nameservers=8.8.8.8:53,1.1.1.1:53
```

## Overriding Nested Helm Values

Modify deeply nested values:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: prometheus
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
  values:
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
        # Nested configuration
        additionalScrapeConfigs:
        - job_name: custom-app
          kubernetes_sd_configs:
          - role: pod
          relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: myapp
```

## Managing Multi-Cluster Configurations

Use Flux Kustomization per cluster:

```yaml
# clusters/us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base/helmrelease.yaml
patches:
- patch: |
    apiVersion: helm.toolkit.fluxcd.io/v2beta1
    kind: HelmRelease
    metadata:
      name: application
    spec:
      values:
        region: us-east-1
        endpoints:
          api: api.us-east-1.example.com
---
# clusters/eu-west-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- ../../base/helmrelease.yaml
patches:
- patch: |
    apiVersion: helm.toolkit.fluxcd.io/v2beta1
    kind: HelmRelease
    metadata:
      name: application
    spec:
      values:
        region: eu-west-1
        endpoints:
          api: api.eu-west-1.example.com
```

## Implementing Feature Flags with Values

Control features per environment:

```yaml
# Production
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: api-gateway
spec:
  values:
    features:
      newUI: true
      betaAPI: false
      analytics: true
---
# Staging
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: api-gateway
spec:
  values:
    features:
      newUI: true
      betaAPI: true  # Test beta in staging
      analytics: true
```

## Using External Values Files

Reference values from Git:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: application
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: myapp
      sourceRef:
        kind: HelmRepository
        name: myrepo
  valuesFrom:
  - kind: ConfigMap
    name: values-from-git
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: values-from-git
  namespace: flux-system
data:
  values.yaml: |
    # Load this from Git and create ConfigMap
    replicaCount: 3
```

Better approach with Flux Kustomization:

```yaml
# Store values in Git
# environments/production/values.yaml
replicaCount: 5
resources:
  limits:
    cpu: 2000m
    memory: 2Gi

# Reference in HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: app
spec:
  chart:
    spec:
      chart: myapp
  valuesFiles:
  - values.yaml  # From source repository
```

## Validating Values Before Apply

Use HelmRelease test:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: application
spec:
  interval: 30m
  chart:
    spec:
      chart: myapp
  test:
    enable: true
    timeout: 5m
  values:
    # your values
```

Check HelmRelease status:

```bash
flux get helmreleases -A

kubectl describe helmrelease application -n flux-system
```

## Troubleshooting Value Overrides

View rendered values:

```bash
# Get effective values after all overrides
kubectl get helmrelease application -n flux-system -o jsonpath='{.spec.values}'

# Check helm release values in cluster
helm get values application -n flux-system
```

Debug value merge issues:

```bash
# View HelmRelease events
kubectl describe helmrelease application -n flux-system

# Check helm-controller logs
kubectl logs -n flux-system deployment/helm-controller -f
```

## Best Practices

Keep base values minimal with sensible defaults. Override only what differs per environment to reduce duplication.

Use ValuesFrom for sensitive data. Never commit secrets to Git, even if encrypted.

Structure directories by environment (dev/staging/prod) with Kustomize overlays for clean separation.

Test value overrides in development first. Bad values can break deployments.

Document required overrides in comments. Future operators need to understand what can be customized.

Use semantic versioning for chart versions. Pin production to specific versions, allow ranges in development.

Flux HelmRelease patches provide flexible, DRY configuration management for Helm charts across multiple environments while maintaining GitOps principles and reducing configuration duplication.
