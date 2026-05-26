# Validation Summary: How to Debug Terragrunt Configuration Issues

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- Terragrunt
- Terraform
- HCL
- Graphviz DOT output
- jq

## Sources Consulted
- Terragrunt CLI global flags: https://docs.terragrunt.com/reference/cli/global-flags/
- Terragrunt render command: https://docs.terragrunt.com/reference/cli/commands/render/
- Terragrunt dag graph command: https://docs.terragrunt.com/reference/cli/commands/dag/graph/
- Terragrunt run command and run --all behavior: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt HCL functions, including find_in_parent_folders and read_terragrunt_config: https://docs.terragrunt.com/reference/hcl/functions/
- Terragrunt HCL blocks, including include, dependency, and generate: https://docs.terragrunt.com/reference/hcl/blocks/
- Terraform debug logging: https://developer.hashicorp.com/terraform/internals/debugging
- Terraform CLI environment variables: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- The post used older Terragrunt CLI names and flags (`render-json`, `graph-dependencies`, `run-all`, `--terragrunt-log-level`, `--terragrunt-parallelism`, `TERRAGRUNT_LOG_LEVEL`, and `--terragrunt-json-out`). Updated examples to current equivalents: `render --format json`, `dag graph`, `run --all`, `--log-level`, `--parallelism`, and `TG_LOG_LEVEL`.
- The `read_terragrunt_config()` fallback example used `try()` around `find_in_parent_folders()`. Updated it to use Terragrunt's documented fallback arguments for `find_in_parent_folders()` and `read_terragrunt_config()`.
- The "Locals Block Not Allowed" section described an error that did not match the example. Updated it to "Variable Block Not Allowed" and clarified that Terraform `variable` blocks are not valid in `terragrunt.hcl`.
- The generated backend example contained an active invalid `region = "${var.region}"` line alongside the corrected Terragrunt local value. Commented out the invalid Terraform-context reference and corrected the explanatory comment to match `local.aws_region`.
- The dependency inspection example queried `.dependencies`; updated it to `.dependency` to match Terragrunt's `dependency` block rendering.
- The claim that Terragrunt trace logging shows file contents was too broad. Reworded it to say trace logging shows the most verbose Terragrunt details.

## Review Notes
Terragrunt 1.x documentation now emphasizes the redesigned CLI. The corrected examples use current command names, while some legacy command forms may still be familiar to older Terragrunt users.
