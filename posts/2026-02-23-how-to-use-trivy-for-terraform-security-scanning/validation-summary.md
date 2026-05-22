# Validation Summary: How to Use Trivy for Terraform Security Scanning

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Trivy
- Terraform HCL
- Terraform plan JSON
- Rego custom policies
- GitHub Actions
- GitLab CI
- Docker

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/v0.58/getting-started/installation/
- Trivy `config` CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/
- Trivy reporting documentation: https://trivy.dev/latest/docs/configuration/reporting/
- Trivy GitLab CI integration documentation: https://www.trivy.dev/docs/dev/tutorials/integrations/gitlab-ci/
- Trivy Action repository documentation: https://github.com/aquasecurity/trivy-action
- GitLab Code Quality documentation: https://docs.gitlab.com/ci/testing/code_quality/
- Terraform plan JSON workflow documentation: https://developer.hashicorp.com/terraform/cli/commands/show

## Issues Found
- The Linux apt installation example omitted the required Aqua Security apt repository setup. Added the repository key, source list entry, and `apt-get update` steps from the official Trivy installation documentation.
- The filtering section described skipping checks by ID but used `--skip-dirs`, which skips directories. Corrected the description to match the flag.
- The `.trivyignore` examples had comments that did not match the referenced AVD IDs. Updated the comments to describe S3 encryption and customer-managed key checks.
- The cloud-provider section used `trivy config --list-all-pkgs .` as a way to list rules. Replaced it with a valid Terraform scanner selection example using `--misconfig-scanners terraform`.
- The GitHub Actions example used a mutable `aquasecurity/trivy-action@master` reference and an older SARIF upload action. Updated the Trivy action to the current documented version, added required SARIF upload permissions, and updated `github/codeql-action/upload-sarif` to v4.
- The GitLab CI example claimed GitLab could parse native Trivy JSON as a `container_scanning` report. GitLab expects GitLab-compatible report formats, so the snippet now uses Trivy's GitLab Code Quality template and publishes it as a `codequality` report.
- The custom policy section used older Trivy policy flags (`--policy`, `--skip-policy-update`) and a Rego input shape that would not match Terraform plan JSON. Updated the example to use current flags (`--config-check`, `--check-namespaces`, `--skip-check-update`) and a Terraform plan JSON selector.

## Review Notes
The post is technically relevant and was validated after the corrections above. Trivy was not installed locally in the review environment, so command behavior was checked against official documentation rather than local CLI execution.
