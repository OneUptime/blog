# Validation Summary: How to Configure Run Triggers in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform run triggers
- Terraform Enterprise/HCP Terraform API
- HashiCorp `tfe` provider
- Terraform `terraform_remote_state` data source
- Terraform `tfe_outputs` data source
- AWS Terraform provider examples

## Sources Consulted
- HCP Terraform run triggers documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-triggers
- HCP Terraform run triggers API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-triggers
- HCP Terraform workspace settings documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform run states and stages documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/states
- HashiCorp `tfe_run_trigger` provider resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/run_trigger
- HashiCorp `tfe_outputs` provider data source documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/outputs

## Issues Found
- The post stated that triggered runs automatically apply when normal workspace auto-apply is enabled. HCP Terraform has a separate "Auto-apply run triggers" setting for runs initiated by run triggers, so the wording was corrected.
- The API create example included a top-level `data.type` field not shown in the official create-run-trigger request body. The payload was aligned with the documented request body.
- The remote state section did not mention that HCP Terraform workspaces must allow remote state access before `terraform_remote_state` can read outputs. A prerequisite sentence was added.
- The `tfe_outputs` example used `values` for non-sensitive output values. The provider marks `values` sensitive and documents `nonsensitive_values` for non-sensitive outputs, so the example was changed accordingly.
- The failure-handling section said a failed downstream workspace does not prevent further downstream triggers. Because run triggers fire only after successful applies, the wording was corrected to explain that triggers sourced from the failed workspace do not fire, while independent branches can continue.

## Review Notes
The post is technically relevant and the corrected examples match the current HCP Terraform and `tfe` provider behavior. HCP Terraform limits each workspace to 20 source workspaces, which could be worth mentioning in a future expansion but is not required for correctness.
