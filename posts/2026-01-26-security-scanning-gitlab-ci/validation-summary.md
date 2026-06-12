# Validation Summary: How to Run Security Scanning in GitLab CI

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GitLab CI/CD
- GitLab SAST
- GitLab DAST
- GitLab Secret Detection
- GitLab Dependency Scanning
- GitLab Container Scanning
- Semgrep
- Trivy
- OWASP ZAP
- Checkov
- Docker
- YAML, TOML, SARIF, GitLab security reports

## Sources Consulted
- GitLab SAST documentation: https://docs.gitlab.com/user/application_security/sast/
- GitLab Secret Detection customization documentation: https://docs.gitlab.com/user/application_security/secret_detection/pipeline/configure/
- GitLab Secret Detection custom ruleset schema: https://docs.gitlab.com/user/application_security/secret_detection/pipeline/custom_rulesets_schema/
- GitLab Dependency Scanning documentation: https://docs.gitlab.com/user/application_security/dependency_scanning/
- GitLab Container Scanning documentation: https://docs.gitlab.com/user/application_security/container_scanning/
- GitLab DAST documentation: https://docs.gitlab.com/user/application_security/dast/
- GitLab DAST analyzer enablement documentation: https://docs.gitlab.com/user/application_security/dast/browser/configuration/enabling_the_analyzer/
- GitLab CI/CD artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- Trivy GitLab CI integration documentation: https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/
- Trivy CLI configuration documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy filtering documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Semgrep CLI help from `semgrep/semgrep:latest`
- Trivy CLI help from `aquasec/trivy:latest`
- ZAP Docker documentation: https://www.zaproxy.org/docs/docker/
- ZAP API scan documentation: https://www.zaproxy.org/docs/docker/api-scan/

## Issues Found
- Updated GitLab template includes from older `Security/...` paths to current `Jobs/...` paths for SAST, Secret Detection, Dependency Scanning, and Container Scanning examples where GitLab's current docs use those paths.
- Added Docker registry login before pushing to `$CI_REGISTRY_IMAGE`, because the build example pushed an image without authenticating to the GitLab registry.
- Corrected the statement that templates add jobs to the `security` stage. GitLab security templates add jobs in their default stages unless individual jobs are overridden.
- Replaced the incorrect `SAST_DISABLED: "false"` "severity threshold" example. That variable disables SAST; it is not a severity threshold.
- Changed the SAST override from a non-current generic `sast` job and removed the obsolete `eslint` analyzer example. Current GitLab SAST uses analyzer-specific jobs such as `semgrep-sast`.
- Changed the custom Semgrep SAST example to emit GitLab SAST format with `--gitlab-sast` and `gl-sast-report.json` instead of uploading raw Semgrep JSON as a GitLab SAST report.
- Corrected the Secret Detection custom ruleset example. Custom rules must be supplied through GitLab's ruleset passthrough mechanism using a Gitleaks-compatible `[[rules]]` configuration.
- Removed the incorrect `DS_REMEDIATE` "fail on high severity" example. That variable is legacy Gemnasium remediation behavior, not a severity gate.
- Reworked the dependency scanning customization example to use supported variables and clearly label `PIP_REQUIREMENTS_FILE` as legacy Gemnasium-based Python dependency scanning.
- Removed the invalid `artifacts:reports:dependency_scanning` declaration from the direct Trivy filesystem scan. Raw Trivy JSON is not a GitLab dependency scanning report schema.
- Changed the direct Trivy container scan to generate `gl-container-scanning-report.json` with Trivy's GitLab report template before declaring it as a GitLab `container_scanning` report.
- Updated the direct Trivy SARIF comment so it no longer implies automatic GitLab ingestion from a plain artifact path.
- Updated DAST variables from legacy `DAST_WEBSITE` and `DAST_FULL_SCAN_ENABLED` to current `DAST_TARGET_URL` and `DAST_FULL_SCAN`, and added `DAST_BROWSER_SCAN`.
- Updated the ZAP Docker image from the old `owasp/zap2docker-stable` naming to the current `ghcr.io/zaproxy/zaproxy:stable` image.
- Changed the Trivy IaC artifact from raw JSON declared as `sast` to SARIF declared as a SARIF report.
- Fixed the custom security gate example to search downloaded GitLab report artifacts and match JSON severity fields with optional whitespace.
- Replaced `pip install jq` with `apk add --no-cache curl jq`, because `jq` is a system CLI package in this context.
- Corrected the GitLab container vulnerability allowlist format and location. GitLab expects a root `vulnerability-allowlist.yml` with `generalallowlist`, not `.gitlab/vulnerability-allowlist.yml` with a custom `vulnerabilities` list.
- Updated scheduled Trivy commands to use current `--format json` syntax and `misconfig` instead of the deprecated `config` scanner name.

## Review Notes
- GitLab Dependency Scanning is in transition from legacy Gemnasium-based analyzers toward SBOM-based scanning. The post now avoids presenting deprecated remediation variables as current severity gating, but future updates should revisit this section as GitLab's SBOM-based dependency scanning reaches broader availability.
- GitLab SARIF ingestion availability can depend on GitLab version, tier, and feature flags. The post uses SARIF where appropriate, but teams should confirm SARIF report ingestion is enabled in their GitLab instance.
