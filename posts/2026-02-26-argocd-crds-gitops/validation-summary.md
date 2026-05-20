# Validation Summary: How to Handle CRDs with GitOps in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources
- Helm charts
- Kustomize Helm chart rendering
- cert-manager
- Lua health checks

## Sources Consulted
- Argo CD sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diffing customization documentation: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/diffing/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/helm/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CRD versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- cert-manager Helm installation documentation for v1.14: https://cert-manager.io/v1.14-docs/installation/helm/
- kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize Helm chart type definition: https://github.com/kubernetes-sigs/kustomize/blob/master/api/types/helmchartargs.go

## Issues Found
- The `apiextensions.k8s.io/v1` CRD examples omitted `schema.openAPIV3Schema`, but Kubernetes requires a structural schema for v1 CRDs. Added minimal schema placeholders to the CRD examples.
- The app-of-apps sync wave paragraph overstated ordering guarantees for child Applications. Updated it to state that waves order the child Application resources and added the Argo CD 1.8+ Application health check caveat needed for strict health-gated wave progression.
- The `SkipDryRunOnMissingResource` section described the problem as schema validation. Corrected it to dry-run failure for missing resource types, which matches Argo CD's sync option.
- The CRD update example omitted required CRD fields (`spec.names`, `spec.scope`) and schemas. Added the missing fields.
- The diff-noise explanation attributed conversion webhook CA bundle changes to the API server. Updated it to describe status and controller-injected CA bundle changes more accurately.
- The Helm/Kustomize workaround referred to a Kustomize `--include-crds` flag. Updated it to the Kustomize `helmCharts.includeCRDs` setting.

## Review Notes
The remaining examples are illustrative and use placeholder repositories or shortened specs. The cert-manager chart example uses `installCRDs` with chart version `v1.14.4`, which is valid for the version shown, but cert-manager's CRD handling is chart-specific and differs from Helm's generic `crds/` behavior.
