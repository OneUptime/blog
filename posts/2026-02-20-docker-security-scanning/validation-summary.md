# Validation Summary: How to Scan Docker Images for Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Container image vulnerability scanning
- Trivy
- Grype
- Syft SBOM generation
- Docker Scout
- GitHub Actions
- GitLab CI
- SARIF code scanning reports

## Sources Consulted
- Trivy official installation documentation: https://www.trivy.dev/docs/v0.69/getting-started/installation/
- Trivy official filesystem CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_filesystem/
- Trivy official configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy Action official repository documentation: https://github.com/aquasecurity/trivy-action
- Trivy official GitLab CI integration documentation: https://www.trivy.dev/docs/dev/tutorials/integrations/gitlab-ci/
- Anchore Grype official getting started documentation: https://oss.anchore.com/docs/guides/vulnerability/getting-started/
- Anchore Grype official filtering documentation: https://oss.anchore.com/docs/guides/vulnerability/filter-results/
- Docker Scout official image analysis documentation: https://docs.docker.com/scout/explore/analysis/
- Docker Scout CLI reference for CVEs: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout CLI reference for compare: https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Scout CLI reference for recommendations: https://docs.docker.com/reference/cli/docker/scout/recommendations/
- GitHub official SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github

## Issues Found
- The Trivy Debian/Ubuntu installation used the deprecated `apt-key` flow and a distribution codename repository entry. Updated it to the official `gpg --dearmor`, `signed-by`, and `generic main` repository instructions.
- The Trivy Docker example did not mount the Docker socket, which is needed when scanning images from the host Docker engine through the Trivy container. Added the Docker socket volume mount.
- The Grype install command used the raw GitHub install script URL. Updated it to Anchore's current official `https://get.anchore.io/grype` installer command.
- The Grype example said `--fail-on high` only shows high and critical vulnerabilities. That flag sets the failure threshold, not merely a display filter. Reworded the comment to describe the command accurately.
- The GitHub SARIF upload action used `github/codeql-action/upload-sarif@v3`. Updated it to the current documented major version, `v4`.
- The `trivy.yaml` example placed `ignore-unfixed` and `skip-dirs` at the top level. Updated the configuration to use the current `vulnerability.ignore-unfixed` and `scan.skip-dirs` hierarchy.

## Review Notes
- The `.trivyignore` expiration comment is documentation for humans; Trivy does not enforce that date in the plain `.trivyignore` format.
- The GitLab container scanning artifact requires a GitLab tier/configuration that supports container scanning reports.
