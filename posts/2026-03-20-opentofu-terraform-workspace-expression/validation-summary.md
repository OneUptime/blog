# Validation Summary: How to Use the terraform.workspace Expression in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- Terraform-compatible workspace feature
- AWS provider resources (aws_s3_bucket, aws_dynamodb_table, aws_ecs_cluster, aws_instance, aws_shield_protection, aws_backup_plan, aws_vpc, aws_ami data source)
- Lifecycle preconditions
- Type conversion functions (`toset`, `contains`, `tobool`)

## Sources Consulted
- OpenTofu documentation on workspaces: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu language expressions: https://opentofu.org/docs/language/expressions/
- OpenTofu functions reference (`contains`, `tobool`, `toset`): https://opentofu.org/docs/language/functions/
- OpenTofu custom conditions (preconditions/postconditions): https://opentofu.org/docs/language/expressions/custom-conditions/
- AWS provider documentation for referenced resources (aws_shield_protection, aws_backup_plan, aws_vpc, aws_ami)

## Issues Found
No technical issues found.

## Review Notes
- The `terraform.workspace` named value is the canonical OpenTofu expression for the active workspace, identical to its Terraform predecessor. All code samples are syntactically valid HCL.
- The `tobool("Unknown workspace: ...")` pattern relies on the fact that `tobool` errors on any string that is not `"true"` or `"false"`, surfacing the supplied message inside the conversion error. This is a well-known idiom for module-level assertions in HCL prior to OpenTofu's `check` blocks; it works but is somewhat indirect — a `check` block (OpenTofu 1.6+) or a variable `validation` block would be cleaner where applicable. Not a correctness issue.
- The example uses `aws_alb.main.arn` (line 81). `aws_alb` remains a valid alias for `aws_lb` in the AWS provider, so this works, though `aws_lb` is the preferred current name.
- The `local.instance_types[terraform.workspace]` lookup will fail at plan time if the active workspace is not in the map. The post addresses this concern in the subsequent "Workspace Validation" section, so the pattern is sound when used together.
- The minor markdown rendering quirk that "Resource Naming" lacks an `##` header is stylistic, not technical, and was therefore left untouched per review instructions.
