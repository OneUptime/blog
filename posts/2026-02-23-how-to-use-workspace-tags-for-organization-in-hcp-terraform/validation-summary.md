# Validation Summary: How to Use Workspace Tags for Organization in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform workspace tags
- Terraform CLI `cloud` block workspace selection
- HashiCorp TFE Terraform provider
- HCP Terraform Workspaces API
- Bash and `curl`
- Python `requests`

## Sources Consulted
- HCP Terraform workspace tags documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/tags
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- Terraform CLI HCP Terraform connection settings: https://developer.hashicorp.com/terraform/cli/cloud/settings
- TFE provider `tfe_workspace` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- TFE provider `tfe_workspace_ids` data source documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/data-sources/workspace_ids
- TFE provider `tfe_workspace_variable_set` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_variable_set
- TFE provider `tfe_variable_set` and `tfe_variable` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable_set

## Issues Found
- The TFE provider examples used flat `tag_names` lists and `execution_mode = "remote"`. Updated the workspace examples to use current key-value `tags` maps and removed the deprecated direct `execution_mode` setting.
- The API add-tags example used the flat string tag relationship endpoint. Updated it to use `PATCH /workspaces/:workspace_id/tag-bindings` for key-value tags.
- The workspace filtering examples used unencoded bracket query parameters and legacy `search[tags]` filtering. Updated them to use percent-encoded `filter[tagged][i][key]` and `filter[tagged][i][value]` query parameters for key-value tag filtering.
- The bulk operation script accepted a single flat tag name. Updated it to accept a tag key and value and use the current key-value tag filter parameters.
- The `tfe_workspace_ids` data source example used deprecated `tag_names`. Updated it to use `tag_filters.include`.
- The reporting script read legacy `tag-names` from workspace attributes. Updated it to query `effective-tag-bindings` and report key-value tags, including inherited project tags.
- The UI instructions referred only to tag names. Updated them to mention tag keys and values.

## Review Notes
Terraform was not installed in the local environment, so HCL snippets were reviewed statically against the official provider documentation rather than formatted or validated with `terraform validate`.
