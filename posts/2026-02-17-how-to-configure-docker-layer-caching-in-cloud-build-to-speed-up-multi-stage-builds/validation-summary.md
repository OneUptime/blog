# Validation Summary: Configure Docker Layer Caching in Cloud Build to Speed Up Multi-Stage Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Docker build cache and multi-stage Dockerfiles
- Docker BuildKit cache mounts
- Google Artifact Registry
- Kaniko
- Node.js Docker builds

## Sources Consulted
- Google Cloud Build best practices for speeding up builds: https://cloud.google.com/build/docs/optimize-builds/speeding-up-builds
- Google Cloud Build container image builds: https://cloud.google.com/build/docs/building/build-containers
- Google Artifact Registry cleanup policies: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Docker build cache invalidation: https://docs.docker.com/build/cache/invalidation/
- Docker cache optimization and cache mounts: https://docs.docker.com/build/cache/optimize/
- Docker build CLI reference: https://docs.docker.com/reference/cli/docker/image/build/
- Kaniko maintained fork README and flags: https://github.com/osscontainertools/kaniko

## Issues Found
- The BuildKit cache-mount section said cache mounts store data in named volumes that persist across build steps. Docker documents them as builder-managed cache mounts, so the text was changed to describe package-manager cache directories in the builder cache and clarify Cloud Build cross-build persistence.
- The Kaniko example used `gcr.io/kaniko-project/executor:latest`, but the original GoogleContainerTools Kaniko repository was archived in June 2025. The image was updated to the maintained `ghcr.io/osscontainertools/kaniko:latest` image.
- The Kaniko context was changed from `.` to `dir://.` to match Kaniko's documented local-directory context syntax.
- The Kaniko text overstated that every layer is automatically cached. The post now says Kaniko caches eligible `RUN` and `COPY` layers, and the example enables `--cache-copy-layers=true`.
- The Artifact Registry cleanup-policy command passed inline JSON to `--policy`, but the official gcloud flow expects a policy file. The example now writes `policy.json`, uses lowercase `tagged`, uses `7d` for the duration, and adds `--no-dry-run` so the policy actively deletes matching artifacts.

## Review Notes
The example build-time numbers are plausible illustrative measurements, but they are workload-dependent and were not independently reproducible from the post alone. The Docker and Cloud Build caching concepts, Dockerfile examples, `--cache-from` usage, Cloud Build image publishing fields, BuildKit enablement, and Artifact Registry naming patterns are otherwise consistent with the consulted documentation.
