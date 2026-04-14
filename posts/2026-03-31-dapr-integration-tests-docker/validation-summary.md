# Validation Summary: How to Run Dapr Integration Tests in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (daprd sidecar, HTTP API, state management, service invocation)
- Docker / Docker Compose
- Go (integration testing with build tags)
- Redis (as Dapr state store / pub-sub backend)
- GitHub Actions (CI pipeline)
- Make (build automation)

## Sources Consulted
- Dapr CLI / daprd arguments reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr self-hosted with Docker guide: https://docs.dapr.io/operations/hosting/self-hosted/self-hosted-with-docker/
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Docker Hub daprio/daprd image: https://hub.docker.com/r/daprio/daprd
- Docker Compose CLI reference (`--wait` flag): https://docs.docker.com/reference/cli/docker/compose/up/
- Go build constraints documentation: https://pkg.go.dev/cmd/go#hdr-Build_constraints

## Issues Found
1. **Deprecated `--components-path` flag** (line 77 of the Docker Compose snippet): The `--components-path` flag for `daprd` is deprecated in favor of `--resources-path`. Official Dapr documentation and Docker hosting examples now use `--resources-path`. Changed `"--components-path"` to `"--resources-path"` in the daprd command arguments.

## Review Notes
- The `daprio/daprd:1.13.0` image is valid but dates from March 2024. Newer Dapr versions are available; readers should consider using a more recent version.
- Starting with Dapr v1.13.0, the default Helm chart registry switched to `ghcr.io`, but the Docker Hub `daprio/daprd` images remain available.
- The Makefile target uses `|| true` after `go test`, which means test failures won't propagate as a non-zero exit code. This is intentional to ensure `docker compose down` always runs, but it means the CI step itself won't fail on test failures. A `trap` or storing the exit code would be a more robust pattern, though this is a design choice rather than a technical error.
- All Dapr HTTP API paths (`/v1.0/invoke/...`, `/v1.0/state/...`) and expected response codes (200 for invocation, 204 for state save) are correct.
- The Go build tag syntax (`//go:build integration`) is the modern format introduced in Go 1.17 and is correct.
- The Docker Compose `--wait` flag correctly waits for healthchecks before returning, as described in the post.
