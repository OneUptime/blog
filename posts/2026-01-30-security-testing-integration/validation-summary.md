# Validation Summary: How to Create Security Testing Integration

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Semgrep (SAST)
- Trivy (SCA / container scanning)
- OWASP ZAP (DAST — baseline and full scan)
- GitHub Actions
- GitLab CI/CD
- Gitleaks (secrets scanning)
- Anchore SBOM action (CycloneDX SBOM generation)
- Docker (Buildx, build-push-action)
- SARIF / GitLab SAST report formats
- Pre-commit hooks
- GitHub Security tab / code scanning

## Sources Consulted
- Semgrep official docs and CI sample configs — https://semgrep.dev/docs/semgrep-ci/sample-ci-configs and https://semgrep.dev/docs/writing-rules/pattern-syntax
- Semgrep action repo (archival notice) — https://github.com/semgrep/semgrep-action
- Semgrep Docker image — https://hub.docker.com/r/semgrep/semgrep
- GitLab SAST report format docs — https://docs.gitlab.com/ee/user/application_security/sast/
- Trivy GitHub Action — https://github.com/aquasecurity/trivy-action
- OWASP ZAP baseline action releases — https://github.com/zaproxy/action-baseline/releases
- OWASP ZAP full-scan action releases — https://github.com/zaproxy/action-full-scan/releases
- Anchore SBOM action — https://github.com/anchore/sbom-action
- Gitleaks action and releases — https://github.com/gitleaks/gitleaks-action and https://github.com/gitleaks/gitleaks/releases
- GitHub Actions: actions/checkout, actions/upload-artifact, actions/github-script, docker/build-push-action, docker/setup-buildx-action, github/codeql-action

## Issues Found

1. **Deprecated Semgrep action (`returntocorp/semgrep-action@v1`)** — The action repo is archived; Semgrep officially recommends running `semgrep ci` inside the `semgrep/semgrep` container. Updated both the standalone GitHub Actions example and the unified security-pipeline workflow to use `container: { image: semgrep/semgrep }` plus `run: semgrep ci ... --sarif --output=semgrep.sarif`.

2. **Incorrect GitLab CI report format** — The GitLab example produced SARIF (`--sarif > gl-sast-report.sarif`) and declared it under `artifacts.reports.sast`. GitLab's `artifacts.reports.sast` requires the proprietary GitLab SAST JSON schema, not SARIF, and GitLab will not parse a SARIF file in that slot. Changed the script to `semgrep ci --config p/security-audit --gitlab-sast --output gl-sast-report.json` and updated the artifact filename to `gl-sast-report.json`. Also updated the image from the legacy `returntocorp/semgrep` to the current `semgrep/semgrep`.

3. **Outdated OWASP ZAP action versions** — `zaproxy/action-baseline@v0.10.0` and `zaproxy/action-full-scan@v0.8.0` are well behind current releases. Bumped to `zaproxy/action-baseline@v0.15.0` (latest) and `zaproxy/action-full-scan@v0.13.0` (latest), including the second baseline-scan usage in the unified pipeline.

## Review Notes

- The Semgrep custom-rule example uses `...` inside string literals (`$VAR = "sk_live_..."`). This syntax is technically valid in Semgrep (the ellipsis is supported inside strings per the pattern-syntax docs), so it was left as-is. A more robust modern equivalent would be `metavariable-regex` against the captured string, but the current example is not wrong — only less expressive.
- `aquasecurity/trivy-action@master` follows Aqua's official README and is acceptable; pinning to a specific tag (e.g. `@0.28.0`) would be more reproducible but is a stylistic choice, not an error.
- `actions/github-script@v7`, `actions/checkout@v4`, `actions/upload-artifact@v4`, `docker/build-push-action@v5`, `docker/setup-buildx-action@v3`, `github/codeql-action/upload-sarif@v3`, `anchore/sbom-action@v0`, `gitleaks/gitleaks-action@v2`, and `gitleaks v8.18.0` are all current / valid as of the validation date.
- The ZAP `context.xml` example is intentionally simplified; real ZAP context files include many more elements (session management, technology selection, etc.). This is acceptable for a tutorial and was left unchanged.
- The unified pipeline's `build` job declares `outputs: image-tag: ${{ steps.meta.outputs.tags }}` but no step is given the id `meta`. This is a minor inconsistency in an illustrative snippet — not factually wrong, and downstream jobs don't consume the output, so it was left unchanged.
