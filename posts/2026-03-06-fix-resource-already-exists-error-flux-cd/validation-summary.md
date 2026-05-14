# Validation Summary: How to Fix 'resource already exists' Error in Flux CD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD Kustomization
- Flux CD HelmRelease
- Kubernetes Server-Side Apply
- Kubernetes managedFields and field managers
- kubectl
- Helm CRD policies
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post incorrectly described Flux Kustomization `spec.force: true` as a general way to adopt existing resources and take field ownership. Flux documents `spec.force` as replacement behavior for resources that cannot be patched because of immutable field changes, so the affected sections were rewritten to describe normal reconciliation from Git, SSA conflict resolution, and temporary use of `force` only for immutable field replacement.
- The post referred to a `fieldManagers` override in a Kustomization but the shown YAML only used `force: true`. This was replaced with Flux's documented resource-level SSA policy annotation, using `kustomize.toolkit.fluxcd.io/ssa: merge`.
- The SSA policy example used an incomplete Deployment shape after correction. It was changed to a complete ConfigMap example so the YAML snippet is syntactically valid.
- The quick troubleshooting commands called `force: true` a force-adoption step. The labels and summary were corrected to distinguish Kubernetes SSA `--force-conflicts` field ownership transfer from Flux `spec.force` resource replacement.
- The example "resource already exists" message was made generic instead of implying an exact Flux-specific phrase that is not documented as a standard Flux condition message.

## Review Notes
The HelmRelease CRD policy values `Skip`, `Create`, and `CreateReplace`, Flux Kustomization `apiVersion: kustomize.toolkit.fluxcd.io/v1`, `dependsOn`, `prune`, `sourceRef`, and the Flux CLI commands reviewed are current in the official Flux documentation. Local `kubectl` and `flux` binaries were not installed in the review environment, so command validation used the official references.
