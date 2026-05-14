# Validation Summary: How to Configure Kustomization NamePrefix and NameSuffix in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Kustomize
- Kubernetes manifests
- Kubernetes labels and selectors

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes documentation: Object Names and IDs - https://kubernetes.io/docs/concepts/overview/working-with-objects/names/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation: flux reconcile kustomization - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes SIGs Kustomize repository README - https://github.com/kubernetes-sigs/kustomize

## Issues Found
- The introduction implied that Services point to Deployments through name references. Kubernetes Services select Pods by labels, not Deployment names, so the wording was changed to focus on Kustomize's known name-reference updates.
- The name-reference list mixed Service selectors into a list of references that Kustomize updates. This was corrected to state that Service selectors do not change under `namePrefix` or `nameSuffix`.
- The tenant overlays used `commonLabels`. Current Kustomize examples use `labels` with `includeSelectors: true` for selector-aware label injection, so the examples were updated.
- The Flux example used `targetNamespace: shared-workers` without noting the namespace prerequisite. A sentence was added to clarify that the namespace must already exist or be included in the applied manifests.
- The name length consideration said all Kubernetes resource names must be 253 characters or fewer. Kubernetes uses multiple naming constraints, including 253-character DNS subdomain names and 63-character DNS label names, so the wording was corrected.

## Review Notes
The remaining Kustomize and Flux examples use current API versions and valid field names. The `flux reconcile kustomization <name> --with-source` command matches the current Flux CLI documentation. The expected Kustomize output is abbreviated, so it intentionally omits labels and selectors that would also be present after selector-aware label injection.
