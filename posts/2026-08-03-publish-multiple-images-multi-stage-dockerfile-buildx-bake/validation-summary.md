# Validation Summary: Publish Multiple Images with Multi-Stage Targets and Buildx Bake

## Status
validated

## Post Type
Technical tutorial / CI/CD build and publishing guide

## Technologies Covered

- Docker and Dockerfiles
- Docker Buildx
- Buildx Bake and HCL Bake definitions
- Multi-stage container builds
- Multi-platform container images and image indexes
- BuildKit cross-compilation variables and build cache mounts
- Go 1.25 cross-compilation
- Registry-backed BuildKit caches
- SBOM and provenance attestations
- Container registries and digest-based deployment
- CI/CD release validation

## Sources Consulted

- [Docker Bake overview](https://docs.docker.com/build/bake/)
- [Docker Bake targets and groups](https://docs.docker.com/build/bake/targets/)
- [Docker Bake file reference](https://docs.docker.com/build/bake/reference/)
- [Docker Bake variables](https://docs.docker.com/build/bake/variables/)
- [Docker Bake configuration overrides](https://docs.docker.com/build/bake/overrides/)
- [Docker Buildx bake CLI reference](https://docs.docker.com/reference/cli/docker/buildx/bake/)
- [Docker multi-stage build documentation](https://docs.docker.com/build/building/multi-stage/)
- [Docker multi-platform build documentation](https://docs.docker.com/build/building/multi-platform/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker cache storage backends](https://docs.docker.com/build/cache/backends/)
- [Docker registry cache backend](https://docs.docker.com/build/cache/backends/registry/)
- [Docker build attestations](https://docs.docker.com/build/metadata/attestations/)
- [Docker exporter overview](https://docs.docker.com/build/exporters/)
- [Docker containerd image store documentation](https://docs.docker.com/engine/storage/containerd/)
- [Docker Buildx imagetools inspect CLI reference](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/)
- [Official Go Docker image](https://hub.docker.com/_/golang)
- [Go 1.25 release notes](https://go.dev/doc/go1.25)
- [Go command reference](https://pkg.go.dev/cmd/go)

## Issues Found
No technical issues found.

## Review Notes

- The HCL snippet was parsed and resolved successfully with Docker Buildx v0.33.0. The rendered plan correctly contained two targets, their named Dockerfile stages, separate tags, two platforms, both attestations, and separate registry cache destinations.
- The wildcard platform override and conditional `--load` behavior resolved as described: both selected targets were reduced to `linux/amd64` and assigned Docker outputs.
- The Dockerfile passed `docker buildx build --check` with no warnings, and the official `golang:1.25-bookworm` image tag is currently published for the required platforms.
- Older Buildx versions may not expose newer CLI options such as `--var` or `--check`; the commands were validated against the current documented CLI and Buildx v0.33.0.
- Containerd-backed image stores support loading multi-platform images, while classic Docker image stores do not. The post's single-platform `--load` override remains the broadly compatible choice; build attestations may not be retained by classic local image stores.
- `golang:1.25-bookworm` is a mutable minor-version tag. Pinning an exact patch tag or digest can improve reproducibility in production, but the tag used in the tutorial is valid and supported.
