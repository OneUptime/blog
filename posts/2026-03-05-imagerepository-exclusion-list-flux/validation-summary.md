# Validation Summary: How to Configure ImageRepository Exclusion List in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux image-reflector-controller
- ImageRepository custom resources
- Flux CLI
- Go regular expressions
- YAML manifests

## Sources Consulted
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Image Reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI documentation for `flux reconcile image repository`: https://fluxcd.io/flux/cmd/flux_reconcile_image_repository/
- Go `regexp` package documentation: https://pkg.go.dev/regexp

## Issues Found
- The post used `apiVersion: image.toolkit.fluxcd.io/v1beta2` in all ImageRepository manifests. Updated the examples to the current documented API version, `image.toolkit.fluxcd.io/v1`.
- The post said that all discovered tags are included by default when `exclusionList` is omitted. Flux documents a default exclusion list of `"^.*\\.sig$"` for Cosign signature tags, so the default behavior was corrected.
- The performance section said fewer tags are stored in the ImageRepository status and that API response sizes are reduced per scan. Flux stores scan tags in the image reflector controller's internal database and reports `tagCount` in status after exclusions, so the wording was corrected to match the documented behavior.

## Review Notes
The remaining YAML examples, `kubectl` commands, Flux reconcile command, status path `.status.lastScanResult.tagCount`, and explanation of regular expression matching are consistent with the official Flux documentation and Go regular expression behavior.
