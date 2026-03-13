# How to Use Optional ConfigMap References in Flux Kustomization Substitution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, gitops, kubernetes, kustomization, configmap, substitution, optional

Description: Learn how to use the optional flag for ConfigMap references in Flux post-build substitution so that missing ConfigMaps do not block reconciliation.

---

## Introduction

When using `substituteFrom` in a Flux Kustomization, you reference ConfigMaps that contain variable values. By default, if a referenced ConfigMap does not exist, the Kustomization will fail to reconcile with a substitution error. In some scenarios, you want a ConfigMap reference to be optional, meaning if the ConfigMap is not present, Flux should continue with whatever variables are available from other sources. Flux supports this through the `optional` field on `substituteFrom` entries.

## Prerequisites

- Flux CD v2.0 or later installed on your cluster
- A Git repository configured as a GitRepository source
- kubectl access to your cluster
- Basic understanding of Flux Kustomization post-build substitution

## The Problem: Missing ConfigMaps Block Reconciliation

Consider a Kustomization that references a ConfigMap for additional overrides:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: ConfigMap
        name: team-overrides
```

If `team-overrides` does not exist on the cluster, the entire Kustomization fails with an error like:

```
SubstitutionFailed: configmaps "team-overrides" not found
```

This blocks the deployment even though the base variables in `cluster-config` might be sufficient.

## Making ConfigMap References Optional

Add the `optional: true` field to any `substituteFrom` entry that you want to be non-blocking:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: ConfigMap
        name: team-overrides
        optional: true
```

With this configuration, if `team-overrides` does not exist, Flux skips it and proceeds with the variables from `cluster-config` only. If `team-overrides` is later created, Flux will pick up its values on the next reconciliation.

## Use Case: Layered Configuration

Optional ConfigMaps work well in a layered configuration pattern where you have mandatory base settings and optional override layers:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: global-defaults        # Required - has all default values
      - kind: ConfigMap
        name: cluster-config          # Required - cluster-specific values
      - kind: ConfigMap
        name: namespace-overrides     # Optional - namespace-level tweaks
        optional: true
      - kind: ConfigMap
        name: emergency-overrides     # Optional - temporary emergency values
        optional: true
```

In this setup:
- `global-defaults` and `cluster-config` must exist or the Kustomization fails
- `namespace-overrides` and `emergency-overrides` are optional layers that can be created when needed

## Use Case: Progressive Feature Rollout

Optional ConfigMaps enable progressive rollout of new features. Create a feature flags ConfigMap only on clusters where you want the feature enabled:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: flux-system
data:
  ENABLE_NEW_UI: "true"
  NEW_API_VERSION: "v2"
```

Reference it as optional in the Kustomization:

```yaml
postBuild:
  substitute:
    ENABLE_NEW_UI: "false"
    NEW_API_VERSION: "v1"
  substituteFrom:
    - kind: ConfigMap
      name: feature-flags
      optional: true
```

On clusters without the `feature-flags` ConfigMap, the inline default values are used. On clusters where you create the ConfigMap, its values override the defaults.

## Use Case: Team-Specific Customization

In multi-tenant clusters, different teams may need to customize shared applications. Each team can have an optional ConfigMap:

```yaml
postBuild:
  substituteFrom:
    - kind: ConfigMap
      name: app-defaults
    - kind: ConfigMap
      name: team-alpha-config
      optional: true
    - kind: ConfigMap
      name: team-beta-config
      optional: true
```

Only the ConfigMap for the relevant team needs to exist on a given cluster.

## Combining Optional ConfigMaps with Inline Defaults

A robust pattern is to define sensible defaults inline and use optional ConfigMaps for overrides:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      REPLICAS: "2"
      LOG_LEVEL: "info"
      CACHE_TTL: "300"
      RATE_LIMIT: "100"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-overrides
        optional: true
```

This guarantees all variables have values even if no ConfigMap exists. When a cluster needs different values, create the ConfigMap with only the variables you want to override.

## Precedence with Optional ConfigMaps

The precedence rules still apply with optional ConfigMaps:

1. Inline `substitute` values have the highest priority
2. Earlier `substituteFrom` entries override later ones
3. Optional entries that do not exist are simply skipped

```yaml
postBuild:
  substitute:
    VAR_A: "inline"           # Highest priority
  substituteFrom:
    - kind: ConfigMap
      name: primary           # Second priority
    - kind: ConfigMap
      name: secondary         # Third priority
      optional: true
    - kind: ConfigMap
      name: fallback          # Lowest priority
      optional: true
```

## Verifying Optional ConfigMap Behavior

Check which ConfigMaps exist:

```bash
kubectl get configmap -n flux-system -l app.kubernetes.io/managed-by=flux
```

Check the Kustomization status to see if optional ConfigMaps were found:

```bash
flux get kustomization my-app
kubectl get kustomization my-app -n flux-system -o yaml
```

The Kustomization status will show successful reconciliation even when optional ConfigMaps are missing. No warning is generated for missing optional references.

## Conclusion

The `optional: true` field on `substituteFrom` entries is a simple but powerful feature that enables flexible configuration patterns. It allows you to create layered configurations where base values are always available and additional overrides can be applied on demand. This is particularly useful for progressive feature rollouts, team-specific customization, and emergency overrides. By combining optional ConfigMaps with inline default values, you can build resilient Kustomization configurations that work correctly even when some configuration sources are not yet present.
