# Validation Summary: Migrate Image Automation from Flux v1 to v2: Quick Start Guide

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Flux v1 image update automation
- Flux image automation controllers
- Kubernetes custom resources
- ImageRepository
- ImagePolicy
- ImageUpdateAutomation
- Kubernetes Secrets

## Sources Consulted
- Flux migration guide: https://fluxcd.io/flux/migration/flux-v1-automation-migration/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageRepository docs: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy docs: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation docs: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux install CLI docs: https://fluxcd.io/flux/cmd/flux_install/
- Flux bootstrap GitHub CLI docs: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux get image policy CLI docs: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The Flux v1 regex annotation example used `regexp:`. Official Flux migration documentation lists the v1 prefix as `regex:`, so the example was corrected.
- The guide implied that v1 glob and regex filters map directly to v2 filtering. Flux v1 selected the newest matching image by build time, while Flux v2 does not support build-time ordering. Added a note that sortable tag values, such as timestamps or build numbers, are required for equivalent v2 alphabetical or numerical policies.
- The glob example comment was updated to clarify that alphabetical ordering is appropriate only for sortable tags.

## Review Notes
The post uses current Flux image API versions (`image.toolkit.fluxcd.io/v1`) and current marker comment syntax. The `flux install`, `flux bootstrap github`, `ImageRepository`, `ImagePolicy`, `ImageUpdateAutomation`, `secretRef`, and verification command examples match current Flux documentation. The local `flux` CLI was not installed, so CLI validation was performed against official Flux command documentation.
