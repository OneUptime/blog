# Validation Summary: How to Run Security Scanning with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub code scanning and SARIF uploads
- npm audit
- pip-audit
- CodeQL
- Semgrep
- Gitleaks
- TruffleHog
- Trivy
- Anchore Grype
- Checkov
- FOSSA
- Docker
- Terraform, CloudFormation, and Kubernetes IaC scanning

## Sources Consulted
- GitHub Docs: Uploading SARIF files to GitHub code scanning: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- GitHub Docs: Workflow syntax for scheduled workflows: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#onschedule
- GitHub CodeQL Action metadata: https://github.com/github/codeql-action
- GitHub Actions checkout releases: https://github.com/actions/checkout/releases
- GitHub Actions setup-python releases: https://github.com/actions/setup-python/releases
- GitHub Actions github-script releases: https://github.com/actions/github-script/releases
- Trivy Action metadata and releases: https://github.com/aquasecurity/trivy-action
- pip-audit README and CLI help: https://github.com/pypa/pip-audit
- Semgrep documentation for SARIF uploads: https://semgrep.dev/docs/kb/semgrep-ci/upload-ci-findings-to-github
- Gitleaks README and default config: https://github.com/gitleaks/gitleaks
- Gitleaks Action releases: https://github.com/gitleaks/gitleaks-action/releases
- TruffleHog Action metadata: https://github.com/trufflesecurity/trufflehog
- Anchore scan-action metadata and releases: https://github.com/anchore/scan-action
- Checkov GitHub Action metadata and docs: https://github.com/bridgecrewio/checkov-action and https://www.checkov.io/4.Integrations/GitHub%20Actions.html
- Aqua tfsec to Trivy migration notice: https://github.com/aquasecurity/tfsec
- FOSSA Action metadata: https://github.com/fossas/fossa-action

## Issues Found
- Several SARIF upload jobs omitted `security-events: write`. Added job-level `permissions` for dependency, container, and IaC scans so `github/codeql-action/upload-sarif` can upload results.
- CodeQL examples used `github/codeql-action@v3` and `javascript` language naming. Updated CodeQL actions to `v4`, changed the language to the current `javascript-typescript` identifier, and removed a misleading single-language `category` from a multi-language analysis.
- The CodeQL `queries` example would have replaced default queries instead of adding extended ones. Changed it to `+security-extended`.
- The Semgrep example used the older `returntocorp/semgrep-action@v1` with unsupported `generateSarif`. Replaced it with the supported Semgrep CLI SARIF command and added a Python setup step.
- The Gitleaks example used `gitleaks/gitleaks-action@v2`, which has been superseded by the Node 24-compatible `v3`. Updated the action version.
- The Gitleaks config used the older global `[allowlist]` table. Updated it to the current `[[allowlists]]` syntax.
- Trivy examples used the mutable `master` ref. Updated them to the current immutable `v0.36.0` release.
- TruffleHog and FOSSA examples used mutable branch refs. Updated them to current release tags.
- Anchore scan-action used the older `v3` action. Updated it to the current Node 24-compatible `v7.4.0`.
- The IaC section recommended tfsec, which Aqua now directs users to migrate from because tfsec was consolidated into Trivy. Replaced the tfsec action example with a Trivy config scan.
- The Checkov SARIF output example omitted the trailing comma required by the action for a single `output_file_path`. Added it so the upload step can find `checkov-results.sarif`.
- The consolidated summary job downloaded artifacts that the prior jobs never uploaded. Removed the unused download step so the summary job reflects the actual workflow.
- The scheduled issue-creation job lacked `issues: write`. Added explicit `contents: read` and `issues: write` permissions.
- Updated current GitHub-owned action majors where the snippets used older Node 20-era actions: `actions/checkout@v6`, `actions/setup-python@v6`, and `actions/github-script@v9`.
- Clarified that GitHub Actions cron schedules run at 2 AM UTC in the first workflow comment.

## Review Notes
- `continue-on-error` and soft-fail choices are policy decisions rather than correctness issues.
- The examples still use illustrative project paths and image names, so users must adapt them to their repository layout.
