# Validation Summary: How to Use Docker Build to Output Files Without Creating an Image

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker Buildx
- Docker BuildKit exporters
- Dockerfile multi-stage builds
- Go cross-compilation
- Node.js static site builds
- GitHub Actions
- Protocol Buffers
- AWS S3 deployment command

## Sources Consulted
- Docker Buildx build CLI reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Build exporters overview: https://docs.docker.com/build/exporters/
- Docker local and tar exporters documentation: https://docs.docker.com/build/exporters/local-tar/
- Docker export binaries guide: https://docs.docker.com/build/building/export/
- Local Docker Buildx CLI help from Docker Engine 29.4.2 / Buildx v0.33.0
- Docker setup-buildx-action repository: https://github.com/docker/setup-buildx-action

## Issues Found
- The tar stdout example used `docker buildx build --output type=tar . > artifacts.tar`. This worked in local testing, but Docker's CLI reference documents `--output -` as the canonical stdout form for tar exports. Changed the example to `docker buildx build --output - . > artifacts.tar`.
- The performance tip stated that `tar` output is faster than `local` for large outputs. Docker's official exporter documentation describes tar as bundling the filesystem into a tarball but does not guarantee that it is faster in all cases. Reworded the claim to say tar output can be more convenient because it produces a single archive instead of many files.

## Review Notes
- The core explanation is accurate: `local` and `tar` exporters output the root filesystem of the build result, while `oci`, `docker`, `image`, and `registry` exporters produce image-oriented outputs.
- The examples assume project-specific files and commands exist, such as `go.mod`, `go.sum`, `./cmd/myapp`, `package-lock.json`, and `npm run generate-docs`.
- The GitHub Actions example uses `docker/setup-buildx-action@v3`, which is still a plausible pinned major version, though the action repository currently documents newer examples using `@v4`.
