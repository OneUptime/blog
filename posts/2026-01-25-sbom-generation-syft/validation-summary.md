# Validation Summary: How to Generate SBOMs with Syft

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Syft
- Software Bill of Materials (SBOM)
- SPDX
- CycloneDX
- GitHub Actions
- GitLab CI/CD
- Grype
- Cosign
- Docker BuildKit / Buildx
- ORAS
- jq

## Sources Consulted
- Anchore Syft CLI reference: https://oss.anchore.com/docs/reference/syft/cli/
- Anchore Syft supported scan targets: https://oss.anchore.com/docs/guides/sbom/scan-targets/
- Anchore Syft configuration reference: https://github.com/anchore/syft/wiki/configuration
- Anchore Syft installation documentation: https://oss.anchore.com/docs/installation/syft/
- Anchore sbom-action documentation: https://github.com/anchore/sbom-action
- GitHub actions/upload-artifact documentation: https://github.com/actions/upload-artifact
- softprops/action-gh-release releases: https://github.com/softprops/action-gh-release/releases
- Anchore Grype documentation: https://github.com/anchore/grype
- Sigstore Cosign verify-attestation documentation: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md
- Docker SBOM attestation documentation: https://docs.docker.com/build/metadata/attestations/sbom/
- ORAS formatted output and attach/push documentation: https://oras.land/docs/how_to_guides/format_output/

## Issues Found
- The Linux install command used the legacy raw GitHub install script URL. Updated it to the current official `https://get.anchore.io/syft` install URL.
- The verification output showed `syft 0.100.0`, which is outdated relative to current Syft 1.x releases. Changed the example to a generic `syft 1.x.x`.
- The GitHub Actions workflow used deprecated `actions/upload-artifact@v3`. Updated it to `actions/upload-artifact@v7` based on the current action documentation.
- The GitHub Actions release upload step used `softprops/action-gh-release@v1`. Updated it to the maintained Node 20-compatible `@v2` line and added `contents: write` permissions needed for release asset upload.
- The GitLab CI example used `anchore/syft:latest`, which can fail in GitLab because the standard Syft image is a CLI-focused image without a normal shell. Updated the job to use the debug image and clear the entrypoint.
- The Cosign attestation verification command omitted key or keyless identity constraints. Updated the example to a key-based flow with `--key cosign.key` and `--key cosign.pub`.
- The Docker BuildKit example used `docker build --sbom=true`; Docker's SBOM attestation documentation shows this flow with `docker buildx build`. Updated the command accordingly.
- The Syft configuration sample used invalid nested keys under `package.cataloger`. Replaced them with the current top-level `scope: "all-layers"` setting.

## Review Notes
The remaining Syft scan target examples, output format examples, Grype SBOM scanning flow, Docker Buildx SBOM attestation flow, ORAS artifact storage example, and jq queries are technically sound. Some example package versions in sample SBOM output are illustrative and may differ when scanning current base images.
