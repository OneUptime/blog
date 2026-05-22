# Validation Summary: How to Use Terraform with Port for Internal Developer Platform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Port Terraform provider
- Port self-service actions and scorecards
- GitHub Actions
- AWS Terraform provider

## Sources Consulted
- Port Terraform provider documentation: https://registry.terraform.io/providers/port-labs/port-labs/latest/docs
- Port Terraform provider source and generated resource docs: https://github.com/port-labs/terraform-provider-port-labs
- Port backend setup documentation: https://docs.port.io/actions-and-automations/setup-backend.md
- Port GitHub workflow backend documentation: https://docs.port.io/actions-and-automations/setup-backend/github-workflow.md
- Port GitHub Action source and usage documentation: https://github.com/port-labs/port-github-action
- GitHub Actions workflow_dispatch documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- HashiCorp setup-terraform action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The `port_action` examples used top-level `blueprint`, `trigger`, and `user_properties` fields. Updated them to use `self_service_trigger` with `operation`, `blueprint_identifier`, and nested `user_properties`, matching the current Port Terraform provider schema.
- The GitHub action backend examples did not pass `workflow_inputs`, but the workflow expected explicit inputs such as `service_name` and `port_run_id`. Added `workflow_inputs = jsonencode(...)` mappings using Port's documented template variables.
- `required_approval` was set as a boolean, but the provider schema expects a string value such as `"true"`, `"false"`, `"ANY"`, or `"ALL"`. Changed it to `"true"`.
- The Terraform workspace blueprint defined `string_props` twice in the same object, which would make the HCL invalid. Merged `last_apply_time` into the existing `string_props` map.
- The scorecard example used a map for `rules` and raw objects for `conditions`; the provider expects a list of rule objects and `conditions` as JSON-encoded strings. Updated the scorecard rule syntax accordingly.
- The scorecard referenced `has_monitoring`, but the service blueprint did not define that property. Added the `has_monitoring` boolean property.
- The Terraform state sync example referenced `data.aws_caller_identity.current` without defining the data source. Added `data "aws_caller_identity" "current" {}`.
- The GitHub workflow wrote `terraform output -json` directly to `$GITHUB_OUTPUT`, which can break with multi-line JSON. Changed it to compact JSON with `jq -c` and quoted `$GITHUB_OUTPUT`.
- The GitHub workflow used boolean inputs but did not declare their types. Added `type: boolean` to the `include_database` and `include_cache` inputs.

## Review Notes
Terraform was not installed in the review environment, so `terraform validate` could not be run locally. The corrected Terraform snippets were checked statically against the current Port Terraform provider resource schemas and official Port documentation. The workflow is still an illustrative template and assumes the Terraform modules, templates, credentials, and repository structure shown in the examples exist in the user's environment.
