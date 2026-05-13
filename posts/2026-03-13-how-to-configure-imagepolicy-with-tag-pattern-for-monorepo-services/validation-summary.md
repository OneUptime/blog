# Validation Summary: How to Configure ImagePolicy with Tag Pattern for Monorepo Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux ImageRepository
- Flux ImagePolicy
- Flux ImageUpdateAutomation
- Kubernetes Deployments
- GitHub Actions
- Docker image tagging and pushing

## Sources Consulted
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image reflector API reference v1: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux CLI documentation for `flux get images policy`: https://fluxcd.io/flux/cmd/flux_get_images_policy/
- Flux image automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/
- GitHub Actions checkout action: https://github.com/actions/checkout
- Docker login action: https://github.com/docker/login-action
- dorny/paths-filter action: https://github.com/dorny/paths-filter

## Issues Found
- The timestamp ImagePolicy example filtered tags with a short Git SHA suffix (`api-<timestamp>-<sha>`), but the post's timestamp tagging strategy examples used tags like `api-20260313143022`. Updated the regex to `^api-(?P<ts>[0-9]{14})$` so the example matches the described tag format and can be evaluated by Flux's numerical policy after extracting `$ts`.
- The GitHub Actions example attempted to read repository files and run `docker build` without checking out the repository. Added `actions/checkout@v4` to both jobs that need repository contents.
- The GitHub Actions example pushed to Docker Hub without logging in. Added `docker/login-action@v3` with Docker Hub credentials supplied through GitHub Actions secrets.
- The `dorny/paths-filter` example used `@v2`; updated it to `@v3`, the current major version documented by the action project.

## Review Notes
The Flux API examples use the current `image.toolkit.fluxcd.io/v1` API, valid `filterTags.pattern` and `filterTags.extract` fields, valid SemVer and numerical policy fields, and a valid ImageUpdateAutomation `Setters` configuration. The Flux marker comments and `flux get image policy` commands match the current Flux image automation guide and CLI documentation.
