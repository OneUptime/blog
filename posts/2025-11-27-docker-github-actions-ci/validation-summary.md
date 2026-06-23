# Validation Summary: How to Plug Docker into GitHub Actions for Fast, Secure CI

## Status
validated

## Post Type
Tutorial / Guide (end-to-end CI pipeline walkthrough with copy-paste workflow snippets)

## Technologies Covered
- Docker (BuildKit, buildx)
- GitHub Actions
- GitHub Container Registry (ghcr.io)
- `docker/build-push-action`, `docker/setup-buildx-action`, `docker/setup-qemu-action`, `docker/login-action`
- `actions/checkout`, `actions/cache`
- Trivy (`aquasecurity/trivy-action`) vulnerability scanning
- SLSA provenance & SBOM attestations
- Syft (SBOM generation, mentioned)
- Docker Compose (smoke/integration testing)

## Sources Consulted
- docker/build-push-action README (load/push behavior, provenance, sbom, cache options) — https://github.com/docker/build-push-action
- docker/build-push-action issue #892 (built image loaded but not visible to docker) — https://github.com/docker/build-push-action/issues/892
- aquasecurity/trivy-action README & releases — https://github.com/aquasecurity/trivy-action and https://github.com/aquasecurity/trivy-action/releases
- aquasecurity/trivy-action issue #278 (scan locally built/tagged image) — https://github.com/aquasecurity/trivy-action/issues/278
- Docker buildx cache backends docs (type=local, type=gha) — https://docs.docker.com/build/cache/backends/
- GitHub Actions docs: `actions/cache`, environments/approvals, `GITHUB_TOKEN` permissions — https://docs.github.com/actions
- SLSA provenance / build attestations docs — https://docs.docker.com/build/metadata/attestations/

## Issues Found
1. **Missing `load: true` on the PR build step (functional error).** Section 4 scans the freshly built image with Trivy via `image-ref: ghcr.io/acme/api:pr-...`, but the build step in Section 3 used `push: false` with no `load: true`. With buildx/BuildKit the build output stays in the build cache and is **not** loaded into the local Docker image store, so Trivy would fail to find the image (image-not-found). Added `load: true` to the build step so the image is available locally for scanning. (`load: true` is valid here because the PR build is single-platform.)

2. **Imprecise provenance/signature claim.** The line "`provenance: true` uploads SLSA build metadata; GitHub can verify signatures automatically" was misleading — `build-push-action`'s `provenance: true` embeds a SLSA provenance attestation in the image index; it is not a signature that GitHub verifies automatically. Reworded to: "attaches a SLSA provenance attestation to the image index, so consumers can verify how and where the image was built."

## Review Notes
- `aquasecurity/trivy-action@0.34.0` is a real, valid release tag. Latest at review time is ~v0.36.0, but pinning a specific version is good practice. Note: the trivy-action/setup-trivy GitHub Actions were subject to a supply-chain compromise incident; pinning to a full commit SHA rather than a version tag is the most defensive option, but a version tag is acceptable and matches the post's style.
- The local cache strategy (`actions/cache` + `type=local` + manual cache rotation) is correct and was the canonical workaround for unbounded cache growth. The newer `cache-to/cache-from: type=gha` backend is now generally preferred and removes the need for the manual "Move cache" step — worth mentioning as a future improvement, but the local approach shown is still valid.
- `id-token: write` is included with the comment "Sign images with OIDC (for provenance)." This permission is required for keyless/OIDC signing flows (e.g. `actions/attest-build-provenance` or cosign keyless); `build-push-action`'s own `provenance: true` does not strictly require it. Harmless to include and reasonable for a signing-enabled pipeline.
- Action versions (`checkout@v4`, `setup-buildx-action@v3`, `setup-qemu-action@v3`, `login-action@v3`, `build-push-action@v6`, `cache@v4`) are all current major versions.
- `docker compose` (v2 plugin syntax) usage, `down -v`, environments with approval gating, and `needs:`/`environment:` job config are all accurate.
