# Validation Summary: How to Use Multiple GitRepositories in a Single Flux Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux GitRepository source API
- Flux Kustomization API
- Flux Notification Alert API
- Kubernetes Secrets
- GitOps multi-repository architecture

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI documentation for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation for `flux export source git`: https://fluxcd.io/flux/cmd/flux_export_source_git/

## Issues Found
- The Alert example used `apiVersion: notification.toolkit.fluxcd.io/v1`, but Flux currently documents Alert resources under `notification.toolkit.fluxcd.io/v1beta3`. Updated the Alert manifest to use `notification.toolkit.fluxcd.io/v1beta3` so it matches the current Flux Notification API.

## Review Notes
- The GitRepository and Kustomization examples use the current stable `source.toolkit.fluxcd.io/v1` and `kustomize.toolkit.fluxcd.io/v1` APIs.
- The `dependsOn`, `healthChecks`, `targetNamespace`, `secretRef`, `timeout`, and `include` fields were checked against the current Flux documentation and are used consistently with the documented APIs.
- The Flux CLI commands shown for listing, watching, filtering, and exporting Git sources are valid. The `grep -v True` example is a simple shell filter and may include the table header; Flux also supports status selectors for more precise filtering.
