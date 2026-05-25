# Validation Summary: How to Configure Run Queuing in HCP Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- HCP Terraform
- Terraform runs and run queues
- HCP Terraform Runs API
- HCP Terraform Workspaces API
- HCP Terraform notification configurations
- HCP Terraform run triggers
- Bash, curl, and jq

## Sources Consulted
- HCP Terraform Runs API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HCP Terraform run states and stages: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/states
- HCP Terraform run modes and options: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/modes-and-options
- HCP Terraform remote operations: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/remote-operations
- HCP Terraform workspace settings: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform workspace notification configurations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- HCP Terraform run triggers API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-triggers

## Issues Found
- The post described all workspace runs as strictly one-at-a-time. Updated the wording to qualify this for non-speculative runs because HCP Terraform plan-only/speculative runs ignore the per-workspace run queue and do not block other runs.
- The plan-only Runs API example omitted `terraform-version`. Added the field with a placeholder value because HashiCorp documents this as required when creating plan-only runs through the API.
- The auto-apply section did not mention documented exceptions. Added a short clarification that run-triggered runs use the separate `auto-apply-run-trigger` setting and CLI-driven runs use the Terraform CLI `-auto-approve` flag.
- The queued-run cancellation section used the cancel endpoint for pending queued runs. Changed it to the discard endpoint because HashiCorp documents cancel for planning/applying runs and discard for pending or paused runs.
- The force-cancel explanation missed the prerequisite that a normal cancel must be requested first and the cool-off period must elapse. Added that constraint.
- The queue cleanup script canceled pending runs. Updated it to discard stale pending runs instead.
- The best-practices list advised canceling superseded queued runs. Updated it to advise discarding superseded queued runs.

## Review Notes
The examples use placeholder organization, workspace, token, and Terraform version values. Users must replace those with real values and use a user or team token for run apply, discard, cancel, and force-cancel actions where organization tokens are not supported.
