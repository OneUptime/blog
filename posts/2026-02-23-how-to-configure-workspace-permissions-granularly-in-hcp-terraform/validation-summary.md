# Validation Summary: How to Configure Workspace Permissions Granularly in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Enterprise API / HCP Terraform API
- Workspace permissions
- Team access and organization access
- JSON:API request payloads
- Bash, curl, and jq

## Sources Consulted
- HCP Terraform Workspace permissions: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace
- HCP Terraform Permissions overview: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions
- HCP Terraform Team access API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-access
- HCP Terraform Teams API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams
- HCP Terraform Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform Teams overview: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/teams

## Issues Found
- The post described workspace access as having five built-in permission levels. HashiCorp documents four fixed workspace permission sets, Read, Plan, Write, and Admin, plus a Custom option. Updated the wording to match the official terminology.
- The audit example used `GET /workspaces/$WORKSPACE_ID/team-access`, which is not the documented Team Access API endpoint. Updated it to `GET /team-workspaces?filter%5Bworkspace%5D%5Bid%5D=$WORKSPACE_ID`.
- The bulk assignment script claimed to assign a team to all workspaces with a tag, but it only fetched one page of up to 100 workspaces. Updated the script to iterate through paginated workspace results.

## Review Notes
The team creation payloads, `team-workspaces` payloads, custom permission attribute names, and documented custom permission values match the current HCP Terraform API documentation. HCP Europe organizations use HCP groups instead of teams, but the post is accurate for standard HCP Terraform organizations using teams.
