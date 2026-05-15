# Validation Summary: How to Assign Git Repositories to Tenants in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Flux kustomize-controller
- Kubernetes custom resources
- Kubernetes RBAC and service accounts
- GitRepository and Kustomization APIs

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux create secret git` documentation: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/

## Issues Found
- Clarified that `spec.serviceAccountName` on a Flux Kustomization causes kustomize-controller to impersonate that service account when applying resources, and that namespace restriction depends on Kubernetes RBAC. The original wording implied the service account alone guaranteed namespace isolation.
- Changed "Each GitRepository needs a corresponding Kustomization" to "Each repository path you want Flux to deploy needs a corresponding Kustomization" because a single GitRepository can be referenced by multiple Kustomizations and does not inherently require a one-to-one Kustomization.
- Added a note that the `platform-auth` Secret referenced by the shared repository example must exist in the same namespace as the GitRepository, matching Flux's `secretRef` requirements.
- Tightened the security guidance to state that `serviceAccountName` must be used with tenant-scoped RBAC to enforce allowed deployments.

## Review Notes
The Flux API versions, GitRepository fields, Kustomization fields, and Flux CLI commands shown in the post are current and match the official Flux documentation. The shared-repository path example is operationally correct, but path-based isolation should be paired with platform-admin control of the Kustomization and repository review policies.
