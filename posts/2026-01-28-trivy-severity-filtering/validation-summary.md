# Validation Summary: How to Configure Trivy Severity Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy CLI
- Trivy YAML configuration
- Trivy ignore files
- GitHub Actions
- GitLab CI
- SARIF reporting
- jq
- Docker container image scanning

## Sources Consulted
- Trivy filtering documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy vulnerability scanner documentation: https://trivy.dev/docs/latest/scanner/vulnerability/
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy configuration file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy exit code documentation: https://trivy.dev/docs/latest/configuration/others/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action

## Issues Found
- The post stated that Trivy severity levels are based directly on CVSS scores and vulnerability databases. Updated this to clarify that Trivy prefers vulnerability database/vendor severity and falls back to CVSS score ranges when the selected data source does not provide severity.
- The CRITICAL severity description said active exploits are likely. Updated this to a severity-priority description because CRITICAL severity does not by itself mean active exploitation is likely.
- The Trivy config snippets used top-level `ignore-unfixed` and `cache-dir` keys. Updated them to current Trivy config structure: `vulnerability.ignore-unfixed` and `cache.dir`.
- The GitHub Actions example used moving action references and an older SARIF upload action. Updated `aquasecurity/trivy-action` to `v0.36.0`, `github/codeql-action/upload-sarif` to `v4`, and added the required `security-events: write` permission for SARIF upload.
- The SARIF action example applied severity filtering without `limit-severities-for-sarif`. Added this input and included all severities explicitly so the SARIF output matches the example label.
- The post used the old `--vuln-type` CLI examples for OS/library filtering. Updated these to the current `--pkg-types` flag and renamed the section from vulnerability type to package type.
- The `.trivyignore` expiration example used `exp:YYYY-MM-DD` before the CVE ID. Updated it to the documented syntax with the expiration suffix after the ID.
- The `.trivyignore.yaml` example used `reason` and `expires` fields. Updated these to the documented `statement` and `expired_at` fields.

## Review Notes
- The local environment did not have `trivy` installed, so validation was performed against the current official Trivy documentation and Trivy GitHub Action documentation.
- The examples remain version-sensitive because Trivy CLI flags and GitHub Action inputs can change over time; future reviews should re-check against the Trivy CLI reference for the current release.
