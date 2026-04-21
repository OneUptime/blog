# Validation Summary: How to Test OpenTofu Configurations with Trivy

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTofu / Terraform configuration
- Trivy misconfiguration scanning
- Rego custom policies
- AWS CIS compliance reports
- GitHub Actions SARIF integration
- Checkov comparison

## Sources Consulted
- Trivy CLI reference for `trivy config`: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy Terraform scanning documentation: https://trivy.dev/docs/latest/guide/coverage/iac/terraform/
- Trivy custom Rego checks documentation: https://trivy.dev/docs/latest/guide/scanner/misconfiguration/custom/
- Trivy raw Terraform configuration scanning documentation: https://trivy.dev/docs/dev/scanner/misconfiguration/
- Trivy filtering and `.trivyignore.yaml` documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy built-in compliance documentation: https://trivy.dev/docs/latest/compliance/compliance/
- Trivy checks compliance specs: https://github.com/aquasecurity/trivy-checks/tree/main/pkg/compliance
- Aqua vulnerability database entries for AWS S3 versioning, EC2 security groups, and RDS deletion protection: https://avd.aquasec.com/
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Aqua Security advisory GHSA-69fq-xp46-6x23 / CVE-2026-33634: https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23
- Checkov SCA scanning documentation: https://www.checkov.io/7.Scan%20Examples/Sca.html
- Checkov custom policy documentation: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html and https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- OpenTofu language compatibility documentation: https://opentofu.org/docs/language/v1-compatibility-promises/

## Issues Found
- The install script example installed the latest release implicitly and wrote to `/usr/local/bin` without `sudo`. Updated it to install the current verified release `v0.70.0` with `sudo`.
- The example output used a CVE-style ID for a misconfiguration finding and included an outdated `EXCEPTIONS` field. Updated the output to match current Trivy table output and use the current AWS security group finding URL.
- Several Trivy check IDs were incorrect or outdated. Updated S3 versioning to `AWS-0090`, unrestricted SSH/RDP ingress to `AWS-0107`, and RDS deletion protection to `AWS-0177`.
- The custom Rego policy used the old/raw `input.config.resource` shape and the outdated `--policy` flag. Replaced it with a current Terraform raw-input policy using metadata, `import rego.v1`, `result.new`, `--config-check`, `--check-namespaces`, and `--raw-config-scanners terraform`.
- The `.trivyignore.yaml` example used the wrong top-level key and field name. Replaced `rules`/`reason` with `misconfigurations`/`statement`, added the required `--ignorefile` command, and updated the inline suppression ID.
- The compliance section included unsupported examples for `soc2` and `--list-all-policies`. Replaced them with verified `aws-cis-1.2` and `aws-cis-1.4` examples.
- The GitHub Actions example used `aquasecurity/trivy-action@master`, an older SARIF upload action version, and lacked required SARIF upload permissions. Updated it to `aquasecurity/trivy-action@0.35.0`, `github/codeql-action/upload-sarif@v4`, and added `contents: read` plus `security-events: write`.
- The comparison table said Checkov does not scan containers. Updated it because current Checkov documentation describes SCA scanning for package files and container images.

## Review Notes
- Verified the corrected Trivy CLI flags, YAML ignore file, inline ignore comment, custom Rego policy, and AWS CIS compliance IDs with a temporary Trivy `v0.70.0` binary.
- Trivy reports OpenTofu-compatible `.tf` files as `terraform` in scan output because it uses the Terraform/HCL scanner for these files.
