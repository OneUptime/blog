# Validation Summary: How to Implement Container Scanning with Trivy

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Trivy CLI
- Container image vulnerability scanning
- Secret scanning
- Infrastructure-as-Code misconfiguration scanning
- Docker
- Kubernetes manifests
- Trivy Operator
- Helm
- GitHub Actions
- GitLab CI
- SARIF, JSON, HTML, and CycloneDX reporting

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy config CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy config file reference: https://trivy.dev/docs/latest/references/configuration/config-file/
- Trivy filtering and .trivyignore documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy code repository target documentation: https://trivy.dev/docs/latest/guide/target/repository/
- Trivy misconfiguration custom checks documentation: https://trivy.dev/docs/latest/scanner/misconfiguration/config/config/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- Trivy Operator Helm installation documentation: https://aquasecurity.github.io/trivy-operator/v0.30.1/getting-started/installation/helm/

## Issues Found
- Debian/Ubuntu installation used the deprecated `apt-key` flow and distribution codename repository entry. Updated it to the current official `signed-by=/usr/share/keyrings/trivy.gpg` repository setup using the `generic` Trivy repository.
- The verification example showed Trivy `0.48.0`, which is outdated for the current official documentation. Updated the example output to `0.71.1`.
- The Terraform custom policy example used `--config-policy`, which is not a current Trivy flag. Replaced it with `--config-check` and `--check-namespaces user`, matching current custom check usage.
- The Kubernetes Deployment example was incomplete for `apps/v1` and used invalid `securityContext.runAsRoot`. Added the required selector/template labels and changed the root-user example to `runAsUser: 0`.
- The GitHub Actions example used `aquasecurity/trivy-action@master` and `github/codeql-action/upload-sarif@v2`. Updated these to current versioned references from the official examples and added the required SARIF upload permissions.
- The Trivy config file placed `scanners` at the wrong level and used scalar database repository values. Moved scanners under `scan:` and changed DB repositories to list values with the current `:2` and `:1` database tags.
- The `.trivyignore` example used an already-expired 2024 expiration date. Updated it to a future date so the example would still work as written.
- The admission-control wording implied Trivy itself directly blocks Kubernetes admission. Clarified that Trivy scan results can be used as part of an admission-control policy, while Trivy Operator continuously scans workloads and creates reports.
- The vulnerability report commands described reports as "for all pods" and used a hardcoded report name. Updated the text to describe all namespaces and use a placeholder report name.

## Review Notes
Trivy vulnerability counts and CVE examples are time-sensitive because the vulnerability database changes frequently. The post now uses current commands, but exact scan output for images such as `nginx:1.25` may differ over time.
