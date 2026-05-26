# Validation Summary: How to Configure Terraform Enterprise SAML Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Terraform Enterprise
- SAML 2.0
- Okta SAML applications
- Microsoft Entra ID / Azure AD SAML applications
- Active Directory Federation Services
- Terraform Enterprise Admin API
- Terraform Enterprise Teams API

## Sources Consulted
- HashiCorp Developer: Configure Terraform Enterprise as the SAML service provider - https://developer.hashicorp.com/terraform/enterprise/saml/configuration
- HashiCorp Developer: SAML user attributes reference for Terraform Enterprise - https://developer.hashicorp.com/terraform/enterprise/saml/attributes
- HashiCorp Developer: Enable the SAML identity provider to control team membership mapping - https://developer.hashicorp.com/terraform/enterprise/saml/team-membership
- HashiCorp Developer: Log into Terraform Enterprise with SAML - https://developer.hashicorp.com/terraform/enterprise/saml/login
- HashiCorp Developer: Terraform Enterprise Admin Settings API - https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Developer: Terraform Enterprise Teams API - https://developer.hashicorp.com/terraform/enterprise/api-docs/teams
- HashiCorp Developer: Enable Single Sign On (SSO) in Terraform Enterprise - https://developer.hashicorp.com/terraform/tutorials/enterprise/enable-sso-saml-tfe-okta
- Microsoft Learn: AD FS Set-AdfsRelyingPartyTrust cmdlet - https://learn.microsoft.com/en-us/powershell/module/adfs/set-adfsrelyingpartytrust
- Microsoft Learn: Configure group claims for applications by using Microsoft Entra ID - https://learn.microsoft.com/entra/identity/hybrid/connect/how-to-connect-fed-group-claims

## Issues Found
- The post used `https://tfe.example.com/users/saml/metadata` as the downloadable SP metadata document URL. HashiCorp documents the metadata document at `/users/saml/metadata.xml`, while `/users/saml/metadata` is the audience/entity ID. Updated the prerequisite, `curl` command, and ADFS metadata URL.
- The post included a TFE SLO URL and Azure logout URL as if Terraform Enterprise supported Single Logout. HashiCorp documents the Single Log-Out URL setting but states Single Logout is not yet supported. Removed the SP logout URL from IdP examples and clarified the TFE UI field.
- The post used lowercase `memberOf` and custom `email` / `isSiteAdmin` attribute settings as defaults. HashiCorp documents default SAML attributes as `Username`, `MemberOf`, and `SiteAdmin`. Updated Okta, ADFS, UI, API, and team mapping examples to use the documented casing.
- The Admin API payload included unsupported fields: `team-management-enabled`, `authn-requests-signed`, `want-assertions-signed`, `signature-signing-method`, and `signature-digest-method`. Removed those fields and kept only attributes documented for `/api/v2/admin/saml-settings`.
- The team membership verification command used `GET /api/v2/teams`, which is not the documented list endpoint. Updated it to `GET /api/v2/organizations/$TFE_ORG/teams`.
- The team mapping explanation omitted the SCIM caveat. HashiCorp documents that Terraform Enterprise ignores SAML team membership and site admin attributes when SCIM is enabled. Added the SCIM caveat in the team mapping section and summary.

## Review Notes
The post is technically relevant and contains implementation details. The remaining IdP examples are representative; production Entra ID group claims may need filtering or claim-format customization because Microsoft Entra ID has group claim limits and may emit group IDs depending on configuration.
