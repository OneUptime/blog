# Validation Summary: ArgoCD Terminology Glossary: Every Term Explained

## Status
validated

## Post Type
Reference

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- ApplicationSet
- Helm
- Kustomize
- Dex
- Redis
- Argo Rollouts
- Argo CD Image Updater

## Sources Consulted
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Resource Tracking: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_tracking/
- Argo CD Architectural Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD Component Architecture: https://argo-cd.readthedocs.io/en/stable/developer-guide/architecture/components/
- Argo CD ApplicationSet Generators: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD GnuPG Verification: https://argo-cd.readthedocs.io/en/stable/user-guide/gpg-verification/
- Argo CD ApplicationSet Application Deletion: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Application-Deletion/

## Issues Found
- Added `metadata.namespace: argocd` to the AppProject YAML example so the project is created in the Argo CD control-plane namespace in a standard installation.
- Clarified automated sync wording to avoid implying that all live-cluster drift is automatically corrected without `selfHeal`.
- Updated the resource hook description to include current hook values beyond PreSync, Sync, PostSync, and SyncFail.
- Clarified that the Argo CD resources finalizer controls cascading resource deletion when the finalizer is present.

## Review Notes
The post is technically accurate after the fixes. The heading formatting for "Resource Terminology", "Resource Hook", and "Resource Tracking" could be cleaned up in a future editorial pass, but that is not a technical correctness issue.
