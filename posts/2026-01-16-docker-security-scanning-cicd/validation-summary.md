# Validation Summary: How to Implement Docker Security Scanning in CI/CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Trivy
- Snyk
- Grype
- Syft
- Hadolint
- TruffleHog
- Slack GitHub Action

## Sources Consulted
- Aqua Security Trivy Action: https://github.com/aquasecurity/trivy-action
- Trivy configuration file documentation: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy filtering and `.trivyignore.yaml` documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy secret scanning configuration: https://trivy.dev/docs/latest/scanner/secret/
- Snyk Docker GitHub Action documentation: https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities/snyk-docker-action
- Snyk GitHub Actions documentation: https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities
- Anchore scan-action documentation: https://github.com/anchore/scan-action
- Anchore SBOM action documentation: https://github.com/marketplace/actions/anchore-sbom-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- GitLab CI artifacts report documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- Jenkins Pipeline artifact documentation: https://www.jenkins.io/doc/pipeline/steps/core/
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Slack GitHub Action incoming webhook documentation: https://docs.slack.dev/tools/slack-github-action/sending-data-slack-incoming-webhook

## Issues Found
- GitHub Actions examples that upload SARIF reports were missing `security-events: write` permissions. Added `permissions` blocks to the Trivy, Snyk, and Grype SARIF upload workflows so the upload step can authenticate with GitHub code scanning.
- The Snyk SARIF example uploaded `snyk.sarif` without ensuring the Docker action generated that file and without allowing the upload step to run after Snyk found vulnerabilities. Added `--file=Dockerfile` and `continue-on-error: true`, matching Snyk's documented SARIF workflow pattern.
- The Grype examples used `anchore/scan-action@v3`, while the current official Anchore documentation uses `@v7`. Updated Grype scan steps to `anchore/scan-action@v7`.
- The Trivy configuration example used `.trivy.yaml` and an invalid `misconfiguration.config-data` shape. Updated the filename to `trivy.yaml`, used documented `scan.scanners`, `misconfiguration.scanners`, and `ignorefile` keys, and kept the existing secret and vulnerability settings.
- The `.trivyignore.yaml` example used `expires`, but Trivy documents the field as `expired_at`. Renamed the field.
- The Slack notification example used the older `slackapi/slack-github-action@v1.24.0` incoming webhook style. Updated it to the current `@v3.0.3` syntax with `webhook`, `webhook-type: incoming-webhook`, and YAML payload content.
- The registry scanning workflow intended to create issues on critical findings, but Trivy was not configured to fail on critical vulnerabilities, so `if: failure()` would not run for findings. Added `exit-code: '1'` and `severity: 'CRITICAL'`.
- The registry scanning workflow used the raw image name inside the SARIF output filename, which could include `/` and `:`. Replaced the matrix with explicit safe report filenames.

## Review Notes
- The snippets still use floating action references such as `@master` for Trivy and Snyk where the upstream documentation also shows those forms. For production workflows, pinning actions to immutable commit SHAs would be safer.
- `.trivyignore.yaml` is still documented by Trivy as experimental and must be explicitly referenced with `--ignorefile` or the equivalent `ignorefile` configuration key.
