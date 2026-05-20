# Validation Summary: How to Handle Shared Resources Between Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and ApplicationSets
- Argo CD resource tracking, sync options, compare options, sync waves, and diff customization
- Kubernetes ConfigMaps, Namespaces, Secrets, CRDs, Deployments, and RBAC
- Prometheus Operator PrometheusRule resources

## Sources Consulted
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Argo CD Application Specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD Resource Exclusions/Inclusions: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD Compare Options: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Annotations and Labels: https://argo-cd.readthedocs.io/en/stable/user-guide/annotations-and-labels/
- Kubernetes RBAC Aggregated ClusterRoles: https://kubernetes.io/docs/reference/access-authn-authz/rbac/#aggregated-clusterroles

## Issues Found
- The `resource.exclusions` example incorrectly used a `names` field and implied that exclusions could be applied to specific resources in one application. Argo CD resource exclusions are global `argocd-cm` settings matched by API group, kind, and cluster. I removed the unsupported `names` field and clarified the scope.
- The `ignoreDifferences` section described diff customization as a per-application exclusion mechanism. I clarified that `ignoreDifferences` ignores selected fields during comparison and does not remove resources from an application or solve ownership conflicts by itself.
- The `IgnoreExtraneous` section said Argo CD would ignore externally managed resources entirely. Official Argo CD docs state that `IgnoreExtraneous` only affects sync status. I corrected the explanation and added `Prune=false` for cases where pruning must also be prevented.
- The external resource example used `argocd.argoproj.io/managed-by`, which is not listed as an Argo CD resource-management annotation. I replaced it with supported `argocd.argoproj.io/compare-options` and `argocd.argoproj.io/sync-options` annotations.
- The decision matrix and key takeaways were updated to avoid recommending broad resource exclusions or overgeneralizing `IgnoreExtraneous`.

## Review Notes
The remaining examples use current Argo CD and Kubernetes API forms. `FailOnSharedResource=true` could be mentioned in a future revision as an additional guardrail for detecting accidental shared ownership, but it was not required to correct the existing post.
