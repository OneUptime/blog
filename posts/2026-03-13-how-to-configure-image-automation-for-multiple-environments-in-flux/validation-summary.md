# Validation Summary: How to Configure Image Automation for Multiple Environments in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux v2
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- GitOps image promotion workflows

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for `flux get images policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI documentation for `flux get images update`: https://fluxcd.io/flux/cmd/flux_get_images_update/

## Issues Found
- The staging ImagePolicy examples used only `range: ">=1.0.0-0"`, which allows semver pre-release matching but does not restrict the policy to pre-release tags. Added `filterTags.pattern` to the staging API and web policies so they only consider tags with a pre-release suffix.
- The promotion workflow said production automation creates a PR. Flux ImageUpdateAutomation pushes commits to the configured branch; PR creation is handled outside Flux by a user or repository automation. Updated the workflow to say Flux pushes to `flux/production-images` and a team member opens, reviews, and merges the PR.

## Review Notes
The examples use the current `image.toolkit.fluxcd.io/v1` API, valid setter comments, supported `Setters` update strategy, and valid `flux get image policy` / `flux get image update` commands. The local Flux CLI was not installed, so CLI verification was performed against the official Flux CLI documentation.
