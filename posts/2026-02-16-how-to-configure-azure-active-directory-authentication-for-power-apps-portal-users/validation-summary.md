# Validation Summary: How to Configure Azure Active Directory Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Power Pages / Power Apps portals
- Microsoft Entra ID (Azure Active Directory)
- OpenID Connect
- Dataverse contacts and web roles
- Power Platform site settings

## Sources Consulted
- Microsoft Learn: Set up an OpenID Connect provider with Microsoft Entra ID - https://learn.microsoft.com/en-us/power-pages/security/authentication/openid-settings
- Microsoft Learn: Set up an OpenID Connect provider - https://learn.microsoft.com/en-us/power-pages/security/authentication/openid-provider
- Microsoft Learn: FAQs about using OpenID Connect in Power Pages - https://learn.microsoft.com/en-us/power-pages/security/authentication/openid-faqs
- Microsoft Learn: Overview of authentication in Power Pages - https://learn.microsoft.com/en-us/power-pages/security/authentication/
- Microsoft Learn: Local authentication, registration, and other settings - https://learn.microsoft.com/en-us/power-pages/security/authentication/set-authentication-identity
- Microsoft Learn: Create and assign web roles - https://learn.microsoft.com/en-gb/power-pages/security/create-web-roles
- Microsoft Learn: How to add a redirect URI to your application - https://learn.microsoft.com/en-us/entra/identity-platform/how-to-add-redirect-uri
- Microsoft Learn: App sign-in flow with the Microsoft identity platform - https://learn.microsoft.com/en-us/entra/identity-platform/app-sign-in-flow

## Issues Found
- The redirect URI guidance implied that `/signin-openid_1` should be typed directly. Microsoft documentation instructs users to copy the Reply URL from the Power Pages identity provider setup. Updated the instructions to copy and paste the Reply URL, while keeping `/signin-openid_1` as an example.
- The optional claims section listed `groups` as an optional claim. Microsoft Entra exposes group claims through the separate Add groups claim flow. Updated that wording.
- The Authority value used `https://login.microsoftonline.com/{tenant-id}/v2.0`, but current Power Pages Microsoft Entra ID documentation gives the authority format as `https://login.microsoftonline.com/{tenant-id}/`. Updated the table.
- The site settings table omitted `ResponseMode`, which Power Pages documents as `form_post` for the default hybrid response type. Added `Authentication/OpenIdConnect/AzureAD/ResponseMode`.
- The scope value included `profile`; the current Microsoft Entra ID Power Pages setup page specifies `openid email`. Updated the core configuration table to match the official setup guidance.
- The claim mapping settings were shown as separate per-field site settings. Power Pages uses a single `RegistrationClaimsMapping` site setting containing comma-separated Dataverse-field-to-claim mappings. Replaced the mapping table with the correct format using `firstname`, `lastname`, and `emailaddress1`.
- The group restriction section implied that `ValidAudiences` is part of group filtering. Clarified that it validates the token audience and that group filtering still requires custom logic or automation.
- The web role section used a non-documented `Authentication/OpenIdConnect/AzureAD/LoginClaimsMapping/Role` site setting to auto-assign a web role. Replaced it with the documented default authenticated users web role behavior.

## Review Notes
The post still uses "Azure AD" in the title and tags, which is an older product name for Microsoft Entra ID. This is understandable for search intent, but future updates should consider using Microsoft Entra ID as the primary terminology with Azure AD in parentheses.
