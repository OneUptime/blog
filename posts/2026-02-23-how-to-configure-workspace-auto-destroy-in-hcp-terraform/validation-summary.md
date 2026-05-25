# Validation Summary: How to Configure Workspace Auto-Destroy in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform
- HCP Terraform Workspace API
- HCP Terraform Workspace Notifications API
- Terraform cloud block
- AWS EC2
- AWS RDS
- Bash and curl

## Sources Consulted
- HCP Terraform workspace API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform destruction and deletion settings: https://developer.hashicorp.com/terraform/enterprise/workspaces/settings/deletion
- HCP Terraform workspace settings: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform workspace notification configurations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations/workspace
- HCP Terraform workspace variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- Terraform block reference for the cloud block: https://developer.hashicorp.com/terraform/language/terraform
- Terraform AWS provider aws_db_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The UI instructions used older or inaccurate labels for enabling auto-destroy. Updated the steps to use the documented **Automatically destroy**, **Set up auto-destroy**, and **Confirm auto-destroy** labels.
- The activity-based auto-destroy explanation said the timer resets every time a run completes. HCP Terraform defines inactivity by state changes, and runs that update Terraform state delay the scheduled destroy time. Updated the wording accordingly.
- The disable example only cleared `auto-destroy-at`, which does not disable an activity-based auto-destroy duration. Updated the payload to also clear `auto-destroy-activity-duration`.
- The notification configuration payload used the plural `notification-configurations` resource type in a create request. The create request body documents `notification-configuration`, so the example was corrected.
- The notification example used generic run lifecycle triggers rather than the auto-destroy reminder and result triggers. Updated the triggers to `workspace:auto_destroy_reminder` and `workspace:auto_destroy_run_results`.

## Review Notes
The API examples use GNU `date -d`, which is valid on common Linux environments but differs on macOS unless GNU coreutils is installed. The AWS AMI ID is region-specific example data; a production tutorial could note that users should select an AMI valid for their target AWS region.
