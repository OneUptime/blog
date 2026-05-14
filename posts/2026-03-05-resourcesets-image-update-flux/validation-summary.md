# Validation Summary: How to Use ResourceSets for Image Update Automation in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator ResourceSets
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- Kubernetes manifests and kubectl
- GitOps image update automation

## Sources Consulted
- Flux Operator ResourceSet documentation: https://fluxoperator.dev/docs/crd/resourceset/
- Flux Operator installation documentation: https://fluxoperator.dev/docs/guides/install/
- Flux Operator ResourceSet image automation guide: https://fluxoperator.dev/docs/resourcesets/image-automation/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update guide and marker format: https://fluxcd.io/flux/guides/image-update/
- Flux CLI image policy command documentation: https://fluxcd.io/flux/cmd/flux_get_images_policy/

## Issues Found
- The post described ResourceSets as a Flux CD v2.3 feature. ResourceSets are provided by Flux Operator, so the introduction, prerequisites, description, and troubleshooting wording were updated to reference Flux Operator.
- The ResourceSet examples used `<< .app >>`, `<< .image >>`, and similar template expressions. Current Flux Operator ResourceSet examples reference inline inputs with `<< inputs.<field> >>`, so all ResourceSet template expressions were corrected.
- Some template substitutions for SemVer ranges and tag filters were unquoted. These values can contain characters that should remain YAML strings, so the examples now use the ResourceSet template `quote` function.
- The post claimed each application typically needs an ImageRepository, an ImagePolicy, and an ImageUpdateAutomation. Flux ImageUpdateAutomation can handle multiple ImagePolicies in its namespace, so this was corrected to describe per-application ImageRepository/ImagePolicy resources plus at least one ImageUpdateAutomation for the target Git repository.

## Review Notes
The ImageRepository, ImagePolicy, ImageUpdateAutomation, image policy marker, and Flux CLI examples align with the current Flux documentation. The post assumes Flux Operator and the Flux image controllers are installed separately.
