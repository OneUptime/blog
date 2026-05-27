# Validation Summary: How to Create Minimal Docker Images for Go Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Docker
- Dockerfile multi-stage builds
- Docker scratch images
- Google Distroless images
- Alpine Linux container images
- Docker HEALTHCHECK
- .dockerignore

## Sources Consulted
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference, including exec form and HEALTHCHECK - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build context and .dockerignore files - https://docs.docker.com/build/building/context/
- Docker Hub: official golang image tags and image variant notes - https://hub.docker.com/_/golang
- Go 1.26 release notes - https://go.dev/doc/go1.26
- Go command environment variable documentation, including CGO_ENABLED, GOOS, and GOARCH - https://pkg.go.dev/cmd/go#hdr-Environment_variables
- Go linker documentation for -s and -w - https://pkg.go.dev/cmd/link
- GoogleContainerTools Distroless README - https://github.com/GoogleContainerTools/distroless

## Issues Found
- The post stated that Go always compiles to a single static binary with no runtime dependencies. Updated this to clarify that this applies when CGO is disabled.
- The Dockerfile examples used older Go and Alpine tags. Updated examples and tables from Go 1.22 / Alpine 3.19 to current Go 1.26 / Alpine 3.23 tags.
- The scratch example copied `/usr/share/zoneinfo` from the Alpine builder without installing `tzdata`, which would fail if that path was absent. Added `apk --no-cache add ca-certificates tzdata` in the builder stage.
- The Distroless section claimed timezone data as a general included runtime file. Reworded the claim to avoid overpromising and to match the documented Distroless scope more closely.
- The Distroless examples used `static-debian12`. Updated them to `static-debian13`, which is the current Distroless Debian generation documented in the official project README.
- The health-check Dockerfile invoked `/server -healthcheck`, but the Go example did not implement that flag. Added a `flag`-based one-shot health check path that calls the local `/health` endpoint and exits with the correct status.
- The image size comparison had stale or overly precise values for current image tags. Updated the comparison to use current approximate sizes and less brittle wording where appropriate.

## Review Notes
- The examples intentionally build for `linux/amd64`. For multi-architecture production images, this should be adapted to BuildKit platform arguments such as `TARGETOS` and `TARGETARCH`.
- The `.dockerignore` example excludes `*_test.go`, which is fine for a production image build that does not run tests in Docker, but teams that run tests in a build stage should not exclude test files before that stage.
