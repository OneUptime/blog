# Validation Summary: How to Use Docker Scout SBOM Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Scout CLI
- Docker Buildx / BuildKit SBOM attestations
- SPDX SBOM format
- CycloneDX SBOM format
- GitHub Actions
- ORAS OCI artifacts
- Grype vulnerability scanning
- jq and shell utilities

## Sources Consulted
- Docker Scout SBOM CLI reference: https://docs.docker.com/reference/cli/docker/scout/sbom/
- Docker Scout SBOM how-to: https://docs.docker.com/scout/how-tos/view-create-sboms/
- Docker Scout CVEs CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout installation documentation: https://docs.docker.com/scout/install/
- Docker Build SBOM attestations documentation: https://docs.docker.com/build/metadata/attestations/sbom/
- Docker Buildx build CLI reference: https://docs.docker.com/engine/reference/commandline/build
- Docker Buildx imagetools inspect CLI reference: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- ORAS push documentation: https://oras.land/docs/1.1/commands/oras_push/
- SPDX overview: https://spdx.dev/about/overview/
- OWASP CycloneDX overview: https://devguide.owasp.org/en/05-implementation/02-dependencies/03-cyclonedx/
- CISA SBOM overview: https://www.cisa.gov/sbom
- NTIA minimum elements for SBOM: https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom
- Anchore Grype getting started documentation: https://oss.anchore.com/docs/guides/vulnerability/getting-started/

## Issues Found
- The post stated that `docker scout sbom` defaults to SPDX JSON. Docker's documentation says the default is Docker Scout JSON and is not SPDX JSON. Updated the default-format wording and file extension examples, and kept SPDX examples behind `--format spdx`.
- The remote-image example did not force registry resolution. Updated it to use the documented `registry://` prefix for analyzing a registry image without using a local image.
- The post implied Docker Scout is always available without installation. Docker's docs say it is pre-installed with Docker Desktop, but Docker Engine users may need to install the CLI plugin. Updated the explanation and added an install step to the GitHub Actions example.
- The BuildKit section described SBOMs as embedded directly in the image manifest. Docker documents this as SBOM attestations attached to the image index when pushed. Updated the explanation and changed the build example to use Docker Scout's SBOM indexer attestation generator.
- The vulnerability scanning example used a non-existent `docker scout cves --sbom` flag. Docker Scout accepts SBOM files through the `sbom://` artifact prefix. Updated the command to `docker scout cves sbom://myapp-sbom.json`.
- The Grype SBOM example used `grype sbom:myapp-sbom.json`. Current Grype documentation shows scanning an existing SBOM by passing the SBOM file path directly. Updated the example to `grype myapp-sbom.json`.
- The rebuild guidance implied cached rebuilds may pull different package versions. Refined it to say rebuilds can change packages when mutable base tags update or package installation layers are re-run.

## Review Notes
The remaining examples are technically plausible, but real output depends on the installed Docker Scout CLI version, registry authentication, Docker Scout entitlements, image platform, and whether the image has been pushed to a registry. The `RepoDigests` example assumes the image has an available repository digest, which is normally true for images pulled from or pushed to a registry.
