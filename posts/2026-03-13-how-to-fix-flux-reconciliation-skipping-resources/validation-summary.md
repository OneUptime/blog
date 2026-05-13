# Validation Summary: How to Fix Flux Reconciliation Skipping Resources

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux
- Flux Kustomize Controller
- Flux CLI
- Kubernetes
- Kustomize
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux diff kustomization`: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux CLI `flux tree kustomization`: https://fluxcd.io/flux/cmd/flux_tree_kustomization/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The diagnostic command for checking what Flux built used controller log greps, which does not reliably print the rendered manifest set. Changed it to `flux build kustomization my-app --path ./path/to/app/`, which is the documented Flux CLI command for building local manifests as Flux would build them.
- The `targetNamespace` explanation said resources in other namespaces may be silently skipped. Flux documents that it sets the namespace of objects to `.spec.targetNamespace`; namespaced resources are rewritten rather than skipped. Updated the wording accordingly.
- The namespace fix suggested cluster-scoped resources such as ClusterRoles may need a separate Kustomization without `targetNamespace`. Cluster-scoped resources are not namespaced; updated the text to clarify that only namespaced resources are rewritten.
- The patch explanation said strategic merge or JSON patches might "null out resources." Updated it to the more accurate behavior that patches can delete resources or remove fields from generated output.
- The "force a full re-apply" command used `flux reconcile kustomization my-app --with-source --force`, but current Flux CLI documentation for `flux reconcile kustomization` does not include a `--force` flag. Changed the section to "Trigger a reconciliation" and removed the invalid flag.
- The prevention advice said all YAML files in a directory are automatically included. That is only accurate for Flux's generated `kustomization.yaml` behavior when the path contains plain manifests and no `kustomization.yaml`. Updated the wording to include that condition.

## Review Notes
The local environment did not have `flux`, `kubectl`, or `kustomize` installed, so CLI validation was performed against official Flux and Kubernetes documentation rather than local `--help` output.
