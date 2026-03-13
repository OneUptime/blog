# How to Manage Shared Helm Values Across Environments in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Helm, Repository Structure, Multi-Environment

Description: Learn how to share common Helm values across environments in Flux while allowing environment-specific overrides using valuesFrom and ConfigMaps.

---

## The Challenge

When deploying the same Helm chart across multiple environments (development, staging, production), most values are shared while only a few differ per environment. Duplicating the entire values file for each environment leads to drift and maintenance overhead. Flux provides several mechanisms to layer Helm values effectively.

## Repository Structure

```
flux-repo/
├── clusters/
│   ├── staging/
│   │   └── apps.yaml
│   └── production/
│       └── apps.yaml
├── helm/
│   ├── repositories/
│   │   └── bitnami.yaml
│   └── releases/
│       └── nginx/
│           ├── base-values.yaml
│           ├── staging-values.yaml
│           └── production-values.yaml
└── apps/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── nginx-release.yaml
    └── production/
        ├── kustomization.yaml
        └── nginx-release.yaml
```

## Approach 1: Using Multiple valuesFiles

Flux HelmRelease supports multiple values sources that are merged in order. Define shared values in a base file and environment-specific overrides in separate files:

```yaml
# helm/releases/nginx/base-values.yaml
replicaCount: 1
image:
  registry: docker.io
  repository: bitnami/nginx
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

```yaml
# helm/releases/nginx/staging-values.yaml
replicaCount: 2
image:
  tag: "1.25-staging"
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 250m
    memory: 256Mi
```

```yaml
# helm/releases/nginx/production-values.yaml
replicaCount: 5
image:
  tag: "1.25.4"
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "2"
    memory: 2Gi
autoscaling:
  enabled: true
  minReplicas: 5
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70
```

## Approach 2: Using valuesFrom with ConfigMaps

Store shared values in a ConfigMap and reference them from the HelmRelease:

```yaml
# apps/staging/shared-values-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-shared-values
  namespace: flux-system
data:
  values.yaml: |
    image:
      registry: docker.io
      repository: bitnami/nginx
      pullPolicy: IfNotPresent
    service:
      type: ClusterIP
      port: 80
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

Then reference it in the HelmRelease:

```yaml
# apps/staging/nginx-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 1h
  chart:
    spec:
      chart: nginx
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  valuesFrom:
    - kind: ConfigMap
      name: nginx-shared-values
      valuesKey: values.yaml
    - kind: ConfigMap
      name: nginx-env-values
      valuesKey: values.yaml
  values:
    replicaCount: 2
```

Values are merged in this order: `valuesFrom` entries (in order), then inline `values`. Later values override earlier ones.

## Approach 3: Using Kustomize to Patch HelmRelease Values

Define a base HelmRelease and use Kustomize patches to override values per environment:

```yaml
# helm/releases/nginx/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 1h
  chart:
    spec:
      chart: nginx
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    replicaCount: 1
    image:
      registry: docker.io
      repository: bitnami/nginx
      pullPolicy: IfNotPresent
    service:
      type: ClusterIP
      port: 80
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
```

Staging overlay patches the values:

```yaml
# apps/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../helm/releases/nginx
patches:
  - target:
      kind: HelmRelease
      name: nginx
    patch: |
      apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      metadata:
        name: nginx
      spec:
        values:
          replicaCount: 2
          image:
            tag: "staging-latest"
```

Production overlay with higher values:

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../helm/releases/nginx
patches:
  - target:
      kind: HelmRelease
      name: nginx
    patch: |
      apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      metadata:
        name: nginx
      spec:
        values:
          replicaCount: 5
          image:
            tag: "v1.25.4"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
```

## Approach 4: Using Flux Variable Substitution

Flux supports post-build variable substitution for injecting environment-specific values:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
    substitute:
      ENVIRONMENT: production
      REPLICA_COUNT: "5"
```

Then use variables in HelmRelease values:

```yaml
# apps/production/nginx-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 1h
  chart:
    spec:
      chart: nginx
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    replicaCount: ${REPLICA_COUNT}
    image:
      tag: ${IMAGE_TAG}
```

## Choosing the Right Approach

- **Multiple valuesFiles**: Best when values differences are substantial and you want clear separation.
- **valuesFrom ConfigMaps**: Best when shared values need to be consumed by multiple HelmReleases.
- **Kustomize patches**: Best when you already use Kustomize overlays and want to keep everything in one pattern.
- **Variable substitution**: Best for simple value differences like replica counts, image tags, and feature flags.

## Conclusion

Flux provides multiple strategies for managing shared Helm values across environments. The right choice depends on the complexity of your configuration differences and your team's preferred workflow. All approaches allow you to maintain a single source of truth for shared configuration while enabling targeted overrides per environment, reducing duplication and configuration drift.
