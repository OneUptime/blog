# Validation Summary: How to Configure Image Tags with Git Branch and SHA for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux v2
- Flux ImageRepository
- Flux ImagePolicy
- Flux image automation
- Kubernetes manifests
- GitHub Actions
- Docker image tagging

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux sortable image tags guide: https://fluxcd.io/flux/guides/sortable-image-tags/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `get images policy` documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI `get images` documentation: https://fluxcd.io/flux/cmd/flux_get_images/

## Issues Found
- The first ImagePolicy example used `filterTags.extract: '$ts'` while its regex did not define a `ts` capture group. I removed the `extract` field from that branch-SHA-only alphabetical example because Flux only needs `extract` when a captured value should be supplied to the policy rule.
- The text before the first ImagePolicy example said it tracked the latest image from `main`, but SHA-only alphabetical ordering does not identify the most recent commit. I changed it to say the example tracks `main` branch images with alphabetical ordering, matching the warning immediately after the snippet.
- The prerequisites only mentioned a GitRepository source, but the image policy marker is acted on by ImageUpdateAutomation. I updated the prerequisite to mention both the GitRepository source and ImageUpdateAutomation.

## Review Notes
The remaining Flux API versions, ImageRepository and ImagePolicy fields, `filterTags` usage, numerical ordering with extracted timestamps, image policy marker syntax, and verification commands are consistent with the current Flux documentation.
