# Validation Summary: How to Use Preconditions on Resources in OpenTofu - Resources

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources and data sources (`aws_db_instance`, `aws_instance`, `aws_ami`, `aws_ebs_volume`, `aws_subnet`)
- OpenTofu CLI (`tofu plan`)
- OpenTofu workspaces

## Sources Consulted
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu workspaces documentation: https://opentofu.org/docs/language/state/workspaces/
- OpenTofu `startswith` function documentation: https://opentofu.org/docs/language/functions/startswith/
- OpenTofu `regex` function documentation: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_ebs_volume` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ebs_volume

## Issues Found
- The introduction stated that resource preconditions run during the planning phase. I corrected this to match the OpenTofu docs: preconditions are evaluated as early as possible, usually during planning, but checks that depend on unknown values are deferred until apply.
- The module example used `can(regex("^db\\.r[0-9]\\.", var.instance_class))`, which was too narrow and would reject valid `db.r*` instance classes such as `db.r6g.large`. I replaced it with `startswith(var.instance_class, "db.r")` and updated the sample failure output to match.
- The conclusion said variable validation validates variables in isolation. I corrected this because current OpenTofu documentation allows validation expressions to refer to variables, locals, resources, and other values. The revised wording now distinguishes preconditions by where they are declared and evaluated.

## Review Notes
- The remaining examples are syntactically valid and consistent with current OpenTofu custom-condition behavior.
- The workspace example is technically correct, though OpenTofu documentation cautions that workspaces are not a substitute for system decomposition or separate access-control boundaries.
