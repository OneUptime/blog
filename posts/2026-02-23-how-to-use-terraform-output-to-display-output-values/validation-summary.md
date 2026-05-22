# Validation Summary: How to Use terraform output to Display Output Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform CLI
- Terraform output blocks
- Terraform remote state
- HCL
- jq
- PostgreSQL psql
- Shell scripting
- Ansible
- Docker

## Sources Consulted
- HashiCorp Terraform CLI `output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform outputs language guide: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform `refresh` command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- HashiCorp Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- PostgreSQL `psql` command documentation: https://www.postgresql.org/docs/current/app-psql.html

## Issues Found
- The `psql` example passed the Terraform `database_endpoint` output directly to `psql -h`. Because an RDS-style endpoint commonly contains `host:port`, and `psql` expects host and port as separate `-h` and `-p` options, the example was changed to split the endpoint before invoking `psql`.
- The refresh section showed `terraform refresh` as the primary command. HashiCorp documents `terraform refresh` as deprecated and recommends `terraform apply -refresh-only` where supported, so the examples were reordered and updated to present refresh-only mode first.
- The "Good output with all best practices" example recommended typed outputs but did not include a `type` argument. The example now includes `type = string`.

## Review Notes
Terraform was not installed in the local workspace, so CLI behavior was checked against current official HashiCorp documentation rather than local `terraform --help` output. The remaining Terraform output examples, JSON parsing examples, sensitive output behavior, module output references, remote state usage, and output precondition examples match the official documentation reviewed.
