# Validation Summary: How to Build Docker Images with Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker / Dockerfile
- BuildKit (Dockerfile syntax 1.4, `--mount=type=secret`)
- Multi-stage builds
- Node.js base images (`node:20`, `node:20-slim`, `node:20-alpine`)
- Python base images (`python:3.12`, `-slim`, `-alpine`)
- Go base images (`golang:1.22`, `-alpine`) and static binary builds (CGO_ENABLED=0)
- Distroless images (`gcr.io/distroless/static-debian12`, `gcr.io/distroless/nodejs20`)
- Alpine BusyBox utilities (`addgroup -S`, `adduser -S`)
- npm (`npm ci`, `--omit=dev`)
- pip (`--no-cache-dir`)
- apt-get (`--no-install-recommends`)
- HEALTHCHECK instruction and flags
- OCI image spec annotations (`org.opencontainers.image.*`)
- Image vulnerability scanners: Trivy, Docker Scout, Grype

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker BuildKit / build secrets documentation: https://docs.docker.com/build/building/secrets/
- Docker HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- npm CLI documentation for `npm ci` and `--omit`: https://docs.npmjs.com/cli/v10/commands/npm-ci
- OCI Image Spec annotations: https://github.com/opencontainers/image-spec/blob/main/annotations.md
- GoogleContainerTools/distroless README (user/group permissions section): https://github.com/GoogleContainerTools/distroless
- Trivy documentation: https://aquasecurity.github.io/trivy/
- Docker Scout documentation: https://docs.docker.com/scout/
- Anchore Grype documentation: https://github.com/anchore/grype
- Go build flags reference: https://pkg.go.dev/cmd/go and https://pkg.go.dev/cmd/link (for `-ldflags="-w -s"`)
- Alpine BusyBox `adduser`/`addgroup` man pages: https://busybox.net/downloads/BusyBox.html

## Issues Found
1. **Incorrect claim that distroless images run as nonroot by default.** The original Go example contained the comment "Distroless runs as nonroot by default (UID 65532)" next to the `USER nonroot:nonroot` line. Per the official distroless documentation, distroless images run as **root by default**; either the `:nonroot` tag variant must be used, or the `USER nonroot:nonroot` instruction must be explicitly set (as the example does). The comment was updated to accurately state that distroless images run as root by default, and that the included `nonroot` user (UID 65532) allows us to explicitly switch to it.

## Review Notes
- The image size estimates in the comparison tables (e.g., `node:20-alpine` ~130MB, `python:3.12-alpine` ~50MB, `gcr.io/distroless/static` ~2MB) are reasonable approximations; exact sizes drift over time and across architectures.
- `npm ci --omit=dev` is the correct modern flag (replacing the legacy `--production` flag).
- Alpine-specific busybox `addgroup -S` / `adduser -S` syntax is correct for `node:20-alpine`. Readers should be aware that on Debian/Ubuntu-based images the flags differ (use `--system`).
- The HEALTHCHECK uses `wget --no-verbose --tries=1 --spider`. BusyBox wget in recent Alpine releases supports `--spider` and `--no-verbose`; behavior of `--tries` can vary across BusyBox versions. The pattern is widely used in practice and works on current Alpine images, but readers running on older Alpine versions or minimal busybox builds may want to fall back to `wget -q --spider <url>` or install GNU `wget` via `apk add --no-cache wget`. Left unchanged because the pattern works on current `node:20-alpine`.
- The OCI label set used matches the current [image-spec annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md) (`title`, `description`, `version`, `vendor`, `source`, `created`, `revision`). All correct.
- The `# syntax=docker/dockerfile:1.4` directive is the canonical way to opt into BuildKit features like `--mount=type=secret`. Newer 1.x point releases also work; pinning to 1.4 is conservative and accurate.
- `gcr.io/distroless/static-debian12` is the explicit current name; the comparison table's shorter `gcr.io/distroless/static` and `gcr.io/distroless/nodejs20` references still resolve as aliases at the time of review but the explicit `-debian12` form is preferred for new code.
- Trivy, Docker Scout (`docker scout cves <image>`), and Grype CLI invocations are all correct.
