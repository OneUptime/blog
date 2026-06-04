# Validation Summary: How to Use docker scout Commands for Security Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Scout
- Docker CLI plugins
- Container vulnerability scanning
- CVE analysis
- SBOM generation
- SARIF
- GitHub Actions
- Dockerfiles

## Sources Consulted
- Docker Scout CLI reference: https://docs.docker.com/reference/cli/docker/scout/
- Docker Scout CVEs command reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Scout SBOM command reference: https://docs.docker.com/reference/cli/docker/scout/sbom/
- Docker Scout quickview command reference: https://docs.docker.com/reference/cli/docker/scout/quickview/
- Docker Scout recommendations command reference: https://docs.docker.com/reference/cli/docker/scout/recommendations/
- Docker Scout compare command reference: https://docs.docker.com/reference/cli/docker/scout/compare/
- Docker Scout policy command reference: https://docs.docker.com/reference/cli/docker/scout/policy/
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Docker login action documentation: https://github.com/docker/login-action

## Issues Found
- The post used `docker scout cves --format json`, but the current `cves` command does not support a plain `json` format. Changed the CI processing example to use supported SARIF JSON output with `--format sarif --output scout-results.sarif.json`.
- The post used `docker scout cves --cve-id`, but the current flag is `--only-cve-id`. Updated the command accordingly.
- The post showed `docker scout quickview my-app:latest --ref nginx:latest`, but `quickview --ref` is for archive references, not comparing against another image. Reworded the example to describe base image recommendations shown by quickview when metadata is available.
- The post described `recommendations` as package update guidance. Docker Scout recommendations focus on base image refreshes and updates to reduce vulnerabilities or image size, so the description was corrected.
- The layer analysis example piped unsupported JSON from `docker scout cves` into `jq`. Replaced it with the supported `--locations` option and adjusted the explanation from Dockerfile instruction-level attribution to layer or file path attribution.
- The shell CI gate counted critical and high findings from unsupported JSON output. Reworked it to use Docker Scout's supported `--exit-code` behavior and handle Scout exit status `2` for detected vulnerabilities.
- The GitHub Actions CVE scan step did not fail the job on vulnerabilities. Added `--exit-code` and limited the gate to critical vulnerabilities to match the surrounding text.

## Review Notes
The remaining commands and snippets are consistent with the current Docker Scout CLI documentation. Some Docker Scout features depend on image metadata, Docker account access, and Docker Scout service availability, so behavior can vary for local-only images or images unavailable to the configured registry credentials.
