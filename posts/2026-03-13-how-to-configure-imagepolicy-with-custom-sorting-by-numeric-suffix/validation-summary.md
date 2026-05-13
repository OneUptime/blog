# Validation Summary: How to Configure ImagePolicy with Custom Sorting by Numeric Suffix

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes
- YAML
- kubectl

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The post used `.status.latestImage` to check the selected image. In the current Flux `image.toolkit.fluxcd.io/v1` API, the selected image is reported in `.status.latestRef`; `.status.latestImage` was a deprecated v1beta2 field. Changed the command to read `.status.latestRef.image` and `.status.latestRef.tag`.
- The troubleshooting section said that omitting `order: asc` may select the lowest number. Flux documents `asc` as the default for numerical policies, so omitting it still selects the highest number. Changed the wording to recommend setting `asc` explicitly for clarity.
- The description of the `order` field only documented `asc`. Added the documented `desc` behavior, which selects the lowest number because Flux selects the last tag after sorting in the configured direction.

## Review Notes
The ImagePolicy and ImageRepository examples use the current `image.toolkit.fluxcd.io/v1` API and valid Flux fields. The image policy marker format and `kubectl events --for` command match current official documentation.
