# Validation Summary: How to Use Docker Scout to Analyze Image Vulnerabilities

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Scout
- Docker CLI
- Docker images and registries
- Software Bill of Materials (SBOM)
- CVE vulnerability scanning
- Docker Compose
- GitHub Actions

## Sources Consulted
- Docker Scout overview: https://docs.docker.com/scout/
- Docker Scout install documentation: https://docs.docker.com/scout/install/
- Docker Scout CVE CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout SBOM CLI reference: https://docs.docker.com/reference/cli/docker/scout/sbom/
- Docker Scout compare CLI reference: https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Scout recommendations CLI reference: https://docs.docker.com/reference/cli/docker/scout/recommendations/
- Docker Scout policy CLI reference: https://docs.docker.com/reference/cli/docker/scout/policy/
- Docker Scout repository CLI reference: https://docs.docker.com/reference/cli/docker/scout/repo/enable/
- Docker Scout watch CLI reference: https://docs.docker.com/reference/cli/docker/scout/watch/
- Docker Scout advisory database sources: https://docs.docker.com/scout/advisory-db-sources
- Docker Scout artifact type prefixes: https://docs.docker.com/scout/how-tos/artifact-types/
- Docker Scout GitHub Actions integration: https://docs.docker.com/scout/integrations/ci/gha/
- docker/scout-action documentation: https://github.com/docker/scout-action

## Issues Found
- The installation command piped the downloaded installer directly to `sh`. Docker's official install documentation downloads the installer first and then runs it, so the post now uses `curl -o install-scout.sh` followed by `sh install-scout.sh`.
- The post described Docker Scout as using only the standard CVSS severity scale. Docker Scout prioritizes advisory source severity data and CVSS scoring, so the wording was corrected.
- The remote image scan examples used unprefixed image references, which can resolve to a local image first. The examples now use the `registry://` prefix to force registry analysis without using the local image store.
- The GitHub Actions workflow assumed the Scout CLI was available on the runner and used raw CLI commands. It now uses the official `docker/scout-action@v1`, with current inputs for `cves` and `sbom`, and updates `docker/login-action` to `v4`.
- The monitoring section used `docker scout repo enable` with a registry hostname embedded in the repository argument and described `docker scout watch` as a status command. It now uses `docker scout repo enable myapp --registry myregistry.example.com` and `docker scout repo list`.
- The CVE details example used `docker scout cves --format json`, but the current `cves` command does not support a generic `json` output format. It now uses `--only-cve-id` and `--details`.
- The introduction claimed the examples found and fixed "real vulnerabilities" while the sample CVE IDs are illustrative. The wording was adjusted to avoid overclaiming.

## Review Notes
The post is technically valid after correction. Some example output remains illustrative rather than a live scan result, which is acceptable for a tutorial but should not be presented as exact output from current `nginx:latest`.
