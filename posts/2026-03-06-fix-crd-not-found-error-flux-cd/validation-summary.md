# Validation Summary: How to Fix 'CRD not found' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Flux HelmRelease health checks
- Kubernetes CustomResourceDefinitions
- kubectl
- GitOps deployment ordering

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization v1 API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI documentation for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation for `flux tree kustomization`: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The debugging workflow described `flux tree kustomization my-app -n flux-system` as a way to check the dependency chain. Flux documents this command as printing the resource inventory of a Kustomization, not its `dependsOn` relationship. Changed the step to inspect `.spec.dependsOn` with `kubectl get kustomization -o jsonpath`.

## Review Notes
- The Flux Kustomization examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields including `dependsOn`, `healthChecks`, `timeout`, `retryInterval`, `sourceRef`, `path`, and `prune`.
- The HelmRelease health check example uses the current `helm.toolkit.fluxcd.io/v2` API version.
- The warning about pruning CRDs is accurate because Kubernetes deletes stored custom resources when their CustomResourceDefinition is deleted.
