# Validation Summary: How to Configure Image Tags with Regex Extraction for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux ImagePolicy
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes custom resources
- Go-compatible regular expressions
- Container image tag selection

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Go regexp/syntax package documentation: https://pkg.go.dev/regexp/syntax

## Issues Found
- The prerequisites implied that both `image-reflector-controller` and `image-automation-controller` are required. ImagePolicy evaluation is handled by the image-reflector-controller; the image-automation-controller is only required when committing image updates back to Git. Updated the prerequisite accordingly.
- The verification command queried `.status.latestImage`, but current Flux ImagePolicy v1 reports the selected image under `.status.latestRef`. Updated the command to print `.status.latestRef.image` and `.status.latestRef.tag`.
- The log-checking guidance said logs provide pattern matching details. Flux documentation presents controller logs as a way to inspect reconciliation errors, not per-tag regex matching output. Updated the wording to "reconciliation errors."
- The regex pitfalls section stated that Go named capture groups must use `(?P<name>pattern)` and not `(?<name>pattern)`. Current Go regexp syntax supports both forms. Updated the statement to reflect both accepted syntaxes.

## Review Notes
The ImagePolicy YAML examples use the current `image.toolkit.fluxcd.io/v1` API, valid `filterTags.pattern` and `filterTags.extract` fields, and supported `semver` and `numerical` policy configuration. The numerical examples correctly use `order: asc`, which selects the last tag after ascending numerical sort.
