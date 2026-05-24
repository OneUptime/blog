# Validation Summary: How to Create Terraform Style Guides for Teams

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- Terraform (HCL syntax, variables, validation blocks, modules, outputs)
- TFLint (configuration, rules, recursive mode)
- GitHub Actions (workflow YAML, `actions/checkout`, `terraform-linters/setup-tflint`)
- AWS provider resources (`aws_instance`, `aws_security_group`, `aws_db_instance`, `aws_vpc`, `aws_subnet`, `aws_s3_bucket`, `aws_ebs_volume`)
- `terraform fmt` CLI
- `terraform-aws-modules/vpc/aws` registry module

## Sources Consulted
- TFLint user guide (config): https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint built-in ruleset docs: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/README.md
- TFLint CLI docs: https://github.com/terraform-linters/tflint
- `terraform-linters/setup-tflint` GitHub Action: https://github.com/terraform-linters/setup-tflint
- `terraform fmt` documentation: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform `cidrhost` function: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- `terraform-aws-modules/terraform-aws-vpc` releases: https://github.com/terraform-aws-modules/terraform-aws-vpc/releases/tag/v5.2.0

## Issues Found

1. **Deprecated TFLint config syntax.** The example `.tflint.hcl` used `config { module = true }`, which was deprecated in TFLint v0.50.0 (October 2023) in favor of `call_module_type`. Updated to `config { call_module_type = "all" }` to reflect current syntax for a 2026 post.

2. **Outdated `setup-tflint` action version.** The workflow pinned `terraform-linters/setup-tflint@v4`, but the current major (as of 2026) is v6 (latest v6.2.2, March 2026). Updated the pin to `@v6`.

## Review Notes

- All TFLint rule names cited (`terraform_naming_convention`, `terraform_documented_variables`, `terraform_documented_outputs`, `terraform_deprecated_interpolation`, `terraform_typed_variables`) are valid built-in rules from `tflint-ruleset-terraform`. `terraform_naming_convention` correctly accepts `format = "snake_case"`.
- `tflint --recursive` is documented as experimental; some config fields are ignored in recursive mode and must be set via CLI flags. The post does not need to call this out since the usage is correct, but readers should be aware.
- `terraform fmt -check -recursive -diff` flags are all valid.
- The variable validation pattern `can(cidrhost(var.vpc_cidr, 0))` is the idiomatic Terraform approach for validating CIDR blocks.
- `terraform-aws-modules/vpc/aws` v5.2.0 was verified as a real GitHub release. Note that v6.x is the current major; readers may want to pin to a v6 release in new code, but v5.2.0 as an example is technically valid.
- The structural advice (file organization, naming conventions, tagging, comments, enforcement) is sound and aligns with HashiCorp's published Terraform style conventions.
