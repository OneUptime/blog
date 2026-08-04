# Validation Summary: `docker build --target`: Why BuildKit Executes Other Stages

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker Buildx
- BuildKit
- Dockerfiles
- Multi-stage builds
- Build targets and stage dependency graphs
- Docker build cache and progress output

## Sources Consulted
- Docker Docs: Multi-stage builds, including BuildKit and legacy-builder target behavior - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: BuildKit overview and LLB dependency graphs - https://docs.docker.com/build/buildkit/
- Docker Docs: Dockerfile reference for `FROM`, `COPY --from`, and `RUN --mount` - https://docs.docker.com/reference/dockerfile/
- Docker Docs: `docker buildx build` CLI reference for `--target`, `--progress`, and `--no-cache` - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Named build contexts - https://docs.docker.com/build/concepts/context/
- Docker Docs: Build exporters and default output behavior - https://docs.docker.com/build/exporters/
- Docker Docs: Deprecated Docker Engine features, including the Linux legacy builder and `DOCKER_BUILDKIT=0` fallback - https://docs.docker.com/engine/deprecated/
- Docker Official Image documentation and tag listing for Node.js - https://hub.docker.com/_/node
- Local Docker 29.4.3 and Docker Buildx 0.33.0 CLI help and Dockerfile build check

## Issues Found
No technical issues found.

## Review Notes
The example Dockerfile passed `docker buildx build --check` with no warnings, and the `node:24-bookworm-slim` image reference resolved successfully. The stage-dependency examples, cache explanation, progress and no-cache flags, named-context statement, and export-boundary explanation agree with current Docker documentation. Docker currently marks the legacy builder for Linux images and its fallback as deprecated; `DOCKER_BUILDKIT=0` remains documented for `docker build` while that compatibility path is available, whereas `docker buildx build` uses BuildKit.
