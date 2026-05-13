# Validation Summary: Configure Image Automation Commit Message with Changed Images in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux image-reflector-controller
- Flux image-automation-controller
- ImageUpdateAutomation
- Kubernetes custom resources
- Go text templates
- Git commit messages

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image update automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/

## Issues Found
- The resource-grouping templates used `{{ $resource.Resource.Kind }}` and `{{ $resource.Resource.Name }}`. Flux's `ObjectIdentifier` exposes `Kind` and `Name` directly, so these were changed to `{{ $resource.Kind }}` and `{{ $resource.Name }}`.
- The data structure section described `.OldValue` and `.NewValue` only as full image references. Flux records the changed setter value, which can be a full image reference or a partial field such as image name, tag, or digest. The wording was updated to reflect that.

## Review Notes
The remaining ImageUpdateAutomation fields, `messageTemplate` usage, `.Changed.Changes`, `.Changed.Objects`, `.Changed.FileChanges`, `len`, `.AutomationObject`, `strategy: Setters`, and the verification `git log` commands are consistent with current Flux documentation.
