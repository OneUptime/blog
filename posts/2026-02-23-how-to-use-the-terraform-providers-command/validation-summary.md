# Validation Summary: How to Use the terraform providers Command

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform providers
- Terraform provider schemas
- Terraform dependency lock files
- Terraform provider mirrors
- HCL CLI configuration
- Bash and jq

## Sources Consulted
- HashiCorp Terraform CLI `providers` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers
- HashiCorp Terraform CLI `providers schema` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/schema
- HashiCorp Terraform CLI `providers mirror` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- HashiCorp Terraform CLI `providers lock` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- HashiCorp Terraform CLI configuration documentation: https://developer.hashicorp.com/terraform/cli/config/config-file

## Issues Found
- The post said there were "three main subcommands" but listed the base command plus three subcommands. Changed this to "the most useful commands in this family" to avoid an inaccurate count while preserving the surrounding explanation.
- The CI example used `terraform providers -json`, but the official `terraform providers` command documentation does not list a JSON output option. Changed the example to use the documented `terraform providers schema -json` output and read provider addresses from `.provider_schemas`.
- The CI example piped into a `while` loop and called `exit 1` inside the loop. In Bash, that loop runs in a subshell in the original form, so the script could still print success after detecting an unauthorized provider. Changed it to use process substitution so `exit 1` exits the script, and changed the provider allow-list check to use exact line matching.
- The CI example set `TF_CLI_CONFIG_FILE=".terraformrc"`. HashiCorp documents `.terraformrc` as the default Unix user-level file and says files selected with `TF_CLI_CONFIG_FILE` should follow the `*.tfrc` naming pattern. Changed the example to `ci.tfrc`.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The provider schema examples assume Terraform has already initialized the working directory so provider schemas are available.
