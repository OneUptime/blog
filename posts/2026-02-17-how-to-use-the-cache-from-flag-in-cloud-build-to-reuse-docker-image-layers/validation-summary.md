# Validation Summary: How to Use the cache-from Flag in Cloud Build to Reuse Docker Image Layers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Build
- Artifact Registry
- Docker build cache and `--cache-from`
- Docker BuildKit inline cache
- Multi-stage Dockerfiles
- Kaniko caching
- Google Cloud CLI

## Sources Consulted
- Google Cloud Build: Best practices for speeding up builds: https://cloud.google.com/build/docs/optimize-builds/speeding-up-builds
- Google Cloud Build configuration file schema: https://cloud.google.com/build/docs/build-config-file-schema
- Google Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Build overview and ephemeral build environment: https://cloud.google.com/build/docs/overview
- Docker build cache documentation: https://docs.docker.com/build/cache/
- Docker `docker image build` CLI reference: https://docs.docker.com/reference/cli/docker/image/build/
- Docker BuildKit inline cache backend: https://docs.docker.com/build/cache/backends/inline/
- Docker registry cache backend: https://docs.docker.com/build/cache/backends/registry/
- Artifact Registry image management: https://cloud.google.com/artifact-registry/docs/docker/manage-images
- Artifact Registry cleanup policies: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy
- Artifact Registry transition from Container Registry: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud CLI date/time filters: https://cloud.google.com/sdk/gcloud/reference/topic/datetimes

## Issues Found
- The examples used `gcr.io/$PROJECT_ID/...` for application images. Container Registry is shut down for writes as of March 18, 2025, and Google recommends Artifact Registry for container image storage. Updated application image examples to `us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app`.
- The BuildKit example used legacy `--cache-from <image>` syntax while describing BuildKit's registry cache import. Updated it to `--cache-from type=registry,ref=...`, matching Docker's inline-cache import documentation.
- The branch-based cache example used `$BRANCH_NAME` directly in Docker tags. Branch names can contain characters such as `/`, which are invalid in Docker tags. Added Bash sanitization and changed the cache tag push to happen in the build step.
- The cleanup command described deleting images older than 30 days but used a fixed `2024-01-01` cutoff. Updated the filter to use the Google Cloud CLI relative datetime `-P30D`.
- The cleanup command deleted image digests without `--delete-tags`, which can fail for tagged Artifact Registry image versions. Added `--delete-tags`.

## Review Notes
The core `docker pull` plus `docker build --cache-from` Cloud Build pattern is consistent with Google's current documentation. The Kaniko recommendation is directionally correct for registry-backed layer caching, but Google's older English Kaniko cache page now redirects; future updates could replace that mention with BuildKit registry cache examples if the blog wants to avoid relying on legacy Cloud Build Kaniko guidance.
