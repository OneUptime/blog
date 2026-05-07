# Validation Summary: How to Avoid Large Monolithic State Files in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu state management and backends
- OpenTofu CLI
- HCL
- Amazon S3 backend
- AWS Systems Manager Parameter Store
- HashiCorp AWS provider

## Sources Consulted
- OpenTofu docs, "Purpose of OpenTofu State": https://opentofu.org/docs/language/state/purpose/
- OpenTofu docs, "State Storage and Locking": https://opentofu.org/docs/language/state/backends/
- OpenTofu docs, "State Locking": https://opentofu.org/docs/language/state/locking/
- OpenTofu docs, "Command: plan": https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, "Command: state list": https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu docs, "The terraform_remote_state Data Source": https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu docs, "Backend Type: s3": https://opentofu.org/docs/language/settings/backends/s3/
- Terraform Registry, `aws_ssm_parameter` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform Registry, `aws_ssm_parameter` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter

## Issues Found
- The introduction stated that every plan refreshes all resources and every apply locks the entire state without qualification. I updated this to match the docs: refresh is the default planning behavior, and state locking depends on backend support.
- The section heading and explanatory sentence referred generically to `remote_state`. I corrected this to the actual OpenTofu data source name, `terraform_remote_state`, and clarified that it exposes root module outputs.
- The `aws_instance` example comment said it was using a VPC ID, but the code actually reads `private_subnet_ids[0]`. I corrected the comment so it matches the configuration.
- The numeric state-size guidance was written like a hard recommendation. I softened that wording into a practical heuristic because OpenTofu documentation does not define an official resource-count threshold.

## Review Notes
- `terraform_remote_state` is valid and supported, but the official OpenTofu docs recommend publishing shared data to an explicit external store such as SSM Parameter Store when practical.
- The exact resource count at which a state should be split is workload-specific and depends on provider API behavior, refresh cost, and team ownership boundaries.
- The `tofu` CLI was not installed in the local environment, so command verification was done against official documentation rather than local `--help` output.
