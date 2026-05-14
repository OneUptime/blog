# Validation Summary: How to Configure Image Tags with Timestamp for Flux Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes
- Docker/container image tags
- GitHub Actions
- Bash

## Sources Consulted
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageUpdateAutomation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux CLI documentation for image commands: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The prerequisites said Flux CD v2.0 or later, but the examples use the current `image.toolkit.fluxcd.io/v1` image automation APIs. Flux v2.0 documentation used earlier beta API versions for these resources, so the prerequisite was updated to Flux CD v2.7 or later.
- The ImageUpdateAutomation `messageTemplate` used `{{ range .Changed.Objects }}{{ .Name }}{{ end }}`, which does not match the current template data shape. Flux documents `.Changed.Objects` as a map keyed by an object identifier, so the template was changed to range over `$resource, $_` and use `$resource.Name`.

## Review Notes
- The timestamp ImagePolicy examples are technically correct when the extracted timestamp strings are fixed-width and lexicographically sortable.
- The Flux CLI was not installed in the local environment, so CLI checks were performed against the official Flux command documentation rather than local `--help` output.
