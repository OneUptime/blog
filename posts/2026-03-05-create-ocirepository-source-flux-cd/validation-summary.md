# Validation Summary: How to Create an OCIRepository Source in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- OCI artifacts and OCI-compliant registries
- Flux source-controller `OCIRepository`
- Flux kustomize-controller `Kustomization`
- Flux helm-controller `HelmRelease`
- Flux CLI
- kubectl

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux 2.6 GA announcement: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux CLI documentation for `flux get sources oci`: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux CLI documentation for `flux suspend source oci`: https://fluxcd.io/flux/cmd/flux_suspend_source_oci/
- Flux CLI documentation for `flux resume source oci`: https://fluxcd.io/flux/cmd/flux_resume_source_oci/
- Flux CLI documentation for `flux reconcile source oci`: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Flux CLI documentation for `flux delete source oci`: https://fluxcd.io/flux/cmd/flux_delete_source_oci/

## Issues Found
No technical issues found.

## Review Notes
- The `source.toolkit.fluxcd.io/v1` `OCIRepository` API is appropriate for Flux v2.6 and later.
- The Flux CLI commands shown are valid. Flux currently marks several `flux ... source oci` commands, including `get` and `delete`, as preview in the generated CLI documentation.
- The `spec.ignore` example is correct, with the caveat that Flux documents `spec.ignore` as overriding the default exclusion list.
