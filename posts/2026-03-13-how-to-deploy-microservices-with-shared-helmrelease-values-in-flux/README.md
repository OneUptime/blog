# How to Deploy Microservices with Shared HelmRelease Values in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, HelmRelease, Microservices, Helm, ConfigMap

Description: Learn how to share common HelmRelease values across multiple microservices using ConfigMaps in Flux CD to reduce duplication and enforce consistency.

---

## Introduction

When deploying multiple microservices with Helm through Flux CD, you often end up repeating the same values across HelmRelease resources: image pull secrets, resource limits, ingress annotations, monitoring labels, and environment-specific settings. This repetition increases maintenance burden and creates drift when values need updating.

Flux CD's `valuesFrom` field in HelmRelease allows you to source values from ConfigMaps and Secrets. By centralizing shared values in a single ConfigMap, you can update common settings once and have all microservices pick them up on the next reconciliation cycle, without touching individual HelmRelease files.

In this guide you will learn how to structure shared Helm values in a ConfigMap, reference that ConfigMap from multiple HelmRelease resources, and override specific values per service while inheriting common defaults. This pattern keeps your GitOps repository DRY (Don't Repeat Yourself) and consistent.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- A Helm chart repository accessible to Flux
- Basic knowledge of Helm values and Flux HelmRelease

## Step 1: Create a Shared Values ConfigMap

Create a ConfigMap containing values shared across all microservices.

```yaml
# clusters/production/shared/common-helm-values.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: common-helm-values
  namespace: flux-system
data:
  # These key names must match Helm value paths
  values.yaml: |
    # Common resource defaults for all microservices
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

    # Shared image pull secret
    imagePullSecrets:
      - name: registry-credentials

    # Common pod annotations for monitoring
    podAnnotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "9090"
      prometheus.io/path: "/metrics"

    # Common node affinity for production nodes
    nodeSelector:
      node-role: application

    # Common security context
    podSecurityContext:
      runAsNonRoot: true
      runAsUser: 1000
      fsGroup: 2000

    # Common tolerations
    tolerations:
      - key: "application"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

## Step 2: Create a Shared Secrets Reference

Store sensitive shared values (such as database credentials or API keys) in a Secret.

```yaml
# clusters/production/shared/common-helm-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: common-helm-secrets
  namespace: flux-system
type: Opaque
stringData:
  values.yaml: |
    # Shared external secrets (in production, use SOPS or ESO)
    global:
      databaseUrl: "postgresql://db-host:5432/shared"
      redisUrl: "redis://redis-host:6379"
      otelEndpoint: "http://otel-collector:4317"
```

## Step 3: Create the HelmRepository Source

Define the Helm repository containing your microservice charts.

```yaml
# clusters/production/sources/microservices-charts.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: microservices-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://charts.myorg.com/microservices
  secretRef:
    name: chart-repo-credentials
```

## Step 4: Create HelmReleases That Reference Shared Values

Use `valuesFrom` to pull shared values and add service-specific overrides inline.

```yaml
# clusters/production/apps/backend-api-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: backend-api
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: microservices
  chart:
    spec:
      chart: microservice
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: microservices-charts
  # Pull shared values first (lower priority)
  valuesFrom:
    - kind: ConfigMap
      name: common-helm-values
      valuesKey: values.yaml
    - kind: Secret
      name: common-helm-secrets
      valuesKey: values.yaml
      optional: true
  # Service-specific overrides (higher priority, overrides shared values)
  values:
    image:
      repository: myregistry/backend-api
      tag: "1.2.3"
    replicaCount: 3
    service:
      port: 8080
    ingress:
      enabled: true
      host: api.myorg.com
    # Override shared resource limits for this service
    resources:
      limits:
        cpu: 1000m
        memory: 1Gi
```

```yaml
# clusters/production/apps/auth-service-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: auth-service
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: microservices
  chart:
    spec:
      chart: microservice
      version: ">=1.0.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: microservices-charts
  # Same shared values ConfigMap
  valuesFrom:
    - kind: ConfigMap
      name: common-helm-values
      valuesKey: values.yaml
    - kind: Secret
      name: common-helm-secrets
      valuesKey: values.yaml
      optional: true
  # Auth-specific overrides
  values:
    image:
      repository: myregistry/auth-service
      tag: "2.0.1"
    replicaCount: 2
    service:
      port: 9090
    env:
      - name: JWT_SECRET_KEY
        valueFrom:
          secretKeyRef:
            name: auth-secrets
            key: jwt-secret
```

## Step 5: Update Shared Values and Verify Propagation

When you update the shared ConfigMap, all HelmReleases pick up the change on their next reconciliation.

```bash
# Update the shared ConfigMap (e.g., increase memory limits)
kubectl edit configmap common-helm-values -n flux-system

# Or apply an updated version from Git
kubectl apply -f clusters/production/shared/common-helm-values.yaml

# Force immediate reconciliation of all services
flux reconcile helmrelease backend-api
flux reconcile helmrelease auth-service

# Verify the values were applied
helm get values backend-api -n microservices
helm get values auth-service -n microservices
```

## Step 6: Verify Priority Order of Values

Flux merges values in order: `valuesFrom` entries are merged first (later entries override earlier ones), then inline `values` override everything.

```bash
# Check effective values for a HelmRelease
helm get values backend-api -n microservices --all

# View the HelmRelease status to confirm reconciliation
flux get helmrelease backend-api

# Describe the HelmRelease for detailed event log
kubectl describe helmrelease backend-api -n flux-system
```

## Best Practices

- Always list the shared ConfigMap before the shared Secret in `valuesFrom` so secrets can override ConfigMap values
- Keep inline `values` in each HelmRelease minimal — only service-specific settings
- Use SOPS or External Secrets Operator for the shared Secret in production environments
- Version your shared ConfigMap using labels to track changes
- Test that your shared values are valid Helm values by running `helm template` locally
- Avoid putting environment-specific values in the shared ConfigMap; use environment-specific overlays instead

## Conclusion

Sharing HelmRelease values through ConfigMaps in Flux CD eliminates repetition across microservice deployments and enforces consistency. When a common setting changes, such as resource limits or monitoring annotations, you update it in one place and Flux propagates it to all services. Combining shared `valuesFrom` with per-service inline `values` overrides gives you a flexible, maintainable pattern for managing Helm-based microservice deployments at scale.
