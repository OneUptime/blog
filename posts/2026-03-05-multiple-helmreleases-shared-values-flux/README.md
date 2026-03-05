# How to Manage Multiple HelmReleases with Shared Values in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Shared Values, ConfigMap, Kustomize

Description: Learn how to share common Helm values across multiple HelmRelease resources in Flux using ConfigMaps, Secrets, and Kustomize post-build variable substitution.

---

When managing multiple HelmRelease resources in a Flux-based GitOps workflow, you often find yourself repeating the same values across releases. Common settings like image pull secrets, monitoring labels, resource limits, or domain names may be identical for every service. Flux provides several mechanisms to share values across multiple HelmReleases, reducing duplication and making bulk changes easier.

## The Problem with Duplicated Values

Consider a scenario where you have ten microservices, each deployed via a separate HelmRelease. Every service needs the same image pull secret, the same monitoring annotations, and the same resource defaults. Without a sharing mechanism, changing a single shared value requires editing ten files.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Familiarity with HelmRelease, ConfigMap, and Kustomize basics

## Method 1: ValuesFrom with ConfigMaps

The most direct way to share values is through the `valuesFrom` field on HelmRelease, which can reference ConfigMaps or Secrets. Create a ConfigMap containing shared Helm values, then reference it from multiple HelmReleases.

First, create a ConfigMap with shared values:

```yaml
# shared-values-configmap.yaml - Common values shared across all app HelmReleases
apiVersion: v1
kind: ConfigMap
metadata:
  name: shared-helm-values
  namespace: apps
data:
  values.yaml: |
    # Shared image pull configuration
    global:
      imagePullSecrets:
        - name: registry-credentials
    # Standard resource defaults
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Common pod annotations for monitoring
    podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "8080"
    # Shared tolerations
    tolerations:
      - key: "workload"
        operator: "Equal"
        value: "apps"
        effect: "NoSchedule"
```

Now reference this ConfigMap from multiple HelmReleases. Here is the first service:

```yaml
# helmrelease-service-a.yaml - Service A using shared values from ConfigMap
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: service-a
  namespace: apps
spec:
  interval: 10m
  chart:
    spec:
      chart: ./charts/generic-app
      sourceRef:
        kind: GitRepository
        name: platform-charts
        namespace: flux-system
      interval: 10m
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  # Pull shared values from the ConfigMap first, then override with inline values
  valuesFrom:
    - kind: ConfigMap
      name: shared-helm-values
      # The key in the ConfigMap containing the YAML values
      valuesKey: values.yaml
  # Inline values override and extend the shared values
  values:
    appName: service-a
    image:
      repository: your-registry.io/service-a
      tag: "v1.2.0"
    replicaCount: 2
    containerPort: 8080
```

Here is a second service referencing the same shared ConfigMap:

```yaml
# helmrelease-service-b.yaml - Service B using the same shared values
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: service-b
  namespace: apps
spec:
  interval: 10m
  chart:
    spec:
      chart: ./charts/generic-app
      sourceRef:
        kind: GitRepository
        name: platform-charts
        namespace: flux-system
      interval: 10m
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  valuesFrom:
    - kind: ConfigMap
      name: shared-helm-values
      valuesKey: values.yaml
  values:
    appName: service-b
    image:
      repository: your-registry.io/service-b
      tag: "v3.0.1"
    replicaCount: 3
    containerPort: 9090
```

The merge order is important: values from `valuesFrom` are applied first, then inline `values` override them. This lets each service customize its own settings while inheriting shared defaults.

## Method 2: ValuesFrom with Secrets

For sensitive shared values like database credentials or API keys, use a Secret instead of a ConfigMap.

```yaml
# shared-secrets.yaml - Shared sensitive values stored in a Secret
apiVersion: v1
kind: Secret
metadata:
  name: shared-helm-secrets
  namespace: apps
type: Opaque
stringData:
  values.yaml: |
    database:
      host: "postgres.database.svc.cluster.local"
      port: 5432
      username: "app_user"
      password: "supersecretpassword"
    redis:
      host: "redis.cache.svc.cluster.local"
      port: 6379
```

Reference both the ConfigMap and Secret in a HelmRelease:

```yaml
# helmrelease-with-shared-secrets.yaml - Combining shared ConfigMap and Secret values
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: service-c
  namespace: apps
spec:
  interval: 10m
  chart:
    spec:
      chart: ./charts/generic-app
      sourceRef:
        kind: GitRepository
        name: platform-charts
        namespace: flux-system
      interval: 10m
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  # Multiple valuesFrom sources are merged in order
  valuesFrom:
    - kind: ConfigMap
      name: shared-helm-values
      valuesKey: values.yaml
    - kind: Secret
      name: shared-helm-secrets
      valuesKey: values.yaml
  values:
    appName: service-c
    image:
      repository: your-registry.io/service-c
      tag: "v2.0.0"
```

## Method 3: Kustomize Post-Build Variable Substitution

Flux supports Kustomize post-build variable substitution, which lets you inject variables into your HelmRelease manifests before they are applied. This is useful for environment-specific values like domain names or cluster names.

Define variables in your Kustomization resource:

```yaml
# kustomization.yaml - Flux Kustomization with variable substitution
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/apps
  prune: true
  # Post-build variable substitution
  postBuild:
    substitute:
      CLUSTER_DOMAIN: "example.com"
      ENVIRONMENT: "production"
      DEFAULT_REPLICAS: "2"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-variables
```

Then use these variables in your HelmRelease manifests:

```yaml
# helmrelease-with-vars.yaml - HelmRelease using Kustomize variable substitution
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: service-d
  namespace: apps
spec:
  interval: 10m
  chart:
    spec:
      chart: ./charts/generic-app
      sourceRef:
        kind: GitRepository
        name: platform-charts
        namespace: flux-system
      interval: 10m
  values:
    appName: service-d
    replicaCount: ${DEFAULT_REPLICAS}
    ingress:
      enabled: true
      host: "service-d.${CLUSTER_DOMAIN}"
    env:
      - name: ENVIRONMENT
        value: "${ENVIRONMENT}"
```

## Choosing the Right Method

Use `valuesFrom` with ConfigMaps for non-sensitive shared Helm values that multiple releases need. Use `valuesFrom` with Secrets for sensitive shared values. Use Kustomize variable substitution for environment-specific values that change between clusters (like domain names, cluster names, or environment labels). These methods can be combined for maximum flexibility.

## Verifying Shared Values

Check that shared values are correctly merged into your HelmReleases:

```bash
# Inspect the rendered values for a specific HelmRelease
kubectl get helmrelease service-a -n apps -o jsonpath='{.status.lastAppliedRevision}'

# Check the actual Helm release values
helm get values service-a -n apps

# Verify all HelmReleases are healthy
flux get helmrelease --all-namespaces
```

## Summary

Managing shared values across multiple HelmReleases in Flux eliminates duplication and makes bulk changes straightforward. By leveraging `valuesFrom` with ConfigMaps and Secrets, combined with Kustomize post-build variable substitution, you can build a scalable GitOps workflow where common configuration is defined once and consumed by many services.
