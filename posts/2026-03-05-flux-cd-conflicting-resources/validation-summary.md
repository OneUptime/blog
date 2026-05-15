# Validation Summary: How Flux CD Handles Conflicting Resources Across Kustomizations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization custom resources
- Kubernetes server-side apply
- Kubernetes manifests and Kustomize overlays
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize Controller documentation: https://fluxcd.io/flux/components/kustomize/
- Flux controller options documentation: https://fluxcd.io/flux/components/kustomize/options/
- Flux FAQ on moving manifests and pruning: https://fluxcd.io/flux/faq/
- Flux logs command documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Kubernetes server-side apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Flux kustomize-controller source code: https://github.com/fluxcd/kustomize-controller
- Flux server-side apply package source code: https://github.com/fluxcd/pkg/tree/main/ssa

## Issues Found
No technical issues found.

## Review Notes
The post correctly distinguishes Flux Kustomization `spec.force` from Kubernetes server-side apply conflict forcing. Flux documentation describes `spec.force` as replacement for immutable field patch failures, while the Flux SSA implementation uses forced ownership during apply operations. The inventory detection command is consistent with `.status.inventory.entries[*].id`, but users should be aware that Flux stores the API version separately in each inventory entry's `v` field.
