# Validation Summary: How to Set Up SSO for ClickHouse Cloud

## Status
validated

## Post Type
Tutorial / Setup Guide

## Technologies Covered
- ClickHouse Cloud
- SAML 2.0
- Single Sign-On (SSO)
- Okta (Identity Provider)
- Microsoft Entra ID (Identity Provider)
- Google Workspace (Identity Provider)

## Sources Consulted
- ClickHouse Cloud SSO documentation: https://clickhouse.com/docs/en/cloud/security/saml-sso-setup
- Okta SAML 2.0 application setup documentation: https://help.okta.com/en-us/content/topics/apps/apps_app_integration_wizard_saml.htm
- Microsoft Entra ID SAML SSO documentation: https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/add-application-portal-setup-sso
- Microsoft Entra ID rebranding announcement (July 2023): https://learn.microsoft.com/en-us/entra/fundamentals/new-name

## Issues Found
1. **Azure AD renamed to Microsoft Entra ID**: The post used the outdated name "Azure AD" and "Azure Active Directory" throughout. Microsoft rebranded Azure AD to Microsoft Entra ID in July 2023. Updated all references to use "Microsoft Entra ID (formerly Azure AD)" for clarity.
2. **Azure AD "Non-gallery" option wording**: The option text "Non-gallery" in the Azure AD (now Entra ID) enterprise application creation flow was updated to the current wording: "Integrate any other application you don't find in the gallery."

## Review Notes
- The SAML attribute mappings shown for Okta (email, firstName, lastName) are standard defaults. ClickHouse Cloud may require specific attribute names or a NameID format — users should consult the ClickHouse Cloud console for the exact required attribute names at the time of configuration.
- The post does not mention SCIM provisioning, which ClickHouse Cloud may also support for automated user lifecycle management. This could be a useful addition in a future update.
- The console UI navigation steps (clicking organization name, selecting Security) are accurate as of the review date but may change as ClickHouse Cloud updates its console interface.
