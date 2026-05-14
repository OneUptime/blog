# Validation Summary: How to Use Image Policy Markers in YAML Manifests for Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller and image-automation-controller
- Kubernetes manifests
- ImageRepository, ImagePolicy, and ImageUpdateAutomation custom resources
- YAML image policy markers / setters
- Flux CLI and kubectl

## Sources Consulted
- Flux guide: Automate image updates to Git - https://fluxcd.io/flux/guides/image-update/
- Flux documentation: Image Update Automations - https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux API reference: Image update automation API v1 - https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux API reference: Image reflector API v1 - https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI reference: flux get images update - https://fluxcd.io/flux/cmd/flux_get_images_update/

## Issues Found
- The verification section said `flux get image update --all-namespaces` verifies that Flux detects markers. The official CLI documentation describes this command as showing ImageUpdateAutomation status, not marker detection directly. I changed the wording to say it checks ImageUpdateAutomation status.

## Review Notes
- The manifest examples use the current `image.toolkit.fluxcd.io/v1` API version for ImageRepository, ImagePolicy, and ImageUpdateAutomation.
- The `$imagepolicy` marker syntax, including the default full-image marker and `:tag` / `:name` variants, matches the official Flux image automation documentation. Flux also supports a `:digest` marker variant, but the post does not claim to list every variant.
