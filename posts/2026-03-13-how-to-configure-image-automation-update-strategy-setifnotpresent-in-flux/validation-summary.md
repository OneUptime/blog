# Validation Summary: How to Configure Image Automation Update Strategy SetIfNotPresent in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux ImageUpdateAutomation
- Flux ImagePolicy
- Kubernetes manifests
- GitOps image automation

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation v1 API reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux CLI `flux create image update` documentation: https://fluxcd.io/flux/cmd/flux_create_image_update/

## Issues Found
- The post described `SetIfNotPresent` as a valid Flux ImageUpdateAutomation update strategy. Current official Flux documentation states that the only supported update strategy is `Setters`, and the v1 API uses `Setters` as the default. I updated the article to explain that `SetIfNotPresent` is not supported and that using it would fail CRD validation.
- The YAML examples used `strategy: SetIfNotPresent`. I changed them to `strategy: Setters`, which is the supported value.
- The article claimed Flux could initialize empty or missing Deployment image tags and then leave them untouched. Official Flux examples show marked image fields using the `Setters` marker, and Deployments should use a fully specified image reference. I changed the examples to use existing tags and explain that Flux updates marked fields continuously while the marker and automation remain active.
- The article recommended switching from `Setters` to `SetIfNotPresent` to freeze versions. I replaced that guidance with supported options: set `spec.suspend: true`, remove selected image policy markers, or use a review branch workflow.

## Review Notes
The corrected article is still useful as guidance for readers who expect a `SetIfNotPresent` strategy: it now clearly states that Flux does not support that strategy and provides supported Flux-native alternatives for manual control after initialization.
