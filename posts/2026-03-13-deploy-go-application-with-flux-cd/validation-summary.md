# Validation Summary: How to Deploy a Go Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Go
- Docker multi-stage builds
- Distroless container images
- Kubernetes Deployments, Services, ConfigMaps, probes, security contexts, and PodDisruptionBudgets
- Flux CD GitRepository and Kustomization resources
- Flux image automation resources

## Sources Consulted
- Go 1.26 release notes and release history: https://go.dev/doc/go1.26 and https://go.dev/doc/devel/release
- Go linker documentation for `-X importpath.name=value`: https://go.dev/cmd/link/
- Docker Dockerfile reference for `ARG` and `--build-arg` scope: https://docs.docker.com/reference/dockerfile/
- GoogleContainerTools distroless image contents: https://github.com/GoogleContainerTools/distroless/blob/main/base/README.md
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found
- The Dockerfile used `--build-arg VERSION=1.0.0` and referenced `${VERSION}` in the `go build` command, but did not declare `ARG VERSION`. Added `ARG VERSION=dev` before the build step because Docker build arguments only come into scope after an `ARG` instruction.
- The Dockerfile used `golang:1.22-alpine`, which is outdated as of 2026-05-13. Updated the builder image to `golang:1.26-alpine`, matching the current supported Go release series.
- The linker flag `-X main.version=...` requires a package-level string variable to set. Added `var version = "dev"` and included it in the `/health` response so the example remains buildable and the injected value is observable.
- The introduction described Go as always producing statically compiled binaries with no runtime dependencies. Revised this to say Go can produce static binaries, which is accurate when cgo and external dependencies are handled appropriately.
- The distroless description implied the runtime image contains only the binary and certificates. Revised it to account for the documented contents of the distroless static base image, including certificates and timezone data.

## Review Notes
- Flux API versions and fields shown in the examples are current in the Flux v2.8 documentation.
- The Flux image policy setter comment format is correct for updating a fully specified Kubernetes Deployment image.
- The Kubernetes `policy/v1` PodDisruptionBudget example is valid for modern Kubernetes clusters.
- Local compilation was not executed because the review environment does not have the `go` binary installed.
