# Validation Summary: How to Fix Flux Reconciliation After CRD Version Upgrade

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Flux
- Kubernetes
- CustomResourceDefinitions
- kubectl
- Kustomize
- HelmRelease and HelmRepository Flux APIs
- jq

## Sources Consulted
- Kubernetes documentation: Versions in CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes kubectl reference: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux CLI reference: flux reconcile - https://fluxcd.io/flux/cmd/flux_reconcile/
- Flux Helm API reference v2 - https://fluxcd.io/flux/components/helm/api/v2/
- Flux Source API reference v1 - https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRepository documentation - https://fluxcd.io/flux/components/source/helmrepositories/

## Issues Found
- The command that checked served and storage versions used `kubectl get ... -o jsonpath='{.spec.versions}' | jq ...`. Complex `jsonpath` output is not reliable JSON for `jq`, so it was changed to `kubectl get ... -o json | jq '.spec.versions[] | ...'`.
- The command that displayed conversion webhook configuration used `jsonpath` output piped into `jq`. It was changed to read from full JSON output with `jq '.spec.conversion'`.
- The manual object migration loop listed namespaced resources with `--all-namespaces -o name`, then patched them without preserving namespaces. It was changed to emit namespace and name with JSONPath and patch each resource with `-n "$ns"`.
- The command for removing old CRD stored versions replaced the full CRD object after editing `.status`. Kubernetes documents patching the CRD `status` subresource for this operation, so it was changed to `kubectl patch customresourcedefinition ... --subresource=status --type=merge`.
- The Flux HelmRelease example omitted required reconciliation and chart source fields. It now includes `spec.interval` and `chart.spec.sourceRef`, and the HelmRepository example includes an interval.

## Review Notes
The remaining CRD versioning guidance is accurate at a conceptual level: Kubernetes requires old stored versions to be migrated before dropping them from `status.storedVersions`, served versions control API availability, and webhook conversion must be available when conversion is required. The CRD YAML in the migration section is a shortened illustrative snippet focused on version fields, not a complete CRD definition.
