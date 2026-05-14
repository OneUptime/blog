# Validation Summary: How to Configure Kustomization Apply Order in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller
- Flux Kustomization API
- Kustomize
- Kubernetes manifests and server-side apply
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux CLI `tree kustomization` documentation: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux events documentation: https://fluxcd.io/flux/monitoring/events/
- Kubernetes `kubectl kustomize` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes Kustomize task documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The post described Flux's default apply ordering as the same kind-priority ordering as `kubectl apply`. Updated this to describe Flux's server-side apply stages, including CRDs, Namespaces, optional custom apply-stage kinds, cluster-scoped resources, and namespaced resources.
- The post stated that `wait: true` is critical for `dependsOn` to work correctly. Updated the wording to clarify that `dependsOn` waits for dependencies to be Ready, and `wait: true` or explicit `healthChecks` determine whether readiness includes resource health checks beyond a successful apply.
- The post said the order of entries in a Kustomize `resources` list determines apply order. Updated this to clarify that `resources` controls build inclusion and should not be used as a Flux apply-order mechanism.
- The cert-manager example combined `wait: true` with `healthChecks`, but Flux ignores `.spec.healthChecks` when `.spec.wait` is true. Removed `wait: true` from that example so the explicit deployment health check is effective.
- The debugging commands used short aliases (`ks`) rather than the command names shown in the current official Flux CLI documentation. Updated them to `flux tree kustomization`, `flux get kustomizations`, and `flux reconcile kustomization`.

## Review Notes
The remaining examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid Flux Kustomization fields. The guide is accurate after the edits, with the caveat that exact Flux apply staging behavior can depend on the installed kustomize-controller version and controller flags such as `--custom-apply-stage-kinds`.
