# Validation Summary: How to Configure Image Tags with SemVer for Flux Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux image-automation-controller
- Kubernetes manifests
- Container image tags
- Semantic Versioning
- Go text templates

## Sources Consulted
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap/
- Flux get images CLI documentation: https://fluxcd.io/flux/cmd/flux_get_images/
- Flux image-reflector-controller SemVer policy source: https://github.com/fluxcd/image-reflector-controller/blob/main/internal/policy/semver.go
- Flux version parser source: https://github.com/fluxcd/pkg/blob/main/version/version.go
- Masterminds semver documentation: https://github.com/Masterminds/semver

## Issues Found
- The post stated that Flux uses a Go semver library that follows SemVer 2.0.0. Flux does use Masterminds semver constraints, but its own parser is intentionally looser and accepts an optional `v` prefix while still requiring major, minor, and patch components. Updated the wording to match Flux's current implementation.
- The post implied that tags with a `v` prefix are ignored unless `filterTags` strips the prefix. Flux accepts an optional `v` prefix, so this troubleshooting note was inaccurate. Updated it to say `filterTags` can be used to strip or normalize prefixes when needed.
- The `ImageUpdateAutomation` commit `messageTemplate` ranged over `.Changed.Objects` as if each item exposed `.Kind`, `.Name`, `.OldValue`, and `.NewValue` directly. Flux documents `.Changed.Objects` as a map from object identifiers to lists of changes, so the template needed key/value variables and an inner range over changes. Updated the template accordingly.

## Review Notes
- The current `apiVersion: image.toolkit.fluxcd.io/v1` examples match the latest Flux image automation documentation.
- The `Setters` update strategy remains valid and is currently the only supported update strategy.
- The `flux` CLI was not installed in the local environment, so CLI verification was performed against the official Flux command documentation rather than local `--help` output.
