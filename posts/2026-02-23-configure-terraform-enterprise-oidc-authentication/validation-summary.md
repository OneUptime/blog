# Validation Summary: How to Configure Terraform Enterprise OIDC Authentication

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Enterprise
- OpenID Connect (OIDC)
- SAML single sign-on
- Okta
- Microsoft Entra ID
- Keycloak
- Terraform Enterprise API
- Terraform Enterprise team mapping

## Sources Consulted
- HashiCorp Developer: Terraform Enterprise overview, which describes Terraform Enterprise as including SAML single sign-on: https://developer.hashicorp.com/terraform/enterprise
- HashiCorp Developer: Configure Terraform Enterprise as the SAML service provider: https://developer.hashicorp.com/terraform/enterprise/saml/configuration
- HashiCorp Developer: Enable Single Sign On (SSO) in Terraform Enterprise tutorial: https://developer.hashicorp.com/terraform/tutorials/enterprise/enable-sso-saml-tfe-okta
- HashiCorp Developer: Configure and manage single sign-on in HCP Terraform, which directs Terraform Enterprise SSO users to SAML configuration: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/single-sign-on
- HashiCorp Developer: Configure Azure Active Directory as the identity provider for Terraform Enterprise SAML: https://developer.hashicorp.com/terraform/enterprise/saml/idp-configuration/aad
- HashiCorp Developer: Log into Terraform Enterprise with SAML: https://developer.hashicorp.com/terraform/enterprise/saml/login
- HashiCorp Developer: Terraform Enterprise Settings API, including SAML settings and OIDC signing-key endpoints: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Developer: Terraform Enterprise Teams API, including `sso-team-id`: https://developer.hashicorp.com/terraform/enterprise/api-docs/teams

## Issues Found
- The post's core claim that Terraform Enterprise supports OIDC as a first-class SSO option is not supported by current official HashiCorp documentation. Terraform Enterprise user SSO is documented as SAML-based, and the official HCP Terraform SSO page explicitly directs Terraform Enterprise SSO configuration to the SAML configuration docs.
- The callback URL `https://tfe.example.com/users/oidc/callback` is not documented as a Terraform Enterprise SSO callback. Official Terraform Enterprise SAML configuration uses `https://<TFE HOSTNAME>/users/saml/auth` as the ACS/recipient URL and `https://<TFE HOSTNAME>/users/saml/metadata` as the metadata/audience URL.
- The Admin UI path and fields for `Admin > SSO > OIDC`, OIDC discovery URL, scopes, username claim, and groups claim do not match the official Terraform Enterprise SAML admin UI and settings.
- The API example using `PUT /api/v2/admin/oidc-settings` with attributes such as `client-id`, `client-secret`, `oidc-discovery-url`, `scopes`, `username-claim`, and `groups-claim` does not match the official Terraform Enterprise Settings API. The documented `/admin/oidc-settings` endpoints are `POST` actions for rotating and trimming the OIDC signing key used for dynamic provider credentials, not configuring external OIDC login.
- The environment variables `TFE_OIDC_ENABLED`, `TFE_OIDC_CLIENT_ID`, `TFE_OIDC_CLIENT_SECRET`, `TFE_OIDC_DISCOVERY_URL`, `TFE_OIDC_SCOPES`, `TFE_OIDC_USERNAME_CLAIM`, and `TFE_OIDC_GROUPS_CLAIM` could not be verified in official Terraform Enterprise documentation as supported settings for user SSO.
- The team mapping example uses `sso-team-id`, which is a real Teams API attribute in Terraform Enterprise 202204-1 and later, but the official API describes it as the unique identifier from the SAML `MemberOf` attribute. Presenting it as OIDC group-claim mapping is inaccurate.
- Because the article is built around an unsupported Terraform Enterprise OIDC SSO workflow, correcting it would require rewriting the article as a SAML SSO guide rather than making narrow technical fixes. The post was therefore classified as not technically relevant for publication in its current form.

## Review Notes
Terraform Enterprise does use OIDC in other contexts, such as issuing tokens for dynamic provider credentials, but that is separate from authenticating Terraform Enterprise users through an external OIDC identity provider. A replacement article should focus on Terraform Enterprise SAML SSO or clearly target a different product/workflow that actually supports OIDC login.
