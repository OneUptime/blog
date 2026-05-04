# Validation Summary: How to Configure tflint Rules for OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- TFLint
- OpenTofu / Terraform
- TFLint AWS plugin (tflint-ruleset-aws)
- TFLint Terraform plugin (tflint-ruleset-terraform)
- HCL configuration syntax

## Sources Consulted
- TFLint config user guide: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- TFLint terraform_naming_convention rule: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_naming_convention.md
- TFLint terraform_module_version rule: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_module_version.md
- TFLint terraform_module_pinned_source rule: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_module_pinned_source.md
- TFLint terraform_comment_syntax rule: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/terraform_comment_syntax.md
- TFLint AWS ruleset rules README: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/rules/README.md
- TFLint AWS aws_instance_previous_type rule: https://github.com/terraform-linters/tflint-ruleset-aws/blob/master/docs/rules/aws_instance_previous_type.md
- TFLint CLI flags reference (via README/help)

## Issues Found
1. **`local` block in `terraform_naming_convention` should be `locals`.** The official rule docs use `locals` (plural) as the configuration block name for local-value naming overrides. Using `local` would not match the rule's schema. Fixed by renaming the block to `locals`.

2. **`terraform_comment_syntax` description was inaccurate.** The blog claimed the rule enforces "// and # comments instead of /* */". In reality, this rule enforces idiomatic `#` comments only and discourages both `//` and `/* */` styles. Updated the inline comment accordingly.

3. **AWS rules listed as enabled by default contained invalid/non-existent rule names.**
   - `aws_instance_invalid_type` — does not exist in the AWS ruleset (the analogous rule is `aws_db_instance_invalid_type` for DB instances). Removed from the list.
   - `aws_db_instance_invalid_engine_version` — does not exist in the AWS ruleset. Removed and replaced with `aws_db_instance_invalid_type` (which is real and enabled by default).
   - `aws_lambda_function_invalid_runtime` — the actual rule name is `aws_lambda_function_deprecated_runtime`. Corrected.
   - `aws_instance_previous_type` annotation "(warning: t2 -> use t3)" was misleading — t2 instances are still current; the rule flags older types like `t1.micro`. Reworded.

## Review Notes
- The HCL config syntax for `config { call_module_type, disabled_by_default, format }` is valid per the current TFLint docs.
- All listed `terraform_*` rule names from `tflint-ruleset-terraform` (terraform_comment_syntax, terraform_deprecated_index, terraform_deprecated_interpolation, terraform_documented_outputs, terraform_documented_variables, terraform_module_pinned_source, terraform_module_version, terraform_required_providers, terraform_required_version, terraform_typed_variables, terraform_unused_declarations, terraform_unused_required_providers, terraform_naming_convention) are valid.
- `terraform_module_pinned_source` `style = "semver"` and `terraform_module_version` `exact = false` are valid attribute/value combinations per the official rule docs.
- The CLI flags shown (`--config`, `--chdir`, `--enable-rule`, `--disable-rule`, `--only`, `--format`) are all valid.
- The AWS plugin version `0.32.0` was a real release at the time of writing; users should upgrade as new releases ship.
- In recursive mode (`tflint --recursive`), the `format` field in the config file is ignored and must be provided as a flag — worth noting if readers later adopt recursive runs, though it does not affect correctness of the example as written.
