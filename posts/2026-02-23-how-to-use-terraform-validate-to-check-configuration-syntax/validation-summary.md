# Validation Summary: How to Use terraform validate to Check Configuration Syntax

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform configuration language (HCL)
- Terraform provider and module initialization
- Terraform input variable validation
- GitHub Actions
- GitLab CI
- Shell scripting
- TFLint

## Sources Consulted
- HashiCorp Terraform CLI documentation: `terraform validate` command: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp Terraform CLI documentation: `terraform init` command: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform CLI documentation: `terraform plan` command: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform language documentation: custom conditions and validation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- HashiCorp Terraform language documentation: variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- HashiCorp Terraform Plugin Framework documentation: validation behavior: https://developer.hashicorp.com/terraform/plugin/framework/validation

## Issues Found
- The post described "bad indentation" as an HCL syntax error. Terraform's HCL syntax is not indentation-sensitive, so this was changed to "invalid tokens, or malformed expressions."
- The limitations section said `terraform validate` does not check provider-specific argument values and gave invalid CIDR format as an example. Provider plugins can perform local schema and value validation during `terraform validate`, but validate does not call provider APIs or guarantee real-world validity. The wording was updated to reflect that distinction.
- The JSON output examples omitted the documented top-level `format_version` field. Both examples now include `"format_version": "1.0"`.
- The custom variable validation section said validation rules are checked during both `terraform validate` and `terraform plan`. Official Terraform documentation describes input variable validations as being evaluated while Terraform creates a plan, so the wording was narrowed to planning behavior.
- The validate-vs-plan table said credentials are always needed for `terraform plan`. This is usually true for cloud-backed configurations but not universally true for every provider or local-only configuration, so the entry was changed to "Usually."
- The conclusion said `terraform validate` works without network access. Since `terraform init` may need network access to install providers and modules, this was changed to "without needing cloud credentials or remote API access."

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The Terraform version pinned in the GitLab CI example is older, but the command sequence remains technically valid; future maintenance could consider pinning a currently supported Terraform version through a project-wide version policy.
