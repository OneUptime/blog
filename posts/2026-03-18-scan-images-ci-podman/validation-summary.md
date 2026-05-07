# Validation Summary: How to Scan Images in CI with Podman

## Status
validated

## Post Type
Tutorial / CI security guide

## Technologies Covered
- Podman
- Trivy
- Grype
- Syft
- GitHub Actions
- Bash
- jq
- SPDX and CycloneDX SBOM formats

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Podman save documentation: https://docs.podman.io/en/v5.0.3/markdown/podman-save.1.html
- Grype getting started documentation: https://oss.anchore.com/docs/guides/vulnerability/getting-started/
- Grype supported scan targets: https://oss.anchore.com/docs/guides/vulnerability/scan-targets/
- Grype CLI reference: https://oss.anchore.com/docs/reference/grype/cli/
- Syft installation documentation: https://oss.anchore.com/docs/installation/syft
- Syft supported scan targets: https://oss.anchore.com/docs/guides/sbom/scan-targets/
- Syft output formats documentation: https://oss.anchore.com/docs/guides/sbom/formats/
- GitHub Actions runner image software list for Ubuntu 24.04: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The standalone Trivy script used `--exit-code 1` but then ran `rm` as the final command, which would mask Trivy's failing exit status. I captured the Trivy exit code, cleaned up the tar file, and exited with the captured status.
- The standalone Grype script claimed it would fail the build on HIGH or CRITICAL vulnerabilities, but `echo` and `rm` after `grype --fail-on high` would mask Grype's failing exit status. I captured the Grype exit code, printed it, cleaned up the tar file, and exited with the captured status.
- The Syft/SBOM example scanned the generated SBOM with `grype --fail-on critical`, but subsequent reporting and cleanup commands would mask a critical-vulnerability failure. I captured the Grype exit code, kept the existing output and cleanup, and exited with the captured status.

## Review Notes
- The current Anchore documentation recommends `https://get.anchore.io/grype` and `https://get.anchore.io/syft` as the primary installer-script URLs, while the raw GitHub installer URLs in the post still resolve successfully.
- Grype and Syft can auto-detect saved image tar archives, and their documentation also supports explicit source schemes such as `docker-archive:` and `oci-archive:` for less ambiguous CI scripts.
- The GitHub-hosted `ubuntu-latest` image currently maps to Ubuntu 24.04 and includes Podman, but runner image contents are maintained externally and can change over time.
