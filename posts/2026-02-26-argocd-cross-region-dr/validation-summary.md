# Validation Summary: How to Set Up Cross-Region ArgoCD for DR

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- AWS S3
- AWS Route 53
- Docker
- Bash

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD disaster recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_import/
- Argo CD GitHub latest release metadata: https://api.github.com/repos/argoproj/argo-cd/releases/latest
- AWS CLI `route53 create-health-check` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/create-health-check.html
- AWS CLI `route53 change-resource-record-sets` command reference: https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- Amazon Route 53 failover record documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-failover.html
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The original DR sync script manually exported Applications, AppProjects, selected ConfigMaps, and only Secrets with `argocd.argoproj.io/secret-type`. This can miss important Argo CD state such as ApplicationSets and unlabeled Argo CD Secrets, so it was not a complete DR backup. Replaced the manual YAML/Python sync with the official `argocd admin export` and `argocd admin import` workflow, storing the exported backup in S3 between regions.
- The install command pinned Argo CD to `v2.13.0`, which is outdated for the May 20, 2026 review date. Updated the example to use `v3.4.2`, the current latest GitHub release at review time, and made it explicit that the DR version should match the primary Argo CD instance.
- Added Docker to the prerequisites because the corrected state sync script uses the official Argo CD container image to run `argocd admin export/import`.

## Review Notes
Route 53 failover records and health check fields are syntactically consistent with the AWS CLI and Route 53 documentation. The Kubernetes Secret example uses `stringData`, which is valid for clear-text manifest input, though Kubernetes notes that `stringData` does not work well with server-side apply. The local review environment did not have `kubectl` or `aws` installed, so CLI validation was performed against official command references instead of local help output.
