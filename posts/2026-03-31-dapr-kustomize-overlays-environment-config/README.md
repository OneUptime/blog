# How to Use Kustomize Overlays for Dapr Environment Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kustomize, Configuration, Kubernetes, DevOps

Description: Use Kustomize overlays to manage environment-specific Dapr component and configuration files without duplicating base definitions across dev, staging, and production.

---

Kustomize is built into `kubectl` and provides a powerful overlay system that is a natural fit for managing Dapr component files across environments. Instead of duplicating YAML files, you define a base and layer environment-specific patches on top.

## Project Structure

```text
k8s/
  base/
    kustomization.yaml
    statestore.yaml
    pubsub.yaml
    appconfig.yaml
  overlays/
    dev/
      kustomization.yaml
      statestore-patch.yaml
    production/
      kustomization.yaml
      statestore-patch.yaml
      dapr-config-patch.yaml
```

## Define the Base Component

The base defines the component structure that is shared across all environments.

```yaml
# k8s/base/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      value: ""
```

```yaml
# k8s/base/appconfig.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "0"
```

```yaml
# k8s/base/kustomization.yaml
resources:
  - statestore.yaml
  - pubsub.yaml
  - appconfig.yaml
```

## Create an Overlay for Each Environment

Each overlay patches the base to override environment-specific values.

```yaml
# k8s/overlays/production/kustomization.yaml
resources:
  - ../../base
patches:
  - path: statestore-patch.yaml
namespace: production
```

```yaml
# k8s/overlays/production/statestore-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  metadata:
    - name: redisHost
      value: "redis-master.production.svc.cluster.local:6379"
    - name: redisPassword
      secretKeyRef:
        name: redis-secret
        key: password
```

## Apply with kubectl

Apply the overlay directly without generating intermediate files:

```bash
# Apply dev overlay
kubectl apply -k k8s/overlays/dev

# Apply production overlay
kubectl apply -k k8s/overlays/production
```

## Patch the Dapr Configuration CRD

You can also patch the Dapr Configuration CRD to enable tracing in production but not in dev.

```yaml
# k8s/overlays/production/dapr-config-patch.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://jaeger:9411/api/v2/spans"
```

Add it to the overlay kustomization:

```yaml
patches:
  - path: statestore-patch.yaml
  - path: dapr-config-patch.yaml
```

## Use ConfigMapGenerator for Non-Sensitive Values

Kustomize can generate ConfigMaps for non-sensitive configuration values used across multiple components.

```yaml
configMapGenerator:
  - name: dapr-env-config
    literals:
      - ENVIRONMENT=production
      - LOG_LEVEL=info
```

## Preview Before Applying

Use `kubectl kustomize` to preview what will be applied without sending it to the cluster:

```bash
kubectl kustomize k8s/overlays/production
```

## Summary

Kustomize overlays give you a clean, DRY approach to managing Dapr components across environments. By keeping a single base definition and applying environment-specific patches, you reduce duplication and make promotion from dev to production straightforward and auditable.
