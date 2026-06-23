# Validation Summary: How to Set Up Security Scanning in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide (hands-on DevSecOps pipeline setup with GitHub Actions)

## Technologies Covered
- GitHub Actions (workflow syntax, permissions, matrix, job needs, `if: always()`)
- Gitleaks (`gitleaks/gitleaks-action@v2`) for secret detection + `.gitleaks.toml`
- CodeQL (`github/codeql-action/init|autobuild|analyze@v3`)
- Semgrep (SAST)
- Dependabot (`.github/dependabot.yml`)
- OWASP Dependency-Check (`dependency-check/Dependency-Check_Action`)
- npm audit / npm outdated
- Trivy (`aquasecurity/trivy-action`) container scanning
- Grype (`anchore/scan-action@v3`)
- Checkov (`bridgecrewio/checkov-action@v12`) IaC scanning
- tfsec (`aquasecurity/tfsec-action@v1.0.3`)
- OWASP ZAP (`zaproxy/action-full-scan`, `zaproxy/action-baseline`) DAST
- FOSSA (`fossas/fossa-action`) license compliance
- SARIF upload to GitHub code scanning (`github/codeql-action/upload-sarif@v3`)

## Sources Consulted
- Semgrep `semgrep-action` repo (deprecation notice): https://github.com/semgrep/semgrep-action
- Semgrep sample CI configs (container `semgrep/semgrep`, `semgrep ci --sarif`, `SEMGREP_RULES`): https://semgrep.dev/docs/semgrep-ci/sample-ci-configs
- Semgrep — uploading findings to GitHub Advanced Security dashboard: https://semgrep.dev/docs/kb/semgrep-ci/github-upload-findings-in-security-dashboard
- zaproxy/action-full-scan releases: https://github.com/zaproxy/action-full-scan/releases
- zaproxy/action-baseline releases: https://github.com/zaproxy/action-baseline/releases
- bridgecrewio/checkov-action (v12 inputs `output_format`/`output_file_path`): https://github.com/bridgecrewio/checkov-action
- GitHub CodeQL action docs: https://github.com/github/codeql-action
- Gitleaks action: https://github.com/gitleaks/gitleaks-action
- Dependabot configuration options (groups / `dependency-type`): https://docs.github.com/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file

## Issues Found
1. **Deprecated Semgrep action** — The Semgrep SAST example used `uses: semgrep/semgrep-action@v1`. That repository is officially deprecated (its own README states "This project is deprecated"). Additionally, that action did not, with only a `config:` input, reliably produce the `semgrep.sarif` file that the subsequent `upload-sarif` step references, so the example would have failed to upload results. Replaced it with the current official approach: run the `semgrep/semgrep` container image and invoke `semgrep ci --sarif --output=semgrep.sarif` with the same three rulesets passed via the `SEMGREP_RULES` env var. Added `if: always()` to the SARIF upload step so results upload even when the scan exits non-zero on findings. This keeps the same intent and rulesets while using non-deprecated, working tooling.

## Review Notes
- **Pinned ZAP action versions are older but valid.** `zaproxy/action-full-scan@v0.10.0` and `zaproxy/action-baseline@v0.11.0` both exist and work; newer releases (full-scan 0.12.0/0.13.0, baseline 0.15.0) are available. Pinning to a specific tag is acceptable and is good supply-chain hygiene, so these were left unchanged.
- **tfsec is in maintenance/deprecation.** Aqua Security has folded tfsec functionality into Trivy and recommends migrating; `aquasecurity/tfsec-action@v1.0.3` still functions, so it was left as-is, but readers should be aware Trivy is the longer-term path for Terraform scanning.
- **Gitleaks action licensing.** `gitleaks/gitleaks-action@v2` is free for personal accounts and public repos but requires a (free) `GITLEAKS_LICENSE` for use in organization-owned repositories. Not an error, but worth knowing.
- **`anchore/scan-action@v3`** is valid; newer major versions (v6) exist. The `results.sarif` default output path used in the example is correct for v3.
- CodeQL, Dependabot grouping (`dependency-type: production|development`), OWASP Dependency-Check (`reports/dependency-check-report.sarif` default path, `--failOnCVSS`/`--enableRetired` args), Trivy, Checkov v12, npm audit, and the FOSSA action were all verified as correct and current.
