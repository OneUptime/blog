# Validation Summary: How to Use Teams and Permissions in HCP Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud
- Terraform Enterprise API
- Terraform `tfe` provider
- Terraform HCL
- SAML SSO team mapping

## Sources Consulted
- HCP Terraform permissions overview: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions
- HCP Terraform organization permissions: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/organization
- HCP Terraform workspace permissions: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace
- HCP Terraform project permissions: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/project
- HCP Terraform Teams API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams
- HCP Terraform SSO documentation: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on
- `tfe_team` provider resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team
- `tfe_team_access` provider resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- `tfe_team_project_access` provider resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_project_access
- `tfe_team_member` and `tfe_team_organization_member` provider resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_member and https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_organization_member

## Issues Found
- The permission model and Owners-team description implied teams apply universally across HCP Terraform. Updated them to note that HCP Europe organizations manage user access through HCP groups instead of teams, matching current HashiCorp documentation.
- The text called Owners and Custom Teams "built-in groups." Updated this to "team types" because custom teams are user-created teams, not built-in groups.
- The team membership section did not state that users must already be organization members before they can be added to teams. Added that prerequisite and kept the existing organization membership example.
- The project access preset descriptions overstated Write and Maintain permissions. Updated them to align with HashiCorp's current project role model: Write covers day-to-day workspace actions such as runs, while Maintain adds workspace creation/deletion, and Admin covers project settings, moves, deletion, and team access.

## Review Notes
The Terraform and API examples use current `tfe` resource names, permission block names, and valid permission values. Future improvements could mention `read_workspaces`, `read_projects`, team-management permissions, and agent-pool permissions in the organization-level permissions table, but their omission is not technically incorrect because the table is presented as key permissions rather than a complete reference.
