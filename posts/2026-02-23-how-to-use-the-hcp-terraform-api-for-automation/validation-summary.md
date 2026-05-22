# Validation Summary: How to Use the HCP Terraform API for Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud API
- JSON:API
- curl
- Bash
- jq
- Python
- requests

## Sources Consulted
- HCP Terraform API overview: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform Workspace Variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HCP Terraform Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform Organization Tags API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organization-tags

## Issues Found
- Workspace creation used `tag-names` in the create-workspace payload. The current Workspaces API documents key/value tags through `relationships.tag-bindings` when creating or updating workspaces, so the create-workspace examples now use `tag-bindings`.
- Workspace list filters and pagination examples used unencoded bracketed query parameters, such as `search[name]` and `page[number]`. HashiCorp's API documentation instructs clients to percent-encode bracket characters when tooling does not encode them automatically, so those URLs now use `%5B` and `%5D`.
- The workspace tag filter example used the flat tag search parameter while the workspace creation examples now use key/value tag bindings. The filter example now uses the documented `filter[tagged][0][key]` and `filter[tagged][0][value]` parameters.
- The run status example selected `resource-additions`, `resource-changes`, and `resource-destructions` from the run object, but those fields are not documented in the Runs API response. The example now selects documented run attributes: `status`, `message`, `created-at`, `has-changes`, `source`, and `trigger-reason`.
- The waiting examples described `planned` as a terminal state. HashiCorp documents `planned`, `planned_and_saved`, and `policy_checked` as non-final states that may require confirmation, so the Bash and Python examples now describe them as approval-required stop states rather than terminal states.
- The run creation and apply examples did not mention token type restrictions. The Runs API documents that organization tokens cannot access these endpoints, so the post now notes that user or team tokens are required for run creation and apply actions.
- The Python workspace creation helper still used `tag-names`. It now builds documented `tag-bindings` relationships and the usage example passes key/value tag bindings.

## Review Notes
The Bash examples still build JSON payloads with shell interpolation for readability. In production automation, constructing those payloads with `jq` or another JSON-aware tool would better handle values containing quotes, newlines, or other special characters.
