# Validation Summary: How to Configure HelmRelease CRDs Installation Policy in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- Flux Kustomize Controller
- Kubernetes CustomResourceDefinitions
- Helm
- cert-manager
- kubectl
- flux CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager continuous deployment documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/

## Issues Found
- The post implied that Flux's `spec.install.crds` policy applies to all chart-managed CRDs. Updated the introduction and best practices to clarify that Flux's CRD policy applies to CRDs from the Helm chart's `crds/` directory.
- The post only described `spec.install.crds` even though it also used `spec.upgrade.crds`. Updated the policy section to cover both fields and added the different default behavior: `Create` for install and `Skip` for upgrade.
- The cert-manager examples set `installCRDs: false` while implying Flux's CRD policy would handle CRDs. This is inaccurate for cert-manager v1.14 because cert-manager did not use Helm's standard `crds/` directory method for CRDs. Replaced the policy examples with generic `my-operator` examples that match the Flux documentation pattern.
- The external CRD management example used `HelmRelease.spec.dependsOn` to depend on a Flux Kustomization. Flux HelmRelease dependencies can only reference other HelmRelease resources. Removed the invalid dependency and added guidance to express Kustomization ordering through Flux Kustomization `dependsOn` instead.
- The post stated the chart should disable chart-level CRD installation when using Flux's CRD policy. Replaced this with a more accurate recommendation to check how each chart packages CRDs, because templated CRDs are controlled by chart values rather than Flux's Helm CRD policy.

## Review Notes
The remaining YAML snippets use current Flux `helm.toolkit.fluxcd.io/v2` and `kustomize.toolkit.fluxcd.io/v1` API versions. The backup commands are illustrative and should be expanded for all custom resource kinds owned by the CRDs in a real upgrade plan.
