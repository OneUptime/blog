# Validation Summary: How to Upgrade from HCP Terraform Free to Paid Plans

## Status
validated

## Post Type
Guide

## Technologies Covered
- HCP Terraform
- Terraform CLI state commands
- HCP Terraform API
- HCP Terraform Explorer API
- HCP Terraform organization, team, and membership APIs
- Sentinel policy enforcement
- Bash, curl, and jq

## Sources Consulted
- HCP Terraform plans and features: https://developer.hashicorp.com/terraform/cloud-docs/overview
- HCP Terraform cost estimation and managed resources: https://developer.hashicorp.com/terraform/cloud-docs/overview/estimate-hcp-terraform-cost
- IBM HashiCorp Terraform pricing: https://www.hashicorp.com/en/pricing?tab=terraform
- HCP Terraform API overview and entitlements: https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- Organizations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organizations
- Explorer API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/explorer
- Workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- Workspace resources API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-resources
- Teams API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams
- Organization memberships API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organization-memberships
- Sentinel tfplan/v2 import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel Terraform policy tutorial: https://developer.hashicorp.com/terraform/tutorials/policy/sentinel-policy

## Issues Found
- The post used outdated plan names and described only Free, Standard, and Plus. Updated this to Free plus paid Essentials, Standard, and Premium editions, matching current HashiCorp pricing and plan documentation.
- The post stated that Free lacked Sentinel policy enforcement and that Standard was the first tier with team management. Updated the feature descriptions to reflect current documentation: Free includes limited policy support, team management is available in paid editions starting with Essentials, and Standard/Premium add broader governance workflows.
- The API examples queried `managed-resource-count`, `plan`, and `user-count` from the organization endpoint. Current official organization API responses do not document those attributes. Replaced those examples with documented Explorer API `current_rum_count` queries and the organization entitlement-set endpoint.
- The workspace cost-audit example used workspace `resource-count`, which is not the same as billable resources under management because workspace resource counts can include data sources. Replaced it with Explorer API `current_rum_count`, which is documented as resources under management.
- The membership invitation payload omitted the required `relationships.teams.data[]` entry. Added a team relationship to match the current Organization Memberships API requirement that invited users be added to at least one team.
- The cleanup section suggested using `terraform state rm` without warning that leaving the resource in configuration will cause Terraform to plan recreation. Added a short warning to remove or convert configuration first.
- The examples implied that a single page of API results listed all workspaces. Added wording that the examples cover up to 100 workspaces and require pagination for larger organizations.
- Downgrade instructions were overly broad. Updated them to match the documented pay-as-you-go downgrade path through Plan & Billing.

## Review Notes
The Sentinel example follows the documented `tfplan/v2` import pattern and is syntactically consistent with HashiCorp examples. The monitoring script remains intentionally simple; for organizations with more than 100 workspaces, it should be extended to paginate through all Explorer API pages.
