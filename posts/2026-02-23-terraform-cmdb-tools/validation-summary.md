# Validation Summary: How to Use Terraform with CMDB Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform HTTP provider
- Terraform null provider
- ServiceNow CMDB and Table API
- ServiceNow Terraform provider
- GitHub Actions
- Bash, curl, and jq
- Python requests

## Sources Consulted
- HashiCorp Terraform `output` command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp HTTP provider `http` data source documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp null provider `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- HCP Terraform run tasks documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks
- HashiCorp Service Graph Connector for Terraform documentation: https://developer.hashicorp.com/terraform/enterprise/integrations/service-now/service-graph/service-graph-setup
- Terraform Registry API for `tylerhatton/servicenow`: https://registry.terraform.io/v1/providers/tylerhatton/servicenow
- `tylerhatton/terraform-provider-servicenow` `servicenow_server` resource documentation: https://github.com/tylerhatton/terraform-provider-servicenow/blob/master/docs/resources/server.md
- ServiceNow Server `[cmdb_ci_server]` class documentation: https://www.servicenow.com/docs/r/servicenow-platform/configuration-management-database-cmdb/class-server.html
- ServiceNow Table API documentation: https://www.servicenow.com/docs/r/api-reference/rest-apis/c_TableAPI.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions

## Issues Found
- The ServiceNow provider example used `version = "~> 0.10"` even though the current Registry release is `0.11.0`. Updated the constraint to `~> 0.11`.
- The ServiceNow provider example used a non-existent `servicenow_cmdb_ci_server` resource and unsupported fields such as `category`, `environment`, and `attributes`. Replaced it with the provider's documented `servicenow_server` resource and supported arguments.
- The Python Terraform state sync example claimed to synchronize all Terraform-managed resources but only read resources in the root module. Updated it to recurse through `child_modules`.
- The GitHub Actions workflow only triggered on `pull_request`, so the `push`-only apply step could never run. Added a `push` trigger for `main`.
- The GitHub Actions validation step referenced `plan.json` from the repository root even though it was created under `terraform/plan.json`. Updated the path.
- The GitHub Actions apply step changed into the `terraform` directory and then referenced `scripts/cmdb_sync.py` as if it were inside that directory. Updated the command to use `../scripts/cmdb_sync.py`.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was checked against HashiCorp's official command documentation rather than local `terraform --help` output. The ServiceNow API examples are intentionally generic and still require instance-specific table fields, ACLs, authentication setup, and CMDB data model decisions before production use.
