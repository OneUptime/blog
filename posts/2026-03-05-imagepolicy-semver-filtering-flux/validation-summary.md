# Validation Summary: How to Configure ImagePolicy with SemVer Filtering in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux image-reflector-controller
- Flux ImagePolicy and ImageRepository resources
- Kubernetes custom resources
- Semantic Versioning
- Docker/OCI image tags

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux Image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux CLI documentation for `flux get images policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux image-reflector-controller source for SemVer policy behavior: https://github.com/fluxcd/image-reflector-controller
- Flux `pkg/version` source for supported version parsing: https://github.com/fluxcd/pkg/blob/main/version/version.go
- Masterminds/semver documentation: https://github.com/Masterminds/semver
- Semantic Versioning 2.0.0 specification: https://semver.org/
- Docker image tag reference and distribution reference grammar: https://docs.docker.com/reference/cli/docker/image/tag/ and https://pkg.go.dev/github.com/distribution/reference

## Issues Found
- The post stated that SemVer build metadata such as `1.2.3+build.456` is supported for image tags. SemVer supports build metadata, but Docker/OCI tag grammar does not allow `+`, so I changed the text to explain that image tags should use pre-release identifiers or another tag pattern instead.
- The broad `>=0.0.0` and `*` range descriptions implied that all versions, including pre-releases, would be selected. Masterminds/semver excludes pre-releases from constraints unless the constraint includes a pre-release comparator such as `-0`, so I updated those descriptions to say "stable" versions.
- The post said `v`-prefixed tags require `filterTags` to strip the prefix. Flux's version parser accepts a leading `v`, so I changed the section to say `filterTags` is optional for normalizing or restricting tags, not required for a plain `v1.2.3` tag.
- The common patterns table described `>=1.0.0-0` as "All including pre-release." That range only includes versions greater than or equal to `1.0.0-0`, so I clarified the wording.
- The troubleshooting section described a `v` prefix as causing issues. I changed it to refer to custom prefixes, where extracting the SemVer portion with `filterTags` is appropriate.

## Review Notes
The ImagePolicy examples use the current `image.toolkit.fluxcd.io/v1` API and valid `spec.policy.semver.range`, `spec.filterTags.pattern`, and `spec.filterTags.extract` fields. The SemVer range operators shown are consistent with Masterminds/semver behavior. The `flux get image policy` command form is shown as an accepted example in current Flux CLI documentation, although the generated command page is titled `flux get images policy`.
