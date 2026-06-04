# Validation Summary: How to Build a Multi-Source ArgoCD Application That Combines Helm and Kustomize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source applications
- Helm charts and value files
- Kustomize overlays
- OCI Helm chart repositories
- Argo CD sync waves and CLI commands

## Sources Consulted
- Argo CD Multiple Sources for an Application: https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD app diff command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD app manifests command reference: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_app_manifests/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Official Helm chart indexes for ingress-nginx, Bitnami, Grafana, and cert-manager to verify referenced chart versions.

## Issues Found
- Replaced examples that used `$postgresPassword` and `$ARGOCD_ENV_ADMIN_PASSWORD` as if they were generic secret substitutions. Argo CD Helm parameters support documented build environment substitution, not arbitrary secret variable expansion. The examples now use existing Kubernetes Secrets supported by the relevant Helm charts.
- Clarified that `$ref` source references are for Helm value files from external sources, not a general cross-source resource reference mechanism.
- Corrected the OCI Helm chart example. Argo CD Helm OCI examples use `repoURL` without the `oci://` prefix when `chart` is set.
- Corrected the dependency section to state that source order does not control sync order. Argo CD generates manifests from sources and syncs resources according to sync waves, kind, and name.
- Renamed the source-specific sync options section because the example used generator options such as `helm.skipCrds` and `directory`, not per-source sync options.
- Removed an invalid Kustomize `components: - $base` example. Argo CD `$ref` variables are not used as Kustomize component paths.
- Fixed the `argocd app diff` command to include `--local`, because `--local-repo-root` is documented as used together with `--local`.
- Updated the monitoring example to avoid claiming per-source sync status in `argocd app get`; Argo CD reports overall application sync status while listing configured sources.
- Replaced the circular dependency warning with an accurate note that rendered output from one source is not consumed by another source.
- Clarified that converting from `source` to `sources` keeps the same Application API version but still requires Argo CD 2.6 or later.

## Review Notes
The local environment did not have the `argocd` CLI installed, so CLI validation was performed against official command references. The referenced public chart versions were still present in their official chart indexes at review time.
