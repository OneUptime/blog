# Validation Summary: How to Migrate Azure Active Directory to Google Cloud Identity

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Microsoft Entra ID / Azure Active Directory
- Google Cloud Identity
- Google Workspace Admin Console
- Google Admin SDK Directory API
- Google Cloud Directory Sync
- Microsoft Entra provisioning / SCIM
- SAML single sign-on
- Google Access Context Manager / Context-Aware Access
- Google 2-Step Verification
- Azure CLI
- Google Cloud CLI
- Python

## Sources Consulted
- Google Workspace Admin Help: About SSO - https://support.google.com/a/answer/60224
- Google Workspace Admin Help: Setting up SSO - https://support.google.com/a/answer/12032922
- Google Workspace Admin Help: Technical overview of SAML-based SSO - https://support.google.com/a/answer/6262987
- Google Workspace Admin Help: About Google Cloud Directory Sync - https://support.google.com/a/answer/106368
- Google Workspace Admin Help: What is synced by GCDS - https://support.google.com/a/answer/6120130
- Google Workspace Admin Help: Deploy 2-Step Verification - https://support.google.com/a/answer/9176657
- Google Developers: Admin SDK Directory API users resource - https://developers.google.com/workspace/admin/directory/reference/rest/v1/users
- Google Developers: Admin SDK Directory API groups and members resources - https://developers.google.com/workspace/admin/directory/reference/rest
- Google Cloud: Creating a basic access level - https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud SDK: gcloud access-context-manager perimeters create - https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud: Access Context Manager overview - https://cloud.google.com/access-context-manager/docs/overview
- Microsoft Learn: Configure Google Cloud / Google Workspace for automatic user provisioning with Microsoft Entra ID - https://learn.microsoft.com/en-us/azure/active-directory/saas-apps/g-suite-provisioning-tutorial
- Microsoft Learn: Azure CLI az ad user - https://learn.microsoft.com/en-us/cli/azure/ad/user
- Microsoft Learn: Azure CLI az ad group and az ad group member - https://learn.microsoft.com/en-us/cli/azure/ad/group
- Microsoft Learn: Azure CLI az ad app create - https://learn.microsoft.com/en-us/cli/azure/ad/app
- Microsoft Learn: Configure SAML-based single sign-on using Microsoft Graph - https://learn.microsoft.com/en-us/graph/application-saml-sso-configure-api
- Microsoft Learn: Microsoft Entra SAML protocol - https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol

## Issues Found
- The Azure group export produced `Name`, `Description`, and `ID` keys, but the later Python code expected `displayName`, `description`, and `id`. Updated the export query so the JSON shape matches the code.
- The post said GCDS can sync directly from Azure AD via LDAP or CSV. GCDS syncs from Microsoft Active Directory or LDAP; Microsoft Entra ID provisioning to Google is handled through the Google Cloud / Google Workspace enterprise application using SCIM. Updated the provisioning guidance.
- The Admin SDK authentication comment implied that service account admin privileges alone were enough. Updated it to specify domain-wide delegation and admin impersonation.
- The user creation sample skipped users without the `mail` property, which is common in Entra exports. Updated it to fall back to `userPrincipalName`.
- The Google Group email generation only replaced spaces and could produce invalid local parts. Added simple sanitization for the generated group address.
- The SAML example used an inaccurate ACS URL and an Azure CLI command with obsolete/unsuitable flags for this SAML setup. Replaced it with current Google Admin Console SP detail guidance and the legacy SSO ACS format.
- The Context-Aware Access YAML used a top-level `conditions:` key, but `gcloud access-context-manager levels create --basic-level-spec` expects a YAML list of conditions. Updated the YAML format.
- The access level name used a hyphen, but gcloud access level names must use letters, numbers, and underscores. Changed `corporate-network` to `corporate_network`.
- The MFA section implied a simple Admin SDK/API enforcement path. Updated it to reflect the documented Google Admin Console configuration flow.
- The post described Azure Conditional Access as directly equivalent to Context-Aware Access. Adjusted the wording to state that many concepts map, but the models are not identical.

## Review Notes
The guide is technically relevant and useful after correction. Some examples remain illustrative and still require tenant-specific values, production-grade error handling, pagination, and careful pilot testing before use in a real migration.
