# Validation Summary: How to Deploy a Teams Tab Application Hosted on Azure Static Web Apps with SSO

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Teams tab applications
- Microsoft Teams JavaScript SDK
- Teams single sign-on
- Azure Static Web Apps
- Microsoft Entra ID app registrations
- Azure CLI
- React and TypeScript
- Microsoft Graph

## Sources Consulted
- Microsoft Teams tab SSO overview: https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-overview
- Microsoft Teams SSO app registration guidance: https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-register-aad
- Microsoft Teams JavaScript SDK app API: https://learn.microsoft.com/en-us/javascript/api/@microsoft/teams-js/microsoftteams.app
- Microsoft Teams JavaScript SDK authentication API: https://learn.microsoft.com/en-us/javascript/api/@microsoft/teams-js/microsoftteams.authentication
- Microsoft Teams app manifest schema: https://developer.microsoft.com/json-schemas/teams/v1.27/MicrosoftTeams.schema.json
- Azure Static Web Apps configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Azure CLI Static Web Apps command reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp
- Azure CLI Microsoft Entra app command reference: https://learn.microsoft.com/en-us/cli/azure/ad/app

## Issues Found
- The architecture text incorrectly said the React app exchanges the Teams SSO token for an Azure AD access token and can use it directly with Microsoft Graph. Teams SSO returns a token for the app registration; Graph access should go through a backend that validates the token and uses the OAuth 2.0 on-behalf-of flow. Updated the diagram and explanation.
- The authentication hook destructured an unused `context` value and checked only `error.message` for the Teams SDK `resourceRequiresConsent` case. Updated the hook to avoid the unused value and handle either a string rejection or an Error-like object.
- The interactive authentication fallback did not state that the `/auth-start` page must complete login and call `authentication.notifySuccess()`. Added that requirement in the code comment.
- The Azure Static Web Apps configuration redirected all 401 responses to `/auth-start`, which is not a Static Web Apps built-in authentication endpoint and was not implemented by the post. Removed the inaccurate 401 override and added `/api/*` to the navigation fallback exclusions.
- The Azure CLI section mislabeled Microsoft Graph `User.Read` permission as the Teams SSO scope. Added commands to expose an `access_as_user` scope and pre-authorize Teams desktop/mobile and web clients, then clarified that the Graph permission is only needed when the backend calls Microsoft Graph.
- The Teams manifest snippet omitted `validDomains`, which is required for tab content domains in Teams app manifests. Added the Azure Static Web Apps host to `validDomains`.

## Review Notes
The Teams SDK APIs used in the examples are current for the modern `@microsoft/teams-js` package. The article still uses `create-react-app`, which remains technically usable but is no longer the preferred starting point for many new React projects.
