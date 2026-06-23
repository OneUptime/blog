# Validation Summary: How to Containerize Go Apps with Multi-Stage Dockerfiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Docker multi-stage builds
- Dockerfile syntax and BuildKit cache mounts
- scratch container images
- Distroless container images
- Docker Buildx multi-platform builds
- Docker Compose
- GitHub Actions
- Trivy
- Snyk
- Air live reload

## Sources Consulted
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build variables documentation: https://docs.docker.com/build/building/variables/
- Docker multi-platform builds documentation: https://docs.docker.com/build/building/multi-platform/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Go cgo documentation: https://pkg.go.dev/cmd/cgo
- Go command documentation: https://pkg.go.dev/cmd/go
- Distroless project documentation: https://github.com/GoogleContainerTools/distroless
- Air documentation: https://github.com/air-verse/air
- Trivy CLI documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy exit code documentation: https://trivy.dev/docs/latest/configuration/others/
- Snyk container CLI documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/container
- Snyk container test documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/container-test
- Snyk container monitor documentation: https://docs.snyk.io/developer-tools/snyk-cli/snyk-cli/commands/container-monitor
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- Docker Buildx create documentation: https://docs.docker.com/reference/cli/docker/buildx/create/
- Docker Buildx build documentation: https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found
- The sample Go program declared `startTime` but never used it, which makes the program fail to compile. Removed the unused variable.
- The production Dockerfile used BuildKit cache mounts without an explicit Dockerfile syntax directive. Added `# syntax=docker/dockerfile:1`.
- The production Dockerfile ran `file main` but did not install the Alpine `file` package. Added `file` to the builder package installation.
- The production Dockerfile referenced a `VERSION` build argument without declaring it. Added `ARG VERSION=dev` and used that value in the linker flags.
- Several scratch-based examples used `USER appuser:appuser` but copied only `/etc/passwd`. Added `/etc/group` copies so the named group resolves correctly.
- The multi-architecture Dockerfile uses BuildKit platform arguments. Added the Dockerfile syntax directive for consistency with Docker's BuildKit examples.
- Docker Compose examples included the obsolete top-level `version: '3.8'` key. Removed it to match the current Compose Specification.
- The debug Compose example used `pid: "shareable"`, which is not valid Compose syntax for sharing a PID namespace. Removed it and kept the valid `pid: "service:app"` setting on the debug service.
- The scratch limitation text overstated timezone behavior. Clarified that missing timezone data affects named zone loading with `time.LoadLocation()`.
- The production health check comment said the exec-form health check would fail because scratch has no shell. Clarified that it works only if the binary implements the health check command.
- The image size comparison claimed plain `alpine:3.19` has HTTPS support by default. Corrected it to note that CA certificates must be installed or copied.
- The permission troubleshooting snippet used `RUN chmod +x /main`, which is not usable in a scratch runtime stage. Replaced it with `COPY --chmod=755 --from=builder /app/main /main`.

## Review Notes
- Verified the corrected sample Go program with `go test ./...` inside `golang:1.22-alpine`.
- Built the scratch non-root Dockerfile example successfully with the sample app.
- Built the production Dockerfile example successfully, including the static binary verification step.
- Built the build-argument/version-injection Dockerfile example successfully with sample build arguments.
- Validated the Docker Compose development and debug snippets with current `docker compose config --quiet`.
- Go 1.22 and Alpine 3.19 are older fixed versions, but the examples remain technically valid for a version-pinned tutorial.
