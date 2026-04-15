# Validation Summary: How to Manage Dapr Configuration with Kustomize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Components and Configuration CRDs)
- Kustomize (overlays, patches, commonLabels)
- Kubernetes (kubectl, namespaces, CRDs)
- ArgoCD (Application resource, automated sync)
- Redis (as Dapr state store)

## Sources Consulted
- Dapr Component spec documentation: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Configuration spec documentation: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Redis state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Kustomize documentation on patches: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kustomize Strategic Merge Patch vs JSON Merge Patch behavior for CRDs: https://kubectl.docs.kubernetes.io/references/kustomize/glossary/#patchstrategicmerge
- JSON Merge Patch RFC 7386: https://datatracker.ietf.org/doc/html/rfc7386
- ArgoCD Application spec documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/

## Issues Found

### 1. Statestore patches missing metadata entries (Critical)

**What was wrong:** The dev and prod overlay patches for the statestore Component only included the metadata entries being changed (e.g., `redisHost`), omitting `actorStateStore` from the base. Since Dapr Components are CRDs, Kustomize falls back to JSON Merge Patch semantics rather than Strategic Merge Patch. Under JSON Merge Patch (RFC 7386), arrays are replaced entirely rather than merged element-by-element. This means the `actorStateStore: "true"` entry from the base would be silently dropped after patching.

**What was changed:**
- `overlays/dev/statestore-patch.yaml`: Added `actorStateStore: "true"` to the metadata list so it is preserved after the array replacement.
- `overlays/prod/statestore-patch.yaml`: Added `actorStateStore: "true"` to the metadata list for the same reason.

**Why:** Without this fix, applying the dev or prod overlay would produce a statestore Component missing the `actorStateStore` configuration, which could break Dapr actor functionality.

### 2. Misleading "strategic merge patch" claim in summary (Minor)

**What was wrong:** The summary stated "The strategic merge patch approach lets you update just the fields that differ per environment" which is inaccurate for CRD array fields. Kustomize does not use Strategic Merge Patch for CRDs — it uses JSON Merge Patch, which replaces arrays entirely.

**What was changed:** Updated the summary to clarify that Kustomize uses JSON Merge Patch for CRDs, array fields are replaced (not merged), and each overlay must include all desired metadata entries.

## Review Notes
- The Dapr Component and Configuration YAML structures (`apiVersion: dapr.io/v1alpha1`, field names, value formats) are all correct and current.
- The Kustomize file structures (`apiVersion: kustomize.config.k8s.io/v1beta1`, `resources`, `patches`, `namespace`, `commonLabels`) are all correct.
- The `kubectl` commands (`kustomize`, `apply -k`, `get components`, `get configurations`) are correct.
- The ArgoCD Application manifest is correctly structured with proper `syncPolicy` settings.
- The `spec.metric.enabled` field in the Dapr Configuration uses the correct singular form (`metric`, not `metrics`).
- The `commonLabels` field in the prod overlay is safe for Dapr CRDs since they have no selector fields that Kustomize would also modify.
- The Dapr Configuration patch (`dapr-config-patch.yaml`) works correctly because `spec.tracing` is an object (not an array), so JSON Merge Patch properly merges its fields.
