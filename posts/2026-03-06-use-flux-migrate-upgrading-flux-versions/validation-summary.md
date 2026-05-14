# Validation Summary: How to Use flux migrate for Upgrading Flux Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- GitOps
- Kustomize Controller
- Source Controller
- Helm Controller
- Notification Controller
- Bash and sed commands

## Sources Consulted
- Flux CLI `flux migrate` documentation: https://fluxcd.io/flux/cmd/flux_migrate/
- Flux CLI `flux install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux check` documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI `flux export` documentation: https://fluxcd.io/flux/cmd/flux_export/
- Flux CLI `flux export source git` documentation: https://fluxcd.io/flux/cmd/flux_export_source_git/
- Flux CLI `flux export kustomization` documentation: https://fluxcd.io/flux/cmd/flux_export_kustomization/
- Flux CLI `flux export helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_export_helmrelease/
- Flux installation and CLI installation documentation: https://fluxcd.io/flux/installation/ and https://fluxcd.io/flux/cmd/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux Kustomization API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source API reference v1 and GitRepository documentation: https://fluxcd.io/flux/components/source/api/v1/ and https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Notification Alert documentation and API references: https://fluxcd.io/flux/components/notification/alerts/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux v2.3 release notes for HelmRelease v2 and deprecated API details: https://fluxcd.io/blog/2024/05/flux-v2.3.0/
- Flux April 2023 update for Kustomization v1 and `.spec.validation` removal: https://fluxcd.io/blog/2023/05/april-2023-update/

## Issues Found
- The Kustomization, GitRepository, HelmRelease, and Alert migration examples showed the same API version before and after migration. Updated the "before" examples to use deprecated beta API versions and the "after" examples to use the current target API versions documented by Flux.
- The deprecated API grep command omitted Helm beta API versions. Added `v2beta1` and `v2beta2` so HelmRelease and related Helm API usage is detected.
- The upgrade workflow used `flux export source all`, which is not a documented Flux export subcommand. Replaced it with separate documented source exports for GitRepository, HelmRepository, OCIRepository, and Bucket sources.
- The export commands for Kustomizations and HelmReleases omitted `--all`. Added `--all -A` so the backup commands export all resources across namespaces.
- The sed fallback commands replaced API versions with identical strings, so they made no changes. Updated them to perform real beta-to-stable API version replacements and use `sed -i.bak` instead of macOS-only `sed -i ''`.
- The rollback restore commands referenced the old single source backup file. Updated restore to apply the backup directory produced by the revised export commands.
- The "when to migrate" guidance mentioned major version upgrades. Narrowed it to minor Flux upgrades, matching the current `flux migrate` documentation.

## Review Notes
The Flux CLI was not installed in the local environment, so command validation was performed against official Flux CLI documentation rather than local `--help` output. The article remains a high-level guide; for production upgrades, readers should also follow the version-specific Flux upgrade procedure and release notes for their exact source and target versions.
