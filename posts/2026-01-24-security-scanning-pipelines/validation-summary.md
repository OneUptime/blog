# Validation Summary: How to Configure Security Scanning in Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GitHub Actions
- CodeQL code scanning
- Semgrep
- Gitleaks
- npm audit
- Safety CLI
- govulncheck
- Trivy
- Checkov
- SARIF upload to GitHub code scanning
- Infrastructure as Code scanning for Terraform, Kubernetes, and CloudFormation

## Sources Consulted
- GitHub Docs: Code scanning with CodeQL - https://docs.github.com/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql
- GitHub Docs: Workflow configuration options for code scanning - https://docs.github.com/en/code-security/reference/code-scanning/workflow-configuration-options
- GitHub CodeQL Action repository - https://github.com/github/codeql-action
- GitHub CodeQL Action v3 deprecation notice - https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/
- Semgrep Docs: Semgrep Community Edition in CI - https://docs.semgrep.dev/deployment/oss-deployment
- Semgrep Docs: Upload Semgrep CI findings to GitHub Advanced Security Dashboard - https://docs.semgrep.dev/kb/semgrep-ci/upload-ci-findings-to-github
- Semgrep Action deprecation notice - https://github.com/semgrep/semgrep-action
- Gitleaks Action documentation - https://github.com/marketplace/actions/gitleaks
- Gitleaks default configuration - https://github.com/gitleaks/gitleaks/blob/master/config/gitleaks.toml
- npm Docs: npm audit - https://docs.npmjs.com/cli/v8/commands/npm-audit
- Safety CLI Docs: Available commands and inputs - https://docs.safetycli.com/safety-docs/safety-cli/scanning-for-vulnerable-and-malicious-packages/available-commands-and-inputs
- Safety CLI Docs: Scanning in CI/CD - https://docs.safetycli.com/safety-docs/safety-cli/scanning-for-vulnerable-and-malicious-packages/scanning-in-ci-cd
- Go Docs: govulncheck tutorial - https://go.dev/doc/tutorial/govulncheck
- Go package docs: govulncheck - https://pkg.go.dev/golang.org/x/vuln/cmd/govulncheck
- Trivy Action documentation - https://github.com/aquasecurity/trivy-action
- Checkov GitHub Action documentation - https://github.com/bridgecrewio/checkov-action
- GitHub Actions workflow syntax permissions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub CodeQL upload-sarif action metadata - https://github.com/github/codeql-action/blob/main/upload-sarif/action.yml

## Issues Found
- The CodeQL section described CodeQL as a free SAST tool without qualification. Updated the explanation to reflect GitHub's documented availability: public repositories, or private/internal repositories with GitHub Code Security enabled.
- The CodeQL workflow used `github/codeql-action/*@v3` and the old JavaScript language id `javascript`. Updated the workflow to `@v4` and `javascript-typescript`, matching current CodeQL documentation.
- The CodeQL workflow included an Autobuild step for JavaScript/Python with an inaccurate comment. Removed the step because the shown interpreted-language configuration does not need an autobuild step.
- The Semgrep workflow used the deprecated `returntocorp/semgrep-action@v1` and `generateSarif`. Replaced it with the current Semgrep container workflow using `semgrep scan --sarif --output semgrep.sarif`.
- The Semgrep, Trivy, and Checkov SARIF upload examples did not grant `security-events: write`. Added the required GitHub Actions permissions, including `actions: read` where appropriate for private repositories.
- The Safety example used deprecated `safety check -r requirements.txt --json`. Updated it to `safety --key "${{ secrets.SAFETY_API_KEY }}" scan --target . --save-as json safety-report.json`.
- The Trivy examples used `aquasecurity/trivy-action@master`. Updated them to the current documented release tag `v0.36.0`.
- The security summary workflow referenced workflow names that did not match the earlier examples. Updated the `workflow_run.workflows` list to the names used in the post.
- The security summary workflow used `if: failure()`, which checks the current job's prior step failures rather than the completed upstream workflow's conclusion. Updated it to check `github.event.workflow_run.conclusion == 'failure'`.
- The GitHub issue creation step did not request `issues: write` and did not await the REST API call. Added the required permission and `await`.

## Review Notes
- All fenced YAML and TOML snippets in the post were parsed successfully after the edits.
- The npm audit example relies on npm's JSON output shape, specifically `metadata.vulnerabilities`. npm documents `--json`, but does not publish a formal stable schema for every JSON field, so future npm versions could require adjustment.
