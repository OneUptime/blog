# Validation Summary: How to Use the -state Flag for Custom State File Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform local and remote backends
- Shell scripting
- HCL backend configuration

## Sources Consulted
- HashiCorp Terraform local backend documentation: https://developer.hashicorp.com/terraform/language/backend/local
- HashiCorp Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform show command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform state command reference: https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform state mv command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform state list command reference: https://developer.hashicorp.com/terraform/cli/commands/state/list
- HashiCorp Terraform state show command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- HashiCorp Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- HashiCorp Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Terraform state documentation: https://developer.hashicorp.com/terraform/language/state

## Issues Found
- The post treated `-state` and `-state-out` as general current flags without consistently noting that they are legacy options for local backend workflows. Updated the introduction and relevant sections to clarify the local-backend scope.
- The `terraform show -state=custom.tfstate` example was invalid. Terraform `show` accepts a state or plan file path as a positional argument, so it was changed to `terraform show custom.tfstate`.
- The local testing workflow implied that `terraform plan -state=...` could be used directly with a remote backend configuration. Updated the example to pull remote state from the remote-initialized configuration and then test from a scratch copy initialized with `terraform init -backend=false`.
- The migration script used `terraform state mv` with only one resource address. The command requires both a source and destination address, so the example now passes both addresses.
- The environment variable section referenced `TF_STATE`, which is not a documented Terraform CLI environment variable. Replaced it with `TF_CLI_ARGS_plan` and `TF_CLI_ARGS_apply`, which are documented by HashiCorp.
- The shell alias examples placed `-state` before the Terraform subcommand, which would be parsed as an invalid global option. Replaced them with documented environment-variable usage and a wrapper script that places `-state` after the selected subcommand.
- The wrapper script originally appended `-state` after all user arguments, which can be brittle for command parsing. Updated it to extract the Terraform subcommand and place `-state` and `-var-file` immediately after it.
- The warning "No automatic backup with -state" contradicted the body text. Renamed it to "Backup filename changes with -state" to match Terraform's documented local backend backup behavior.

## Review Notes
Terraform was not installed in the local environment, so command verification was performed against HashiCorp's current official documentation rather than local `terraform --help` output. The post now describes `-state` and `-state-out` as legacy local-backend tools; future revisions could further emphasize that configuring the local backend `path` or using normal backend configuration is preferred for routine workflows.
