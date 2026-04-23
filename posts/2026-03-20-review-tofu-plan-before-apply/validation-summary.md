# Validation Summary: How to Review tofu plan Output Before Applying

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan output
- OpenTofu JSON plan format
- jq
- Bash
- AWS provider RDS `aws_db_instance`

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu sensitive output documentation: https://opentofu.org/docs/language/values/outputs/
- HashiCorp AWS provider `aws_db_instance` resource schema source: https://github.com/hashicorp/terraform-provider-aws/blob/main/internal/service/rds/instance.go

## Issues Found
- The replacement example said changing `engine_version` from `15.3` to `15.4` forces replacement. In the current AWS provider schema, `engine_version` is not marked `ForceNew`, while attributes such as `availability_zone`, `engine`, `kms_key_id`, and `storage_encrypted` are. I changed the example to use `availability_zone` and updated the accompanying immutable-attribute examples.
- The plan symbol list only showed `-/+` replacement. OpenTofu's JSON format represents replacement as either `["delete","create"]` or `["create","delete"]`, so I added the corresponding `+/-` create-before-destroy replacement symbol.
- The JSON examples only matched pure deletes or `["delete","create"]` replacements. That missed create-before-destroy replacements. I updated the `jq` filters to use `index("delete")` and `index("create")`, so deletes and replacements are counted correctly regardless of action order.

## Review Notes
- `tofu` was not installed in the local environment, so CLI behavior was verified against official OpenTofu documentation rather than local `--help` output.
- The author GitHub profile link resolves correctly.
- Saved binary plan files can contain sensitive values even when terminal output redacts them; treat `tfplan.binary` and derived JSON artifacts as sensitive CI artifacts.
