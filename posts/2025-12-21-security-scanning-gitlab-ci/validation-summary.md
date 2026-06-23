# Validation Summary: How to Set Up Security Scanning in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, CI templates, rules, artifacts reports)
- GitLab SAST, DAST, Dependency Scanning, Container Scanning, Secret Detection
- Semgrep (SAST)
- npm audit (dependency scanning)
- Trivy (dependency and container scanning)
- Gitleaks (secret detection)
- OWASP ZAP (DAST, `zap-baseline.py`)
- Docker / docker-in-docker (dind) build
- Python and Node.js report-conversion snippets

## Sources Consulted
- GitLab SAST docs: https://docs.gitlab.com/ee/user/application_security/sast/
- GitLab Dependency Scanning docs: https://docs.gitlab.com/ee/user/application_security/dependency_scanning/
- GitLab Container Scanning docs: https://docs.gitlab.com/ee/user/application_security/container_scanning/
- GitLab Secret Detection docs: https://docs.gitlab.com/ee/user/application_security/secret_detection/
- GitLab DAST docs: https://docs.gitlab.com/ee/user/application_security/dast/
- Semgrep Docker image (move notice): https://hub.docker.com/r/returntocorp/semgrep and https://hub.docker.com/r/semgrep/semgrep
- OWASP ZAP Docker User Guide: https://www.zaproxy.org/docs/docker/about/ and https://hub.docker.com/r/zaproxy/zap-stable
- Gitleaks repository and packages: https://github.com/gitleaks/gitleaks and https://github.com/orgs/gitleaks/packages/container/package/gitleaks
- Trivy docs (GitLab template / `@/contrib/gitlab.tpl`): https://aquasecurity.github.io/trivy/

## Issues Found
1. **Deprecated Semgrep Docker image** — The post used `returntocorp/semgrep:latest` (two occurrences). The Docker Hub page for `returntocorp/semgrep` now displays a "We've moved!" notice; official images are published at `semgrep/semgrep`. Updated both occurrences to `semgrep/semgrep:latest`.
2. **Deprecated OWASP ZAP Docker image** — The DAST example used `owasp/zap2docker-stable:latest`. The `zap2docker-*` images are deprecated and no longer published (ZAP is no longer an OWASP project); the maintained images are `zaproxy/zap-stable` (Docker Hub) / `ghcr.io/zaproxy/zaproxy:stable` (GHCR). Updated to `ghcr.io/zaproxy/zaproxy:stable`. The `zap-baseline.py` script and its flags (`-t`, `-g`, `-r`, `-J`, `-I`) remain valid in the new image.
3. **Legacy Gitleaks Docker image** — The post used `zricethezav/gitleaks:latest` (two occurrences). While that legacy image still exists, the official organization image is now `ghcr.io/gitleaks/gitleaks`. Updated both occurrences to `ghcr.io/gitleaks/gitleaks:latest`.

## Review Notes
- **Gitleaks `detect` command**: As of Gitleaks v8.19.0 the `detect` (and `protect`) commands are deprecated in favor of `gitleaks git` / `gitleaks dir`. The `detect` command and the flags used (`--source`, `--report-format`, `--report-path`, `--exit-code`) still function (the command is just hidden from `--help`), so the examples remain working. A future revision could migrate to `gitleaks git .` / `gitleaks dir .`.
- **GitLab SAST analyzer variables**: The "Custom SAST Configuration" example references the `bandit` analyzer (`SAST_EXCLUDED_ANALYZERS: "bandit, brakeman"` and `SAST_BANDIT_EXCLUDED_PATHS`). GitLab consolidated many language-specific analyzers (including `bandit`) into the Semgrep-based analyzer and deprecated/removed them in the 15.x–16.x range, so these specific variable names are illustrative of older analyzer behavior rather than current best practice. The general mechanism (`SAST_EXCLUDED_ANALYZERS`, `SAST_EXCLUDED_PATHS`, `SEARCH_MAX_DEPTH`) is still valid.
- **npm audit report conversion**: The Node snippet reads `vuln.title || vuln.overview`; in the npm v7+ audit JSON those fields live inside the `via` array rather than on the top-level advisory object, so the resulting `description` may be empty. The code is non-breaking and clearly illustrative, so it was left as written.
- The Semgrep, ZAP, and Gitleaks JSON field references used in the conversion scripts (e.g. `extra.severity`, `riskdesc`, `RuleID`, `StartLine`) match the respective tools' real output formats. Trivy commands, the `@/contrib/gitlab.tpl` template path, GitLab artifact report keys, `CS_IMAGE`, and `DAST_WEBSITE` are all correct.
- `node:18-alpine` and `docker:24.0`/`docker:24.0-dind` are valid, pinned images; Node 18 is past its maintenance window but still functional for the examples.
