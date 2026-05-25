# Validation Summary: How to Configure SSO for HCP Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud
- SAML 2.0 SSO
- Okta
- Microsoft Entra ID
- OneLogin
- Terraform `tfe` provider
- HCP Terraform API tokens

## Sources Consulted
- HashiCorp Developer: Configure and manage single sign-on in HCP Terraform, https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on
- HashiCorp Developer: Use single sign-on with SAML for HCP Terraform, https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on/saml
- HashiCorp Developer: Use single sign-on with Okta for HCP Terraform, https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on/okta
- HashiCorp Developer: Configure single sign-on with Microsoft Entra ID, https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on/entra-id
- HashiCorp Developer: Test single sign-on in HCP Terraform, https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on/testing
- HashiCorp Developer: Manage API tokens for HCP Terraform, https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens
- HashiCorp Developer: Team tokens API reference, https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-tokens
- HashiCorp Developer: Teams API reference, https://developer.hashicorp.com/terraform/cloud-docs/api-docs/teams
- Terraform Registry: `tfe_team` resource, https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team
- HashiCorp Developer: Terraform Enterprise admin SAML settings API, https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings

## Issues Found
- Corrected the prerequisite that said SSO requires the Business tier and is unavailable on free or Team plans. Current HCP Terraform documentation describes SSO as an organization setting with an `sso` entitlement; team mapping depends on Team Management.
- Removed the verified-domain prerequisite because the HCP Terraform SSO setup docs do not list a verified email domain requirement.
- Updated the SAML flow to mention first-time account creation or linking, which is part of HCP Terraform SSO behavior.
- Replaced outdated example SP metadata and ACS URLs with the current `samlconf-.../metadata` and `samlconf-.../acs` URL shape.
- Updated Okta, Entra ID, and OneLogin snippets to use the corrected Entity ID and ACS URL values. Also corrected the Entra ID Sign-on URL to `https://app.terraform.io/session` and noted that Entra group claims often use UUIDs.
- Removed the invalid HCP Terraform SSO API example. The sample used a Terraform Enterprise SAML settings payload but posted it to an HCP Terraform organization authentication-token endpoint. The post now clarifies that HCP Terraform SSO configuration should be done through the UI and that `/api/v2/admin/saml-settings` is a Terraform Enterprise admin endpoint.
- Corrected SSO enablement language. HCP Terraform requires a successful SSO test before enabling, and owners can bypass SSO for recovery.
- Corrected team mapping guidance to match HCP Terraform's exact team-name or SSO Team ID matching behavior, including that the `owners` team cannot be assigned through SAML team mapping.
- Updated the team token API command to use the current `/teams/:team_id/authentication-tokens` endpoint and required JSON API payload with a unique token description.
- Clarified user API token behavior: user tokens inherit user permissions and can be disabled for organization resources, rather than being governed by SSO session timeout settings.

## Review Notes
The post remains a practical SAML setup guide, but provider UI details can change over time. Future reviews should re-check the provider-specific IdP screens and HCP Terraform edition/entitlement wording against current HashiCorp documentation.
