# Validation Summary: How to Create an ImageUpdateAutomation in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageRepository, ImagePolicy, and ImageUpdateAutomation custom resources
- Container registry authentication with Kubernetes Docker config secrets
- GitOps image update workflows

## Sources Consulted
- Flux Image Update Automations documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI documentation for `flux get images repository`: https://fluxcd.io/flux/cmd/flux_get_images_repository/
- Flux CLI documentation for `flux get images policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux CLI documentation for `flux get images update`: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux optional components documentation: https://v2-6.docs.fluxcd.io/flux/installation/configuration/optional-components/

## Issues Found
- The post showed a `:tag` image policy marker on a full Kubernetes `image:` field. Flux supports `:tag` markers for fields that contain only the tag value, such as Helm values. On a Deployment `image:` field, the basic marker should be used because the field expects a full image reference. Changed the example to use a standalone `tag: 1.0.0` field and clarified that this applies to manifests that separate image fields.

## Review Notes
The remaining Flux API versions, custom resource fields, image policy examples, image repository secret reference, `Setters` update strategy, commit template use of `.Changed`, and Flux CLI commands match the current official Flux documentation reviewed on 2026-05-15.
