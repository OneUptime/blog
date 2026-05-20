# Validation Summary: How to Use Helm Umbrella Charts with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Helm umbrella charts and chart dependencies
- Kubernetes manifests
- GitOps deployment workflows

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD sync phases and waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Helm dependency command documentation: https://helm.sh/docs/helm/helm_dependency/
- Helm dependency build documentation: https://docs.helm.sh/docs/helm/helm_dependency_build/
- Helm chart dependency best practices: https://docs.helm.sh/docs/chart_best_practices/dependencies/

## Issues Found
- The sync-wave section suggested adding an Argo CD sync-wave annotation to a shared ConfigMap to order PostgreSQL and Redis before the application. That annotation only orders the annotated ConfigMap, not the sub-chart resources. Updated the section to show sync-wave annotations on the actual sub-chart resources that need ordering.
- The CRD conflicts section described `skipCrds` as something to use on one sub-chart. In Argo CD's Helm source configuration, `skipCrds` applies to the rendered Helm source as a whole, not an individual dependency. Updated the text to explain that `skipCrds` skips Helm CRD installation for the whole source and that chart-specific values should be used when available for template-based CRDs.

## Review Notes
The remaining Application, repository Secret, Helm dependency, values file, and CLI examples align with current Argo CD and Helm documentation. The pinned example chart versions are illustrative rather than recommendations for latest production versions.
