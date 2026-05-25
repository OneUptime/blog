# Validation Summary: How to Create an Organization in HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform
- Terraform Cloud / app.terraform.io
- HCP Terraform API
- HashiCorp `tfe` Terraform provider
- HCP Terraform teams, projects, workspaces, API tokens, VCS providers, SSO, 2FA, and cost estimation

## Sources Consulted
- HCP Terraform Organizations overview: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/organizations
- HCP Terraform Organization settings reference: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/organizations/settings
- HCP Terraform Organizations API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organizations
- HCP Terraform API tokens documentation: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens
- HCP Terraform SSO documentation: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on
- HCP Terraform Teams and workspace access documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/access
- HCP Terraform Projects documentation: https://developer.hashicorp.com/terraform/cloud-docs/projects
- HCP Terraform VCS providers documentation: https://developer.hashicorp.com/terraform/enterprise/vcs
- HCP Terraform GitHub App VCS provider documentation: https://developer.hashicorp.com/terraform/cloud-docs/vcs/github-app
- HCP Terraform GitHub OAuth VCS provider documentation: https://developer.hashicorp.com/terraform/enterprise/vcs/github
- HCP Terraform cost estimation documentation: https://developer.hashicorp.com/terraform/enterprise/cost-estimation
- HashiCorp `tfe` provider `tfe_organization` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization
- HashiCorp `tfe` provider `tfe_team` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team
- HashiCorp `tfe` provider `tfe_team_access` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- HashiCorp `tfe` provider `tfe_project` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/project
- HashiCorp `tfe` provider `tfe_workspace` resource: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace

## Issues Found
- The post stated that the organization name cannot change after creation. HCP Terraform supports renaming organizations, although HashiCorp warns that it can be disruptive. Updated the general settings example accordingly.
- The session settings used "Session Expiration" wording and only described idle timeout. Current HCP Terraform settings refer to Idle Session Timeout and Forced Re-Authentication. Updated the label and explanation.
- The SSO section said SSO was available on the Business tier and named Azure AD. Current HCP Terraform docs describe SSO availability differently and use Microsoft Entra ID naming. Updated the wording to avoid outdated tier terminology.
- The API token section described organization tokens as full-access CI/CD tokens. HashiCorp documents organization tokens as broad organization setup/configuration tokens with limitations, and recommends team tokens for routine workspace automation. Updated the guidance.
- The workspace access list implied `custom` could be used as a fixed `tfe_team_access.access` value. The `tfe` provider requires a `permissions` block for custom workspace permissions. Added that caveat.
- The GitHub VCS setup steps only described registering an OAuth application. Current HCP Terraform supports a preconfigured GitHub App flow for GitHub.com, with OAuth still available for custom GitHub.com and GitHub Enterprise setups. Updated the steps.
- The cost estimation section said paid-tier cost estimation appears in every plan output. Current docs describe cost estimation as a run phase between plan and apply. Updated the wording.

## Review Notes
The API and `tfe` provider examples are syntactically consistent with current official documentation. The post still uses the non-Europe `app.terraform.io` HCP Terraform flow; HCP Europe organizations have different HCP-managed organization, SSO, and group behavior that could be mentioned in a future expanded version.
