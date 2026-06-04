# Validation Summary: How to Use Docker Build --no-cache Selectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Build
- Docker BuildKit
- Docker Buildx
- Dockerfile syntax
- Build cache mounts
- Multi-stage builds
- Registry and inline cache exporters
- Node.js, Python, Go, and Protocol Buffers build examples

## Sources Consulted
- Docker Docs: Build cache invalidation - https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: Cache storage backends - https://docs.docker.com/build/cache/backends/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Go Packages: protoc-gen-go command - https://pkg.go.dev/google.golang.org/protobuf/cmd/protoc-gen-go
- Local Docker CLI help: `docker buildx build --help`

## Issues Found
- The introduction and cache-cascade section implied that `--no-cache` discards all cached work and forces a base image re-download. Docker's `--no-cache` disables build-cache reuse for build instructions, but pulling newer base images is controlled separately by `--pull`. I changed the wording to say it rebuilds Dockerfile instructions without using the build cache and removed the base-image pull claim.
- The build-argument cache-busting examples claimed that changing an `ARG` invalidates the layer at the `ARG` declaration. Docker's cache miss occurs at the first usage of the changed build argument, not at its definition. I added small `RUN echo "$CACHE_BUST_..." > /tmp/...` marker steps so the arg is consumed at the intended cache boundary, and adjusted the explanation.
- The protobuf multi-stage example used `protoc --go_out` without installing `protoc-gen-go`, and it copied `/generated` even though the command wrote output under the current directory. I added installation of `google.golang.org/protobuf/cmd/protoc-gen-go` and changed the generation command to write to `/generated`.
- The inline cache example imported cache from `ghcr.io/your-org/app:cache` but exported inline cache only inside `ghcr.io/your-org/app:latest`. I changed `--cache-from` to reference the pushed image tag that actually contains the inline cache metadata.
- The source hashing command used unsorted `find` output, which can produce unnecessary cache busts if filesystem traversal order changes. I changed it to sort paths before hashing.

## Review Notes
- The Docker and Buildx flags shown in the post are current, including repeated `--no-cache-filter` usage and registry cache `mode=max`.
- The example base images such as `golang:1.22` and `nginx:1.25-alpine` are older examples by 2026, but the Dockerfile mechanics being demonstrated remain valid.
