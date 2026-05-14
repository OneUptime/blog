# Validation Summary: How to Troubleshoot ImageUpdateAutomation Not Committing Changes in Flux

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Flux ImageRepository
- Flux ImagePolicy
- Flux ImageUpdateAutomation
- Git authentication for Flux GitRepository sources

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageUpdateAutomation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI reference for `flux get images all`: https://fluxcd.io/flux/cmd/flux_get_images_all/
- Flux CLI reference for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI reference for `flux reconcile image update`: https://fluxcd.io/flux/cmd/flux_reconcile_image_update/
- Flux CLI reference for `flux resume image update`: https://fluxcd.io/flux/cmd/flux_resume_image_update/

## Issues Found
- The command for listing image automation resources used `flux get image all`. Updated it to the canonical current command `flux get images all`.
- The command for listing GitRepository sources used `flux get source git`. Updated it to the canonical current command `flux get sources git`.
- The command for inspecting a single ImagePolicy used `flux get image policy my-app`, but the current Flux CLI reference documents the get command as a listing command. Updated the example to use `kubectl get imagepolicy my-app -o jsonpath='{.status.latestRef}'`, which directly reads the resolved policy status field.
- The Git authentication note described only SSH and HTTPS basic authentication secret keys. Updated it to also mention `bearerToken` for HTTPS bearer token authentication, matching the current GitRepository documentation.

## Review Notes
The ImageUpdateAutomation API version, `spec.update.path`, `spec.update.strategy: Setters`, marker format, suspend/resume behavior, status fields, and reconcile command were checked against the current Flux documentation and are technically accurate.
