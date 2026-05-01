# Validation Summary: How to Deprecate Output Values in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL / OpenTofu configuration language
- OpenTofu CLI (`tofu plan`)
- AWS provider resources and data sources (`aws_vpc`, `aws_instance`, `aws_db_instance`, `aws_s3_bucket`, `aws_s3_bucket` data source)

## Sources Consulted
- OpenTofu output values docs for v1.9: https://opentofu.org/docs/v1.9/language/values/outputs/
- OpenTofu output values docs for v1.10: https://opentofu.org/docs/v1.10/language/values/outputs/
- OpenTofu "What's new in 1.10" docs: https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu plan command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu module refactoring docs: https://opentofu.org/docs/language/modules/develop/refactoring/
- Terraform Registry AWS provider docs for `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform Registry AWS provider docs for `aws_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry AWS provider docs for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry AWS provider docs for `aws_s3_bucket`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terraform Registry AWS provider docs for `aws_s3_bucket` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket

## Issues Found
- The post said deprecated module outputs were added in OpenTofu 1.9. Official OpenTofu docs show `deprecated` support for module variables and outputs arrives in OpenTofu 1.10, so I updated the introduction and the `required_version` example to `>= 1.10.0`.
- The warning example did not match OpenTofu's documented deprecation warning format and showed an impossible source location (`vpc_id = module.vpc.id` inside `module "vpc"`). I replaced it with a warning that matches the documented `Value derived from a deprecated source` format and a plausible resource reference location.
- The `vpc` output deprecation message said the output would be removed in module version `3.0`, while the changelog example removed it in `2.0.0`. I aligned the deprecation message and warning example to `2.0.0` so the migration timeline is internally consistent.

## Review Notes
- OpenTofu 1.10 documents output deprecation support as experimental, while current 1.11 docs document the feature without that warning. The updated post remains accurate for current OpenTofu releases.
- Deprecation warnings for module outputs are relevant on `tofu plan` and `tofu apply`; they are not emitted by `tofu validate` according to the refactoring docs.
