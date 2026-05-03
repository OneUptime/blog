# Validation Summary: How to Add Custom Conditions to Data Sources in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and the equivalent Terraform behavior introduced in v1.2)
- HCL (HashiCorp Configuration Language)
- Terraform/OpenTofu AWS provider data sources:
  - `aws_security_group`
  - `aws_ami`
  - `aws_db_instance`
  - `aws_acm_certificate`
  - `aws_iam_role`
  - `aws_vpc`
- HCL built-in functions: `contains`, `startswith`, `length`

## Sources Consulted
- OpenTofu documentation on custom conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu lifecycle meta-arguments documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- Terraform AWS provider documentation for data sources:
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/security_group
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/db_instance
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_role
  - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- HCL function reference: https://opentofu.org/docs/language/functions/

## Issues Found
No technical issues found.

The post correctly describes:
- That `precondition` and `postcondition` blocks belong inside the `lifecycle` block of a data source.
- The semantic distinction: preconditions run before the data source is read; postconditions run after.
- The `self` reference is correctly used only inside `postcondition` blocks (it cannot be referenced in preconditions because the data source has not yet been read).
- The HCL syntax (block structure, `condition`/`error_message` arguments, string interpolation) is valid.
- The referenced AWS data source attributes (`vpc_id`, `db_instance_status`, `multi_az`, `deletion_protection`, `status`, `subject_alternative_names`, `arn`, `state`, `enable_dns_hostnames`) are real attributes exposed by the respective AWS provider data sources.
- Built-in functions (`contains`, `startswith`, `length`) exist in OpenTofu and are used with correct signatures.

## Review Notes
- The `aws_security_group` example's postcondition (`self.vpc_id == var.vpc_id`) is somewhat redundant since the data source is already filtered by `vpc_id`, but it remains illustrative of the general pattern.
- The post does not specify a minimum OpenTofu version. Custom conditions on data sources have been available since the project's initial fork (Terraform 1.2 originally). Mentioning a minimum version could help readers on older toolchains, but this is not a correctness issue.
- The phrasing "if the data source read fails (not found), the postcondition won't run" is accurate — when the underlying read errors, postcondition evaluation is skipped because no `self` value is available.
