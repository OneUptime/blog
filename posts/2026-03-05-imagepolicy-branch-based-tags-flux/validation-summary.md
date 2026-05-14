# Validation Summary: How to Configure ImagePolicy for Branch-Based Tags in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- Container image tags
- Docker image references
- Regular expressions

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image Reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI `install` documentation: https://fluxcd.io/flux/cmd/flux_install/
- Docker image tag documentation: https://docs.docker.com/engine/reference/commandline/tag/

## Issues Found
- The original examples extracted only an 8-digit `YYYYMMDD` date while also describing build-specific tags. Flux evaluates the extracted value for the policy, so multiple same-day builds would not be reliably ordered by newest build. Updated the examples and regex patterns to use a 14-digit `YYYYMMDDHHMMSS` timestamp and adjusted the explanation accordingly.
- The verification section said `Last Scan Result` shows which tags were discovered. Current Flux API docs describe `latestTags` as a small sample of discovered tags and `tagCount` as the count. Updated the wording to say it shows the tag count and a sample of discovered tags.

## Review Notes
The Flux API version `image.toolkit.fluxcd.io/v1`, ImagePolicy `filterTags` fields, alphabetical and numerical policies, image policy marker comments, `Setters` update strategy, and `flux install --components-extra` usage are consistent with current Flux documentation. The local environment did not have the `flux` CLI installed, so CLI verification was performed against official Flux CLI documentation rather than local `--help` output.
