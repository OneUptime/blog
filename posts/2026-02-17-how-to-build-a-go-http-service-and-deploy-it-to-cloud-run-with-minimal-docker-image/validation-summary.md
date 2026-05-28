# Validation Summary: How to Build a Go HTTP Service and Deploy It to Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go net/http
- Docker
- Multi-stage Docker builds
- Scratch and distroless container images
- Google Cloud Run
- Google Cloud Build
- Google Artifact Registry
- gcloud CLI

## Sources Consulted
- Go 1.22 release notes for ServeMux method patterns and Request.PathValue: https://go.dev/doc/go1.22
- Go release policy and current release history: https://go.dev/doc/devel/release
- Dockerfile reference for COPY and multi-stage build behavior: https://docs.docker.com/reference/builder
- Cloud Run container runtime contract for PORT and listening interface requirements: https://cloud.google.com/run/docs/container-contract
- gcloud run deploy reference for Cloud Run deployment flags, probes, CPU boost, memory, and concurrency: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Cloud Run memory limits: https://cloud.google.com/run/docs/configuring/services/memory-limits
- Cloud Run CPU limits and startup CPU boost: https://cloud.google.com/run/docs/configuring/services/cpu
- Cloud Run container build documentation and Artifact Registry image URL format: https://cloud.google.com/run/docs/building/containers
- Google Cloud Build Docker image quickstart for Artifact Registry tagging: https://cloud.google.com/build/docs/build-push-docker-image
- Google distroless container image documentation: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The `main.go` snippet imported `encoding/json` but did not use it, which would prevent the Go service from compiling. Removed the unused import.
- The `handlers.go` snippet called `fmt.Sprintf` but did not import `fmt`, which would prevent the Go service from compiling. Added the missing import.
- The Dockerfile copied `go.sum`, but the tutorial project has no external dependencies and `go mod init` alone does not create a `go.sum` file. Changed the Dockerfile to copy only `go.mod` before `go mod download`.
- The Dockerfile used `golang:1.22-alpine`, which is outside Go's current supported release window as of 2026-05-28. Updated it to `golang:1.26-alpine`.
- The Cloud Run examples used `gcr.io` image paths. Updated them to the current Artifact Registry URL format used by Google Cloud documentation.
- The Cloud Run examples used `--memory 128Mi` with `--cpu 1`. Current Cloud Run documentation says second-generation services require at least 512Mi, and 128Mi is for the first-generation execution environment. Updated examples and explanation to use `512Mi`.
- The distroless wording implied it was a debugging image. Distroless images are minimal runtime images and do not include a shell unless using debug variants. Reworded the sentence.
- The concurrency claim was too absolute. Clarified that hundreds of concurrent requests per 1 vCPU instance is workload-dependent and should be benchmarked.
- The startup CPU boost explanation omitted its 10-second post-startup window. Added that detail.

## Review Notes
- Verified the corrected Go snippets compile with `go test ./...` inside the official `golang:1.26-alpine` Docker image.
- Local `go` and `gcloud` binaries were not installed in the workspace, so Go validation used Docker and Cloud Run CLI validation used official Google Cloud documentation.
