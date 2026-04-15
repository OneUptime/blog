# Validation Summary: How to Create Dapr Component Templates for Your Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — Component CRD specification
- Helm (chart templating and deployment)
- Kustomize (base/overlay patching)
- Kubernetes (kubectl, namespaces)
- Redis (as example state store backend)
- kubeval (YAML validation)

## Sources Consulted
- Dapr Component specification and CRD schema — https://docs.dapr.io/reference/components-reference/
- Dapr Redis state store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr component scopes documentation — https://docs.dapr.io/operations/components/component-scopes/
- Helm template function documentation — https://helm.sh/docs/chart_template_guide/
- Kustomize strategic merge patch documentation — https://kubectl.docs.kubernetes.io/references/kustomize/

## Issues Found
1. **`scopes` field placement (3 locations)**: In the Dapr Component CRD, `scopes` is a top-level field (sibling of `spec`), not a child of `spec`. The post incorrectly nested `scopes` under `spec` in three places:
   - The "Why Templates Matter" section (Team B's correct pattern example) — moved `scopes` from under `spec` to the top level.
   - The Helm template (`templates/statestore.yaml`) — moved the `scopes` block outside `spec` and adjusted `nindent` from 4 to 2 to match the new indentation level.
   - The Kustomize patch (`overlays/team-payments/statestore-patch.yaml`) — moved `scopes` from under `spec` to the top level.

## Review Notes
- The post references `kubeval` for YAML validation. While still functional, `kubeval` is no longer actively maintained; `kubeconform` is its recommended successor. This is not an error but worth noting for future updates.
- The Kustomize strategic merge patch example replaces the entire `spec.metadata` list rather than merging individual entries. This is expected behavior for CRD list fields but could surprise readers who expect individual list items to be merged. The post does not make incorrect claims here, but a future revision could add a note about this behavior.
- All Helm template syntax (`{{ .Values.* }}`, `{{- if }}`, `toYaml`, `nindent`, `.Release.Namespace`) is correct.
- All CLI commands (`helm upgrade --install`, `helm template`, `helm repo add`, `kubectl apply -k`) use correct flags and syntax.
- The Redis state store metadata fields (`redisHost`, `redisPassword`, `enableTLS`) and component type (`state.redis`) are correct per current Dapr documentation.
