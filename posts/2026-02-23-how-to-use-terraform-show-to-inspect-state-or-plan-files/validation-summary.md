# Validation Summary: How to Use terraform show to Inspect State or Plan Files

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform state files
- Terraform saved plan files
- Terraform JSON output format
- jq
- Bash scripting

## Sources Consulted
- HashiCorp Terraform CLI `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform CLI `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform JSON output format reference: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Terraform plan tutorial: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- HashiCorp Terraform sensitive data guidance: https://developer.hashicorp.com/terraform/language/manage-sensitive-data

## Issues Found
- Several state JSON `jq` examples only read `.values.root_module.resources[]`, which misses resources in child modules. Updated the examples to traverse `.values.root_module | recurse(.child_modules[]?) | .resources[]?`, matching Terraform's documented nested values representation.
- The resource counting examples used `group_by(.)` without first sorting the extracted values. Updated them to sort before grouping so the counts are reliable with jq.
- The sensitive values section described JSON output as marking sensitive values with a `sensitive` field. Updated it to state that `terraform show -json` includes sensitive state values in plain text and exposes `sensitive_values` metadata for resource attributes.
- The saved plan staleness note said Terraform warns when state changes between plan and `show`. Updated it to clarify that stale saved plans are reported when applying the saved plan, and that a fresh plan should be generated before applying.
- The large-state module filter assumed `child_modules` exists directly under the root module. Updated it to use recursive traversal and optional child module access.

## Review Notes
Terraform was not installed in the local workspace, so command behavior was verified against current official HashiCorp documentation rather than local `terraform show -help` output. The post's examples are otherwise consistent with the documented `terraform show [options] [file]` usage, `-json` output mode, plan `resource_changes`, and saved plan workflow.
