# Validation Summary: How to List All Workspaces with terraform workspace list

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Terraform CLI
- Terraform workspaces
- Terraform local backend
- Terraform S3 backend
- Terraform Consul backend
- HCP Terraform CLI integration
- Bash scripting
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform CLI command reference: `terraform workspace list`: https://developer.hashicorp.com/terraform/cli/commands/workspace/list
- HashiCorp Terraform CLI workspaces overview: https://developer.hashicorp.com/terraform/cli/workspaces
- HashiCorp Terraform state workspaces documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform local backend documentation: https://developer.hashicorp.com/terraform/language/settings/backends/local
- HashiCorp HCP Terraform CLI integration / `cloud` block settings: https://developer.hashicorp.com/terraform/cli/cloud/settings
- HashiCorp `setup-terraform` GitHub Action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The post stated that the `default` workspace always appears first. Official documentation confirms that `default` always exists and cannot be deleted, but does not document first-position ordering as a contract. Changed the wording to state only the guaranteed behavior.
- The post referred to "Terraform Cloud backend" behavior around the `cloud` block. Current HashiCorp documentation describes this as HCP Terraform CLI integration, not a backend block. Updated the wording and section heading accordingly.
- The HCP Terraform section said the command only shows workspaces associated with the configuration's `cloud` block and may include workspaces without local configuration. Clarified that `workspace list` shows the named workspace or tag-matching workspaces from the `cloud` block, and that tag selection can include every remote workspace matching the selector.
- The sorting section said output is typically alphabetically sorted after `default`. Because official docs do not specify this ordering as guaranteed, changed the guidance to explicitly sort when scripts require a specific order.
- The troubleshooting section said that if Terraform cannot reach the backend it will only show `default`. Remote backend access problems generally produce an error rather than a reliable fallback list. Updated the troubleshooting text to distinguish "only default exists" from backend listing failures.

## Review Notes
The Bash examples are syntactically valid for ordinary Terraform workspace names. For production automation, scripts should still handle nonzero exit statuses from `terraform workspace select`, `terraform plan`, and backend access failures explicitly.
