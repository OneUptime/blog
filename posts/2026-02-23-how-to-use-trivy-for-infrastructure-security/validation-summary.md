# Validation Summary: How to Use Trivy for Infrastructure Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Trivy
- Terraform
- Terraform plan JSON
- Rego / Open Policy Agent
- Docker
- GitHub Actions
- Jenkins Pipeline
- SARIF

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/dev/getting-started/installation/
- Trivy Terraform coverage documentation: https://www.trivy.dev/docs/v0.50/guide/coverage/iac/terraform/
- Trivy misconfiguration scanning documentation: https://trivy.dev/docs/dev/scanner/misconfiguration/
- Trivy `config` CLI reference and `aquasec/trivy:0.70.0 config --help`: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/
- Trivy configuration file reference: https://trivy.dev/docs/dev/guide/references/configuration/config-file/
- Trivy secret scanner documentation: https://www.trivy.dev/docs/v0.55/guide/scanner/secret/
- Trivy reporting / SARIF documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- GitHub Actions checkout README: https://github.com/actions/checkout
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- Trivy security advisory GHSA-69fq-xp46-6x23: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23

## Issues Found
- The Debian/Ubuntu installation example used `$(lsb_release -sc)` in the Trivy apt repository line. The official Trivy installation docs use the `generic` distribution component, so the command was updated.
- The Docker example used the floating `aquasec/trivy` image tag. It was changed to `aquasec/trivy:0.70.0` to avoid pulling an implicit latest image.
- The Terraform plan scan used `--tf-vars` when scanning `tfplan.json`. Trivy docs show scanning the plan JSON directly with `trivy config tfplan.json`; `--tf-vars` is for overriding Terraform HCL variables, so it was removed from the plan scan example.
- The custom Rego example used an outdated input shape and returned string messages directly. It was rewritten to use Trivy's current raw Terraform input schema, package metadata, `import rego.v1`, and `result.new(...)` results.
- The custom policy command used older `--policy` and `--namespaces` flags. It was updated to `--config-check` and `--check-namespaces`, with `--misconfig-scanners terraform --raw-config-scanners terraform` for the raw Terraform policy example.
- The `trivy.yaml` example used outdated or incorrect keys: `misconfig`, `misconfig.policy`, `misconfig.skip-check`, and list-valued `output`. These were corrected to `misconfiguration`, `rego.check`, `rego.namespaces`, `ignorefile`, and scalar `output`.
- The GitHub Actions example used `aquasecurity/trivy-action@master`, `actions/checkout@v4`, and `github/codeql-action/upload-sarif@v3`. These were updated to current pinned major/release references, and `security-events: write` permission was added for SARIF upload.

## Review Notes
- The local `trivy` binary was not installed, so CLI verification was performed with the Docker image `aquasec/trivy:0.70.0`.
- The blog remains technically relevant, but future maintenance should periodically refresh pinned Trivy and GitHub Action versions and review Trivy security advisories before recommending CI/CD usage.
