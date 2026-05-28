# Validation Summary: How to Build Minimal Docker Images for Go Microservices Using Scratch Base

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Docker
- Scratch container images
- Google Cloud Run
- Google Artifact Registry
- Google Cloud Build
- Google Distroless
- Alpine Linux
- UPX

## Sources Consulted
- Go cgo command documentation: https://go.dev/cmd/cgo/
- Go command environment documentation: https://go.dev/cmd/go/
- Go net package DNS resolver documentation: https://go.dev/pkg/net/
- Go release history and release policy: https://go.dev/doc/devel/release
- Docker base image documentation for `scratch`: https://docs.docker.com/build/building/base-images/
- Docker CLI local help for `docker build`, `docker images`, and `docker push`
- Docker Hub official `golang` image tags: https://hub.docker.com/_/golang
- Docker Hub official `alpine` image tags: https://hub.docker.com/_/alpine
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- Cloud Run memory limits documentation: https://docs.cloud.google.com/run/docs/configuring/services/memory-limits
- Cloud Run execution environments documentation: https://docs.cloud.google.com/run/docs/about-execution-environments
- Google Cloud SDK `gcloud run deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- Artifact Registry Docker image naming and push/pull documentation: https://docs.cloud.google.com/artifact-registry/docs/docker/names and https://docs.cloud.google.com/artifact-registry/docs/docker/pushing-and-pulling
- Cloud Build configuration schema: https://docs.cloud.google.com/build/docs/build-config-file-schema
- GoogleContainerTools Distroless README and base image documentation: https://github.com/GoogleContainerTools/distroless and https://github.com/GoogleContainerTools/distroless/blob/main/base/README.md

## Issues Found
- The post described Go as always compiling to a static binary with zero runtime dependencies. Updated the wording to say Go can compile that way, because CGO and native libraries can introduce runtime dependencies.
- The post said Go links against C libraries by default for DNS resolution. Updated this to explain that standard-library behavior can use C libraries when CGO is enabled, including the native DNS resolver.
- The Cloud Run cost sentence said "pay per request" and implied tiny images directly lower Cloud Run runtime costs. Updated it to "request-based billing" and "lower image storage costs" for better accuracy.
- The Docker examples used `golang:1.22-alpine`, which is no longer a current supported Go release as of 2026-05-28. Updated examples and the size comparison to `golang:1.26`.
- The debug stage used `alpine:3.19`, which is no longer a current supported Alpine branch. Updated it to `alpine:3.23`.
- The timezone-data note said missing timezone data causes runtime panics. Updated it to say location loading can fail at runtime, because `time.LoadLocation` returns an error.
- The Cloud Run deployment used `--memory=128Mi` without specifying the first-generation execution environment. Added `--execution-environment=gen1` and explained that Cloud Run supports 128 MiB in first generation.
- The distroless fallback for CGO used `gcr.io/distroless/static-debian12`, but the static distroless image does not include libc. Updated the CGO fallback to `gcr.io/distroless/base-debian13` and clarified when to use `static-debian13` versus `base-debian13`.

## Review Notes
Go and gcloud were not installed in the local environment, so the Go build and gcloud command could not be executed locally. Docker CLI syntax was checked with local `docker --help` output, and Go, Cloud Run, Cloud Build, Artifact Registry, Distroless, and image-version claims were checked against official documentation.
