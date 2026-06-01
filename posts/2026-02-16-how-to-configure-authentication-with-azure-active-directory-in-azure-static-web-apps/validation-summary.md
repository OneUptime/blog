# Validation Summary: How to Configure Authentication with Azure Active Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Static Web Apps
- Microsoft Entra ID / Azure Active Directory authentication
- Static Web Apps `staticwebapp.config.json`
- Azure CLI Static Web Apps app settings
- Azure Functions JavaScript APIs
- Role-based authorization

## Sources Consulted
- Microsoft Learn: Custom authentication in Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom
- Microsoft Learn: Configure Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Microsoft Learn: Accessing user information in Azure Static Web Apps - https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
- Microsoft Learn: Azure CLI `az staticwebapp appsettings` reference - https://learn.microsoft.com/en-us/cli/azure/staticwebapp/appsettings?view=azure-cli-latest
- Microsoft Learn: Static Web Apps authentication and authorization - https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization

## Issues Found
- The prerequisites omitted that custom authentication provider configuration is only available on the Azure Static Web Apps Standard plan. Added that requirement.
- The `staticwebapp.config.json` placement guidance said only to place it in the source directory. Updated it to also state that the file must be copied to the root of the build output.
- The programmatic role assignment example incorrectly read `x-ms-client-principal` from request headers. Azure Static Web Apps calls the `rolesSource` function with a POST request and passes user information in the JSON request body, so the example now reads `req.body`.
- The programmatic role assignment example returned the built-in `authenticated` role. The role assignment function should return only custom roles, or an empty `roles` array when no custom roles apply. Updated the example accordingly.
- The programmatic role assignment section did not mention that role assignment functions work only with custom authentication and ignore built-in invitation role assignments when enabled. Added that caveat.

## Review Notes
- The Azure CLI examples use the current `az staticwebapp appsettings set --setting-names key=value` syntax.
- The Microsoft Entra ID provider configuration, `/.auth/login/aad`, `/.auth/logout`, `/.auth/me`, redirect callback URL, route `allowedRoles`, and `post_logout_redirect_uri` usage match current Microsoft documentation.
- The post still uses the older "Azure Active Directory" name in the title and prose, but Microsoft documentation maps this provider to Microsoft Entra ID and keeps the `azureActiveDirectory` configuration key and `aad` URL alias.
