# Validation Summary: How to Use Stages in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- `.gitlab-ci.yml` configuration syntax
- GitLab CI stages (including `.pre` and `.post` special stages)
- DAG pipelines via the `needs` keyword
- `rules:`, `when:`, `allow_failure:`, `extends:` keywords
- `artifacts:reports` (JUnit, Cobertura coverage_report)
- Node.js / npm tooling examples
- Docker-in-Docker, kubectl, Cypress, Semgrep, Trivy (referenced as example tools)

## Sources Consulted
- GitLab CI/CD YAML syntax reference — https://docs.gitlab.com/ci/yaml/
- GitLab `needs` keyword documentation — https://docs.gitlab.com/ci/yaml/#needs
- GitLab `coverage` keyword documentation — https://docs.gitlab.com/ci/yaml/#coverage
- GitLab artifact reports documentation — https://docs.gitlab.com/ci/yaml/artifacts_reports/

## Issues Found
No technical issues found.

Key claims verified against official GitLab documentation:
- Default pipeline stages when `stages` is omitted are `.pre`, `build`, `test`, `deploy`, `.post` — confirmed.
- Jobs without a `stage` key default to the `test` stage — confirmed.
- `.pre` always runs first; `.post` always runs last regardless of position in `stages` — confirmed.
- `needs:` enables DAG execution and the `- job: name, artifacts: true` syntax is valid — confirmed.
- `artifacts: reports: junit:` and `coverage_report: coverage_format: cobertura, path:` syntax is valid — confirmed.
- `rules:` with `if:`, `changes:`, and `when:` (including `manual`, `always`) — valid syntax.
- `allow_failure: true`, `extends:`, hidden jobs starting with `.` — all valid.
- Parallel execution math (60+90+120=270 sequential vs 120 parallel) is arithmetically correct.

## Review Notes
- The `coverage:` regex examples use capturing groups (e.g., `(\d+)`, `([\d\.]+)`). GitLab's current docs technically state "all groups must be non-capturing"; however, capturing groups are widely used in practice (including in GitLab's own Jest examples) and continue to work, so this was left unchanged.
- The Semgrep image `returntocorp/semgrep` is used. Semgrep Inc. has since published images under the `semgrep/semgrep` namespace as the primary one, but the `returntocorp/semgrep` image still exists and functions, so no change made.
- The Cypress image tag (`cypress/browsers:node-20.9.0-chrome-118.0.5993.88-1-ff-118.0.2-edge-118.0.2088.46-1`) is a real historical Cypress browser image variant. Future readers may want to use a newer tag, but the syntax/usage is correct.
- `cypress/browsers:latest` is referenced in one earlier example — Cypress does publish `latest`-style tags on `cypress/browsers`, so this is fine.
- The "Always run tests" rule (`rules: - when: always`) is technically correct but somewhat redundant in that context since the default pipeline behavior would include the job anyway; left as-is since it is not incorrect.
