# Validation Summary: How to Configure HelmRelease CRD Installation with Create Policy in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease
- Kubernetes CustomResourceDefinitions
- Helm
- kubectl
- cert-manager
- Flux Kustomization

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux reconcile helmrelease` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager GitOps installation documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/

## Issues Found
- The post implied that Flux `spec.install.crds` applies to all Helm chart CRDs. Flux documents this policy as applying to CRDs from a chart's `crds/` directory, so the wording was narrowed to that scope.
- The original cert-manager examples used `spec.install.crds: Create` to install cert-manager CRDs. cert-manager v1.14 documents CRD installation through its chart value `installCRDs` or manual manifests, not Flux's `crds/` directory policy. The generic Flux CRD policy examples were changed to a generic operator chart, and the separate cert-manager CRD example now explicitly sets `installCRDs: false`.
- The post described `CreateReplace` as full lifecycle management. Flux creates and replaces CRDs with this policy but does not delete CRDs that no longer exist in the chart, so the wording was changed to "creation and updates."
- The CRD upgrade troubleshooting text suggested a removed-field behavior as the common issue. It was replaced with the documented Helm limitation around upgrading and deleting CRDs from `crds/`, plus Flux's documented `CreateReplace` behavior.
- The best-practices example claimed rollback capability for CRD updates. The wording was adjusted to describe rollback remediation for the Helm release without implying CRD rollback semantics.

## Review Notes
The YAML snippets use current Flux API versions (`helm.toolkit.fluxcd.io/v2` and `kustomize.toolkit.fluxcd.io/v1`) and valid fields. The `flux reconcile helmrelease cert-manager -n cert-manager` command matches the documented Flux CLI syntax.
