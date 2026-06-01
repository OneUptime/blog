# Validation Summary: How to Build a Custom Learning Management System with Azure App Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure App Service
- Azure CLI
- Azure SQL Database
- Azure Blob Storage
- Microsoft Entra ID
- Microsoft Teams tabs and app manifests
- Microsoft Teams JavaScript SDK
- Bot Framework SDK for JavaScript
- Adaptive Cards
- Node.js and Express
- node-mssql

## Sources Consulted
- Azure App Service Node.js configuration documentation: https://learn.microsoft.com/en-us/azure/app-service/configure-language-nodejs
- Azure App Service Azure CLI web app command reference: https://learn.microsoft.com/en-us/cli/azure/webapp
- Azure Storage CLI authorization documentation: https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli
- Azure Storage container CLI documentation: https://learn.microsoft.com/en-us/cli/azure/storage/container
- Microsoft Teams tabs documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/what-are-tabs
- Microsoft 365 app manifest schema reference: https://learn.microsoft.com/en-us/microsoft-365/extensibility/schema/
- Teams manifest schema v1.16: https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json
- Teams tab SSO manifest documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/authentication/tab-sso-manifest
- Teams JavaScript SDK context documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/tabs/how-to/access-teams-context
- Teams JavaScript SDK authentication documentation: https://learn.microsoft.com/en-us/javascript/api/%40microsoft/teams-js/authentication
- Teams JavaScript SDK URL dialog documentation: https://learn.microsoft.com/en-us/javascript/api/%40microsoft/teams-js/dialog.url
- Bot Framework JavaScript adapter documentation: https://learn.microsoft.com/en-us/javascript/api/botbuilder/botframeworkadapter
- Teams proactive messages documentation: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
- node-mssql documentation: https://github.com/tediousjs/node-mssql

## Issues Found
- The App Service command used the Node 18 runtime. Updated it to `NODE:24-lts`, matching current App Service Node.js examples and supported LTS guidance.
- The storage container command omitted an explicit authorization mode. Added `--auth-mode login`, which is the documented Microsoft Entra authorization pattern for Azure Storage data operations.
- The storage account example did not set current baseline security options. Added TLS 1.2 minimum and disabled public blob access.
- The SQL connection pool was created but never connected before route handlers used it. Added a shared `poolConnect` promise, an error listener, and middleware that waits for the pool before handling API requests.
- The post used the former Azure AD name. Updated references to Microsoft Entra ID.
- The Teams manifest snippet was missing required `icons` and `accentColor` fields and used non-GUID placeholder IDs. Added required fields and GUID-shaped sample IDs.
- The Teams manifest used Teams SSO in code but did not include `webApplicationInfo`. Added the property with an application ID URI pattern used by Teams SSO.
- The Teams manifest discussed a bot but did not register a bot capability. Added a `bots` entry with scopes and commands matching the sample bot.
- The Teams tab code used `microsoftTeams.dialog.open`, which is not the TeamsJS v2 URL dialog API. Updated it to `microsoftTeams.dialog.url.open` and used an HTTPS URL on a valid manifest domain.
- The bot sample imported an unused Microsoft Graph client. Removed the unused import.
- The bot message handler assumed `context.activity.text` always exists. Added a safe fallback before trimming.
- The proactive notification sample used `process.env.BOT_ID` for `continueConversationAsync`. Updated it to `process.env.MicrosoftAppId`, matching Bot Framework naming and documentation for the bot app ID parameter.
- The bot only stored conversation references on conversation updates. Added reference storage during message handling and guarded `aadObjectId` access.

## Review Notes
The snippets remain tutorial-level examples. A production LMS would still need complete Microsoft Entra JWT validation, authorization checks for course/instructor access, SQL firewall or private networking configuration, secure file upload handling, and HTML escaping in the client-side rendering code.
