# Validation Summary: How to Verify Flux CD Software Bill of Materials (SBOM)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Software Bill of Materials (SBOM)
- SPDX JSON
- Sigstore Cosign
- Docker Buildx
- Grype
- GitHub Actions
- jq

## Sources Consulted
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux release documentation: https://fluxcd.io/flux/releases/
- SPDX overview: https://spdx.dev/about/overview/
- Docker Buildx `imagetools inspect` reference: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker SBOM attestations documentation: https://docs.docker.com/build/metadata/attestations/sbom/
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign installer GitHub Action: https://github.com/sigstore/cosign-installer
- Grype CLI reference: https://oss.anchore.com/docs/reference/grype/cli/
- Grype installation documentation: https://oss.anchore.com/docs/installation/grype/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post used `cosign download sbom` for Flux controller images. Current Cosign warns that SBOM attachments are deprecated and, for the tested Flux controller image tag, returned `no sbom attached to reference`. I replaced those commands with Flux- and Docker-documented `docker buildx imagetools inspect ... --format '{{ json (index .SBOM "linux/amd64").SPDX}}'` extraction.
- The controller-image section retrieved SBOMs but did not actually verify the signed images. I added `cosign verify` commands using Flux's documented GitHub OIDC issuer and Flux GitHub identity pattern.
- The Go module listing command selected any package with `externalRefs`, which also includes Alpine packages and CPE references. I changed it to filter package URLs that start with `pkg:golang/`.
- The GitHub Actions workflow used `anchore/scan-action/download-grype@v4`, which is not the current documented Grype installation path. I replaced it with Anchore's documented installer script.
- The GitHub Actions workflow installed Cosign with `sigstore/cosign-installer@v3`. Current sigstore/cosign-installer documentation shows `v4.1.0`, so I updated the workflow to that version.
- The workflow needed Docker Buildx for the corrected SBOM extraction method. I added `docker/setup-buildx-action@v3`.
- The prerequisites did not mention Docker Buildx even though the corrected commands require it. I added Docker Desktop installation through Homebrew for the existing macOS/Homebrew-oriented prerequisite list.

## Review Notes
- I verified that the Flux v2.4.0 GitHub release includes `flux_2.4.0_sbom.spdx.json`.
- I verified with Docker Buildx that the controller image tags used in the post expose Linux AMD64 SPDX 2.3 SBOM JSON.
- I verified that `cosign verify` succeeds for `ghcr.io/fluxcd/source-controller:v1.4.1` with the documented Flux identity and OIDC issuer flags.
- The examples extract the `linux/amd64` SBOM. Users deploying other architectures should change the platform key, for example to `linux/arm64` or `linux/arm/v7`.
