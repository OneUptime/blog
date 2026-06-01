# Validation Summary: How to Customize the Azure API Management Developer Portal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure API Management
- Azure API Management developer portal
- Microsoft Entra ID
- Microsoft Entra External ID
- OAuth 2.0 / MSAL identity provider configuration
- API Management notification templates
- Self-hosted API Management developer portal
- Node.js / npm
- CSS and HTML customization
- Azure Application Insights

## Sources Consulted
- Microsoft Learn: Tutorial - Access and customize the developer portal - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-developer-portal-customize
- Microsoft Learn: Overview of the developer portal in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/developer-portal-overview
- Microsoft Learn: Secure access to the API Management developer portal - https://learn.microsoft.com/en-us/azure/api-management/secure-developer-portal-access
- Microsoft Learn: Authorize developer accounts by using Microsoft Entra ID in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-aad
- Microsoft Learn: Self-host the API Management developer portal - https://learn.microsoft.com/en-us/azure/api-management/developer-portal-self-host
- Microsoft Learn: Extend the developer portal with custom widgets - https://learn.microsoft.com/en-us/azure/api-management/developer-portal-extend-custom-functionality
- Microsoft Learn: How to configure notifications and notification templates in Azure API Management - https://learn.microsoft.com/en-us/azure/api-management/api-management-howto-configure-notifications
- Microsoft Learn: Legacy developer portal retirement - https://learn.microsoft.com/en-us/azure/api-management/breaking-changes/legacy-portal-retirement-oct-2023
- Microsoft Learn: API Management developer portal FAQ - https://learn.microsoft.com/en-us/azure/api-management/developer-portal-faq

## Issues Found
- The portal access instructions described two left-menu options, including "Developer portal (legacy)." The legacy portal was retired in 2023, and current Microsoft documentation directs administrators to "Developer portal" > "Portal overview," with "Portal settings" required first for v2 service tiers. Updated the navigation and removed the legacy option.
- The styling section described a global "Custom CSS" workflow and used selectors such as `.nav-bar` and `.operation-card` as if they were supported portal-wide customization points. Current managed portal customization is through the Styles editor and widgets; custom HTML code widgets render in an iframe. Reframed the CSS example so it applies to embedded widget content rather than the portal shell.
- The authentication section used older Azure AD / Azure AD B2C terminology and listed Google and Microsoft Account as direct APIM identity provider choices. Updated the wording to Microsoft Entra ID, Microsoft Entra External ID, and external identity providers configured through Entra, matching current Microsoft guidance.
- The Microsoft Entra redirect URI example used a hard-coded `/signin-aad` path. Current Microsoft guidance says to copy the redirect URL from the Add identity provider pane and configure it as a Single-page application redirect URI when using MSAL. Replaced the hard-coded URI with that workflow.
- The post did not mention republishing after identity provider configuration. Microsoft documentation requires republishing the developer portal after identity configuration changes, so that step was added.
- The portal access restriction steps referred to a "Require user login" setting in the editor and page-level "Authenticated users only" settings. Current documentation uses "Developer portal" > "Identities" > "Settings" and "Redirect anonymous users to sign-in page" for portal-wide sign-in enforcement. Updated those steps.
- The self-hosted portal setup omitted checking out a release tag, referenced a non-existent `src/config.json`, and used `npm start`. Microsoft documentation recommends checking out the latest release tag, configuring `src/config.design.json`, `src/config.publish.json`, and `src/config.runtime.json`, and running `npm run start`. Updated the commands and comments.

## Review Notes
- The notification template example is consistent with the documented HTML-template model and parameters such as `$ConfirmUrl`, but Microsoft notes that template HTML must be well-formed XML and that template customization can be restricted for some Azure subscription types.
- The self-hosted developer portal has important caveats not fully covered in the post: it requires advanced configuration, manual updates, and does not support the managed portal's visibility and access controls.
- Application Insights integration is supported for portal usage monitoring, but the specific analytics events available depend on the instrumentation configured in the portal.
