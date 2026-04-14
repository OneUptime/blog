# Validation Summary: How to Use Kustomize Overlays for Dapr Environment Config

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Component and Configuration CRDs)
- Kustomize (overlays, patches, ConfigMapGenerator)
- Kubernetes (kubectl apply -k)
- Redis (as Dapr state store)

## Sources Consulted
- Kustomize official documentation — patches field specification (https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/)
- Dapr Component CRD reference (https://docs.dapr.io/reference/resource-specs/component-schema/)
- Dapr Configuration CRD reference (https://docs.dapr.io/reference/resource-specs/configuration-schema/)
- Dapr Redis state store documentation (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr component secrets reference (https://docs.dapr.io/operations/components/component-secrets/)
- Dapr tracing configuration (https://docs.dapr.io/operations/configuration/configuration-overview/)

## Issues Found

### 1. Incorrect `patches` field syntax (bare strings instead of `path:` objects)
- **What was wrong:** The `patches` field in kustomization.yaml used bare strings (e.g., `- statestore-patch.yaml`), which is the syntax for the deprecated `patchesStrategicMerge` field. The current `patches` field requires entries with `path:` keys (e.g., `- path: statestore-patch.yaml`).
- **What was changed:** Updated all `patches` entries to use `- path: <filename>` syntax.
- **Why:** Using bare strings in the `patches` field is invalid and would cause a Kustomize parsing error. The deprecated `patchesStrategicMerge` accepts bare strings, but the post correctly uses the newer `patches` field and should use its proper syntax.

### 2. Missing base Configuration resource for dapr-config-patch.yaml
- **What was wrong:** The post showed a `dapr-config-patch.yaml` that patches a Dapr `Configuration` resource (kind: Configuration, name: appconfig), but no such resource existed in the base. Kustomize requires a matching target resource for patches — without one, it errors with "no matches for patches."
- **What was changed:** Added a base `appconfig.yaml` Configuration resource with tracing disabled (`samplingRate: "0"`), added it to the base `kustomization.yaml` resources list, and updated the project structure to include `appconfig.yaml` in the base directory and `dapr-config-patch.yaml` in the production overlay.
- **Why:** The production patch enables tracing (`samplingRate: "1"` with a Zipkin/Jaeger endpoint), which only works if there's a base Configuration resource to patch against. The base sets `samplingRate: "0"` (tracing off by default), making the overlay pattern coherent.

## Review Notes
- All Dapr-specific claims are accurate: `apiVersion: dapr.io/v1alpha1`, `state.redis` component type, `redisHost`/`redisPassword` metadata fields, `secretKeyRef` syntax, and tracing configuration structure all match official Dapr documentation.
- Strategic merge patches on CRD list fields (like `spec.metadata` in Dapr Components) replace the entire list rather than merging individual items, since Kustomize doesn't know the merge key for CRD fields. The patch in the post includes all needed metadata items, so this works correctly, but users extending the example should be aware of this behavior.
- The `kubectl apply -k` and `kubectl kustomize` commands are correct.
- The ConfigMapGenerator syntax is correct.
