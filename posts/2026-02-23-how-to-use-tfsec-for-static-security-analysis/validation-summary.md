# Validation Summary: How to Use tfsec for Static Security Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- tfsec
- Trivy
- GitHub Actions
- GitLab CI/CD
- pre-commit
- Docker
- YAML
- JSON
- HCL

## Sources Consulted
- tfsec usage and Docker documentation: https://github.com/aquasecurity/tfsec
- tfsec CLI usage reference: https://aquasecurity.github.io/tfsec/v1.20.1/guides/usage/
- tfsec configuration file documentation: https://aquasecurity.github.io/tfsec/v1.28.6/guides/configuration/config/
- tfsec custom checks documentation: https://aquasecurity.github.io/tfsec/v1.28.4/guides/configuration/custom-checks/
- tfsec migration to Trivy documentation: https://aquasecurity.github.io/tfsec/v1.28.7/guides/trivy/
- aquasecurity/tfsec-action documentation: https://github.com/aquasecurity/tfsec-action
- aquasecurity/tfsec-sarif-action documentation: https://github.com/aquasecurity/tfsec-sarif-action
- pre-commit-terraform documentation: https://github.com/antonbabenko/pre-commit-terraform
- GitLab CI/CD artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- Trivy config CLI documentation: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/

## Issues Found
- The GitHub Actions SARIF example used `aquasecurity/tfsec-action@v1.0.3` with `sarif_file`, but that input belongs to `aquasecurity/tfsec-sarif-action`. Changed the SARIF step to `aquasecurity/tfsec-sarif-action@v0.1.4`.
- The GitHub Actions SARIF upload example did not include the permissions required for code scanning uploads. Added `actions: read`, `contents: read`, and `security-events: write`.
- The GitHub Actions workflow failed the build before the SARIF generation and upload steps could run. Added `if: always()` to the SARIF steps so reports are still published when findings fail the first scan step.
- The GitLab CI example declared `artifacts:reports:terraform` for tfsec JSON output. GitLab's `terraform` report type is for OpenTofu/Terraform plan JSON, not tfsec scan JSON. Removed the incorrect report declaration and kept the JSON file as a normal artifact.
- The custom checks section said `.tfsec/custom_checks.json` would be picked up automatically. tfsec auto-loads files in `.tfsec` with `_tfchecks.json` or `_tfchecks.yaml` suffixes. Changed the filename to `.tfsec/custom_tfchecks.json`.

## Review Notes
- tfsec is now part of Trivy. The standalone tfsec commands remain documented upstream, but future updates should consider making Trivy the primary recommendation for new workflows.
