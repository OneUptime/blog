# Validation Summary: How to Create Dependency Scanning Integration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dependency scanning / Software Composition Analysis
- GitHub Actions
- Snyk
- GitHub Dependabot
- Trivy
- Syft
- Grype
- SBOM formats: CycloneDX and SPDX
- npm audit
- OpenTelemetry JavaScript metrics
- SARIF / GitHub Code Scanning

## Sources Consulted
- Snyk Node Action documentation: https://docs.snyk.io/developer-tools/integrations/snyk-ci-cd-integrations/github-actions-for-snyk-setup-and-checking-for-vulnerabilities/snyk-node-action
- Snyk GitHub Actions README: https://github.com/snyk/actions/blob/master/node/README.md
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- GitHub Dependabot options reference: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy SARIF reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Anchore SBOM Action documentation: https://github.com/marketplace/actions/anchore-sbom-action
- Syft README and output examples: https://github.com/anchore/syft
- Grype README and SBOM scan examples: https://github.com/anchore/grype
- npm audit CLI documentation: https://docs.npmjs.com/cli/audit/
- peter-evans/create-pull-request documentation: https://github.com/peter-evans/create-pull-request
- OpenTelemetry JS SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- NVD CVSS vulnerability metrics reference: https://nvd.nist.gov/vuln-metrics/cvss

## Issues Found
- The Snyk workflow uploaded `snyk.sarif` without generating it. Added `--sarif-file-output=snyk.sarif`, the required Code Scanning permissions, `continue-on-error` for the Snyk step, and a final failure step so SARIF upload can run while preserving the blocking behavior.
- The Trivy workflows uploaded SARIF without declaring Code Scanning permissions. Added `contents: read` and `security-events: write` to the relevant jobs.
- The auto-remediation workflow claimed `repository_dispatch` triggers when Dependabot alerts are created. Updated the comment to clarify that `repository_dispatch` requires external automation to dispatch that event.
- The auto-remediation workflow used `require('@actions/core')` inside an inline Node script without installing that package. Replaced it with writes to `$GITHUB_OUTPUT`.
- The auto-remediation workflow referenced `steps.audit.outputs.fixes` without setting that output. Added a multiline `fixes` output.
- The auto-remediation workflow manually created, committed, and pushed a branch before invoking `peter-evans/create-pull-request`, which conflicts with the action's intended workspace-change flow. Changed the workflow to let the action commit, push, and create the PR.
- The auto-remediation workflow had malformed Markdown fences inside the YAML example. Changed the outer fence to four backticks and fixed the inner JSON fence.
- The Python remediation script assumed npm audit `fixAvailable` is always an object and `via` entries are always advisory objects. Updated the parsing to handle boolean `fixAvailable` values and mixed string/object `via` entries.
- The OpenTelemetry metrics example used the removed `MeterProvider.addMetricReader()` pattern and passed an exporter where a metric reader is required. Updated it to use `PeriodicExportingMetricReader` and the `readers` constructor option.
- The OpenTelemetry metrics example registered observable gauge callbacks each time scan results were reported, causing duplicate callbacks and stale captured values. Moved callbacks to module initialization and stored the latest counts in a map.

## Review Notes
- Local syntax checks passed for the JavaScript and Python snippets extracted from the post.
- The actual GitHub Actions workflows were reviewed against official action documentation but were not executed locally.
