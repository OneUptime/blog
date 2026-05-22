# Validation Summary: How to Scan Terraform Plans for Security Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- tfsec
- Trivy
- Checkov
- Open Policy Agent (OPA)
- Conftest
- Rego
- GitHub Actions
- GitLab CI

## Sources Consulted
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- tfsec usage documentation: https://aquasecurity.github.io/tfsec/latest/guides/usage/
- tfsec ignore documentation: https://aquasecurity.github.io/tfsec/v1.27.2/guides/configuration/ignores/
- tfsec config documentation: https://aquasecurity.github.io/tfsec/latest/guides/configuration/config/
- tfsec AWS S3 checks: https://aquasecurity.github.io/tfsec/latest/checks/aws/s3/
- Trivy Terraform scanning documentation: https://trivy.dev/docs/v0.69/tutorials/misconfiguration/terraform/
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov suppressing and skipping policies: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov YAML custom policy documentation: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Conftest documentation: https://www.conftest.dev/
- Conftest options documentation: https://www.conftest.dev/options/
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language

## Issues Found
- The tfsec inline ignore example used `reason:` syntax that is not part of tfsec's documented ignore format. Changed it to a normal explanatory comment plus `#tfsec:ignore:aws-s3-no-public-buckets`.
- The Checkov YAML custom policy example used a non-standard custom policy ID and omitted the documented `category` metadata. Changed the ID to `CKV2_CUSTOM_1` and added `category: "CONVENTION"`.
- The Conftest Rego example was written for parsed HCL input but was shown being run against Terraform plan JSON. Rewrote the Rego to evaluate `input.resource_changes` from `terraform show -json` plan output and updated it to current Rego rule syntax.
- The Conftest section implied the same plan-oriented policy could be used directly against HCL. Clarified that direct HCL scans need HCL-oriented policies.
- The GitHub Actions workflow used path globs that were less precise for nested Terraform files. Changed them to `**/*.tf` and `**/*.tfvars`.
- The GitHub Actions workflow uploaded SARIF without declaring the required `security-events: write` permission. Added minimal job permissions for checkout and SARIF upload.
- The Trivy GitHub Action example used the mutable `master` ref. Changed it to the current versioned example ref `v0.36.0` and quoted `exit-code` as an action string input.
- The tfsec config example used an unsupported nested resource-specific `exclude` structure and an invalid S3 check ID. Changed it to a documented check ID list entry with an expiration date.

## Review Notes
- `terraform show -json` can expose sensitive values from plans or state, so teams should handle generated `plan.json` files as sensitive CI artifacts.
- The custom Conftest policies are examples and do not replace mature scanner rule sets; production policies should handle provider-version differences such as separate AWS S3 encryption resources.
