# Validation Summary: How to Upgrade ArgoCD from v2.x to v3.x Safely

## Status
validated

## Post Type
Tutorial / Upgrade guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Helm
- Argo CD RBAC
- Argo CD Config Management Plugins

## Sources Consulted
- Argo CD v2.14 to v3.0 upgrade guide: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/upgrading/2.14-3.0/
- Argo CD upgrade overview: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/upgrading/overview/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_tracking/
- Argo CD config management plugins documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/config-management-plugins/
- Argo CD repo add command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_repo_add/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_app_sync/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD GitHub releases API: https://api.github.com/repos/argoproj/argo-cd/releases

## Issues Found
- Replaced inaccurate v3.x change list entries. The post claimed new `spec.source` Helm requirements, standardized sync-option annotations, and server-side diff by default; the official v3.0 upgrade guide instead documents RBAC behavior changes, logs RBAC enforcement, legacy repo config removal, Helm 3.17.1 behavior, annotation tracking by default, default exclusions, and health/status storage changes.
- Corrected deprecated repository detection. The original command counted modern repository Secret labels, which does not detect removed legacy repository configuration in `argocd-cm`.
- Corrected the changelog guidance to include the v2.13 to v2.14 and v2.14 to v3.0 upgrade notes.
- Updated latest v2.x discovery to query more GitHub releases and target the final v2.14 patch line before v3.0.
- Clarified config management plugin migration. Inline `argocd-cm` plugins were removed before v3.0, so the post now describes this as an older-v2.x migration concern and includes a sidecar plugin config file.
- Added a rollback manifest backup command and replaced the hard-coded rollback version with a previous-version placeholder.
- Corrected RBAC troubleshooting language to describe behavior changes rather than syntax changes.
- Fixed the upgrade path diagram so its final no-rollback branch ends at completion instead of repeating the CLI update step.

## Review Notes
The post is now technically aligned with the Argo CD v3.0 upgrade documentation. Future improvements could include separate instructions for HA installs and Helm chart based installs, because the manifest URLs shown are for the standard non-HA upstream install manifests.
