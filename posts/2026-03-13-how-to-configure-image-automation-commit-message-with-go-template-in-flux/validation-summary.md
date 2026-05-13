# Validation Summary: How to Configure Image Automation Commit Message with Go Template in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux ImageUpdateAutomation
- Flux image-reflector-controller and image-automation-controller
- Go text templates
- Kubernetes custom resources
- kubectl
- Git commit messages

## Sources Consulted
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Image update automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Go text/template package documentation: https://pkg.go.dev/text/template

## Issues Found
- The templates in "Listing Changed Objects" and "Comprehensive Commit Message Template" used `{{ $resource.Resource.Kind }}`, `{{ $resource.Resource.Name }}`, and `{{ $resource.Resource.Namespace }}`. Flux exposes changed object identifiers directly as fields on the map key (`Kind`, `Name`, `Namespace`, `APIVersion`), not under a nested `Resource` field. Updated the examples to use `{{ $resource.Kind }}`, `{{ $resource.Name }}`, and `{{ $resource.Namespace }}` so the templates match the official Flux template data structure.

## Review Notes
- The post correctly uses the current `image.toolkit.fluxcd.io/v1` API and the current `.Changed` template data. Flux documentation notes that the older `.Updated` template data has been removed.
- The command `kubectl -n flux-system events --for ImageUpdateAutomation/image-updates` matches the current `kubectl events --for TYPE/NAME` syntax.
