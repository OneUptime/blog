# Validation Summary: How to Handle Terraform State in HCP Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- HCP Terraform / Terraform Cloud
- Terraform state and remote state
- HCP Terraform API
- HashiCorp TFE provider
- AWS provider examples
- Bash, curl, and jq

## Sources Consulted
- Terraform state documentation: https://developer.hashicorp.com/terraform/language/state
- Terraform remote state documentation: https://developer.hashicorp.com/terraform/language/state/remote
- `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform state CLI command documentation: https://developer.hashicorp.com/terraform/cli/commands/state
- Terraform output CLI command documentation: https://developer.hashicorp.com/terraform/cli/commands/output
- HCP Terraform workspace state documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/state
- HCP Terraform state versions API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- HCP Terraform workspaces API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform workspace permissions documentation: https://developer.hashicorp.com/terraform/enterprise/users-teams-organizations/permissions/workspace
- TFE provider `tfe_outputs` data source documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/outputs
- TFE provider `tfe_team_access` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- Terraform output values tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/outputs

## Issues Found
- The state version listing API example used `GET /workspaces/:workspace_id/state-versions`, but the documented list endpoint is `GET /state-versions` with `filter[organization][name]` and `filter[workspace][name]` query parameters. Updated the example to use the documented endpoint with percent-encoded query parameter names.
- The API rollback example attempted to create a new state version by posting base64 state content with an incremented serial. HCP Terraform requires uploaded state version metadata such as `serial` to match the raw state file, and the API provides a dedicated rollback operation. Replaced the example with the documented `PATCH /workspaces/:workspace_id/state-versions` rollback relationship payload.
- The rollback section did not mention that the workspace must be locked by the user or team token performing the rollback. Added that requirement and locked the workspace in the API example.
- The state sharing permissions explanation said the consuming workspace needs state read access. Updated it to clarify that the token used by the consuming workspace needs read output or state permissions on the source workspace.
- The state security snippet said `lifecycle.ignore_changes` prevents sensitive attributes from appearing in plans. That is too broad; it ignores future drift for the named attribute but does not keep sensitive values out of state. Updated the wording to describe the narrower behavior.

## Review Notes
The backup script retrieves the first page of up to 100 workspaces and is suitable as a simple example, but a production version should follow pagination links to cover organizations with more than 100 workspaces. The `tfe_outputs.values` attribute is documented as preemptively sensitive; for non-sensitive outputs, `nonsensitive_values` can avoid propagating sensitivity through consuming configurations.
