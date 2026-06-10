# Validation Summary: How to Use Docker BuildKit Features

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker BuildKit
- Docker Buildx (CLI plugin)
- Dockerfile frontend (docker/dockerfile syntax directive, including labs channel)
- Multi-platform / multi-arch builds (linux/amd64, linux/arm64, linux/arm/v7) with QEMU
- Here-documents in Dockerfiles (RUN/COPY <<EOF)
- BuildKit output exporters (docker, oci, local)
- Build ARG scoping rules
- BuildKit cache management and garbage collection (buildkitd.toml)
- Buildx Bake (HCL configuration)
- Attestations: SBOM and provenance (--sbom, --provenance)
- GitHub Actions integration (docker/setup-buildx-action, docker/build-push-action, docker/metadata-action, docker/login-action, docker/setup-qemu-action)
- Cache mounts (RUN --mount=type=cache)

## Sources Consulted
- Docker Buildx CLI reference: https://docs.docker.com/reference/cli/docker/buildx/
- `docker builder prune` reference: https://docs.docker.com/reference/cli/docker/builder/prune/
- `docker buildx prune` reference: https://docs.docker.com/reference/cli/docker/buildx/prune/
- `docker buildx build` reference (progress, output, platforms, sbom, provenance): https://docs.docker.com/reference/cli/docker/buildx/build/
- BuildKit TOML configuration: https://docs.docker.com/build/buildkit/toml-configuration/
- Dockerfile frontend (syntax directive, labs channel): https://docs.docker.com/build/buildkit/frontend/ and https://hub.docker.com/r/docker/dockerfile
- BuildKit overview / DOCKER_BUILDKIT env var: https://docs.docker.com/build/buildkit/
- Buildx Bake HCL reference: https://docs.docker.com/build/bake/reference/
- Multi-platform builds & ARG TARGETOS/TARGETARCH/BUILDPLATFORM: https://docs.docker.com/build/building/multi-platform/ and https://docs.docker.com/reference/dockerfile/#automatic-platform-args-in-the-global-scope
- Here-documents in Dockerfiles: https://docs.docker.com/reference/dockerfile/#here-documents
- GitHub Actions Docker actions (setup-buildx-action v3, build-push-action v5, metadata-action v5, login-action v3, setup-qemu-action v3) — github.com/docker/* repos

## Issues Found

1. **Invalid `--dry-run` flag on `docker builder prune`** — The post showed `docker builder prune --all --dry-run` to preview what would be removed. Neither `docker builder prune` nor `docker buildx prune` supports a `--dry-run` flag. Replaced with `docker builder prune --all --force` (a valid flag that skips the confirmation prompt) so the example remains useful without misrepresenting the CLI.

2. **Deprecated buildkitd.toml GC field names** — The post used `gckeepstorage` (in `[worker.oci]`) and `keepBytes` (in `[[worker.oci.gcpolicy]]`). These are deprecated aliases retained for backward compatibility but no longer in the current official BuildKit TOML configuration docs. Updated both `buildkitd.toml` examples to use the modern documented field names: `gcreservedspace` (with disk-space string like `"20GB"`) and `reservedSpace` in the gcpolicy block. Kept `keepDuration` as an integer-seconds value, which BuildKit's config parser still accepts (it also accepts duration strings like `"168h"`).

## Review Notes
- The `# syntax=docker/dockerfile:1.6` directive and `1.6-labs` channel reference are valid; the dockerfile frontend continues to be versioned this way (latest stable line is `1.x`; pinning to a specific patch like `1.6.0` is a valid reproducibility practice).
- `DOCKER_BUILDKIT=1` is still recognized for opting into BuildKit on Docker Engine 18.09+, though from Docker 23+ BuildKit is the default and the variable is largely a no-op on modern engines. The post correctly frames this as an explicit opt-in mechanism.
- The `features.buildkit` field in `daemon.json` is similarly a legacy opt-in; harmless on modern installs.
- Platform automatic build args (`BUILDPLATFORM`, `BUILDOS`, `BUILDARCH`, `BUILDVARIANT`, `TARGETPLATFORM`, `TARGETOS`, `TARGETARCH`, `TARGETVARIANT`) are all valid and correctly described.
- Output exporters (`type=docker`, `type=oci`, `type=local`) and the `--target ... --output type=local` artifact-extraction pattern are correct.
- Here-document syntax (`RUN <<EOF`, `RUN <<EOF python3`, `COPY <<EOF dest`) requires Dockerfile frontend 1.3+; with the `1.6` syntax directive shown, all examples are valid.
- The GitHub Actions example uses current major versions of the official Docker actions (setup-buildx-action@v3, build-push-action@v5, metadata-action@v5, login-action@v3, setup-qemu-action@v3) and the `cache-from: type=gha` / `cache-to: type=gha,mode=max` pattern is the documented approach for GitHub Actions cache.
- Buildx Bake HCL example (variables, groups, targets, `inherits`, `cache-from`/`cache-to` with registry refs) matches the current Bake reference.
- The `--progress=tty` value is valid (along with `auto`, `plain`, `quiet`, `rawjson`).
- Future caveat: BuildKit's gc policy field naming has churned (keepBytes → reservedSpace; gckeepstorage → gcreservedspace). If BuildKit drops the deprecated aliases in a future release, any remaining older config snippets in the wild will break — readers should prefer the modern field names this post now uses.
