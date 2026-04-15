# How to Manage Dapr Configuration with Kustomize

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kustomize, Kubernetes, GitOps, Configuration

Description: Use Kustomize overlays to manage Dapr component configurations across dev, staging, and production environments without duplicating YAML manifests.

---

## Why Kustomize for Dapr Configuration?

Kustomize enables environment-specific customization of Kubernetes manifests without templating. For Dapr, this means you can define base component configurations and override specific fields (like Redis hostnames or replica counts) per environment - keeping your manifests DRY and version-controlled.

## Project Structure

```text
dapr-config/
  base/
    kustomization.yaml
    statestore.yaml
    pubsub.yaml
    dapr-config.yaml
  overlays/
    dev/
      kustomization.yaml
      statestore-patch.yaml
    staging/
      kustomization.yaml
      statestore-patch.yaml
    prod/
      kustomization.yaml
      statestore-patch.yaml
      dapr-config-patch.yaml
```

## Base Configuration

`base/statestore.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: redis:6379
    - name: actorStateStore
      value: "true"
```

`base/dapr-config.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "0"
  metric:
    enabled: true
```

`base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - statestore.yaml
  - pubsub.yaml
  - dapr-config.yaml
```

## Dev Overlay

`overlays/dev/statestore-patch.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
    - name: redisHost
      value: redis-dev.dev.svc.cluster.local:6379
    - name: actorStateStore
      value: "true"
```

`overlays/dev/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: dev
resources:
  - ../../base
patches:
  - path: statestore-patch.yaml
```

## Production Overlay

`overlays/prod/statestore-patch.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
    - name: redisHost
      value: redis-prod.prod.svc.cluster.local:6379
    - name: enableTLS
      value: "true"
    - name: actorStateStore
      value: "true"
```

`overlays/prod/dapr-config-patch.yaml` (enable full tracing in prod):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin.monitoring:9411/api/v2/spans
```

`overlays/prod/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: prod
resources:
  - ../../base
patches:
  - path: statestore-patch.yaml
  - path: dapr-config-patch.yaml
commonLabels:
  environment: production
```

## Applying Configurations

```bash
# Preview dev configuration
kubectl kustomize overlays/dev

# Apply dev components
kubectl apply -k overlays/dev

# Apply prod components
kubectl apply -k overlays/prod

# Verify
kubectl get components -n prod
kubectl get configurations -n prod
```

## ArgoCD Integration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: dapr-config-prod
spec:
  source:
    repoURL: https://github.com/myorg/dapr-config
    path: overlays/prod
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Summary

Kustomize overlays are an ideal fit for Dapr configuration management, providing environment-specific overrides without duplication. Note that Kustomize uses JSON Merge Patch semantics for CRDs like Dapr Components, which means array fields (such as `spec.metadata`) are replaced entirely rather than merged. Each overlay patch must include all desired metadata entries, not just the ones being changed. Scalar and object fields - like tracing configuration - are merged as expected, so you can share the bulk of your component definitions across all environments in a GitOps-friendly structure.
