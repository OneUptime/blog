# Validation Summary: How to Build a GitOps Catalog of Reusable Components with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- OCI artifacts and registries
- GitHub Actions
- Redis
- GHCR

## Sources Consulted
- Flux CLI `push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `pull artifact` documentation: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI `list artifacts` documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-probes/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis AUTH command documentation: https://redis.io/docs/latest/commands/auth/

## Issues Found
- The prerequisite said Flux CD v2.1+ while the examples use the current `source.toolkit.fluxcd.io/v1` `OCIRepository` API. Updated the prerequisite to Flux CD v2.6+ with v1 OCIRepository support.
- The Redis Kustomization referenced `service.yaml`, but the post did not include a `Service` manifest. Added the missing Service example so the component directory can build.
- Redis was started with `--requirepass`, but the liveness and readiness probes used unauthenticated `redis-cli ping`. Added `REDISCLI_AUTH` from the same Secret so probes authenticate correctly.
- The GitHub Actions GHCR login step incorrectly called `flux push artifact` without an artifact URL and used a non-existent `--credentials` flag. Replaced it with `docker login ghcr.io`, which Flux can use through Docker credentials.
- The `flux push artifact --revision` value used `tag/sha`, but Flux documents the format as `<branch|tag>@sha1:<commit-sha>`. Updated the revision string.
- The discovery section claimed `flux list artifacts` could list all components under a registry namespace. Flux lists tags and metadata for a specific OCI repository, so the wording and command were corrected to list versions for a known component repository.

## Review Notes
- The component expects a `redis-credentials` Secret with a `password` key in the target namespace; this is now stated explicitly. A real platform catalog should document how teams create or receive that Secret, but the exact secret-management mechanism is environment-specific.
