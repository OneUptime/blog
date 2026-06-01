# Validation Summary: Create a Teams Messaging Extension That Searches Azure Cognitive Search Indexes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Teams messaging extensions
- Microsoft Teams app manifest
- Bot Framework SDK for TypeScript
- Azure AI Search / Azure Cognitive Search
- Azure CLI
- Adaptive Cards

## Sources Consulted
- Microsoft Learn: Build search-based message extensions: https://learn.microsoft.com/en-us/microsoftteams/platform/resources/messaging-extension-v3/search-extensions
- Microsoft Learn: Respond to search commands in Teams: https://learn.microsoft.com/en-us/microsoftteams/platform/messaging-extensions/how-to/search-commands/respond-to-search
- Microsoft Teams app manifest v1.16 JSON schema: https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json
- Microsoft Learn: Bot Framework TeamsActivityHandler for TypeScript: https://learn.microsoft.com/en-us/javascript/api/botbuilder/teamsactivityhandler
- Microsoft Learn: Azure AI Search JavaScript client library: https://learn.microsoft.com/en-us/javascript/api/overview/azure/search-documents-readme
- Microsoft Learn: Azure AI Search SuggestRequest interface for JavaScript: https://learn.microsoft.com/en-us/javascript/api/@azure/search-documents/suggestrequest
- Microsoft Learn: Azure CLI az search command group: https://learn.microsoft.com/en-us/cli/azure/search
- Microsoft Learn: Azure CLI az bot command group: https://learn.microsoft.com/en-us/cli/azure/bot

## Issues Found
- The Azure CLI setup retrieved an admin key but the TypeScript bot used `SEARCH_QUERY_KEY`. Added a `az search query-key list` command so the example provides the read-only query key expected by the code.
- The Teams manifest snippet omitted required top-level `icons` and `accentColor` fields for the v1.16 schema. Added those fields while preserving the example manifest structure.
- The Teams manifest used non-GUID placeholder strings for the app `id` and bot IDs, but the schema requires GUID-formatted values. Replaced them with GUID-shaped placeholders.
- The suggestions example used `handleTeamsMessagingExtensionQuerySettingUrl`, which is not the Bot Framework TypeScript handler for search results. Replaced it with `handleTeamsMessagingExtensionQuery` and adjusted the surrounding text to clarify that suggester-backed results are handled through the normal messaging extension query flow.

## Review Notes
The article still uses the former Azure Cognitive Search name, which Microsoft documentation now describes as Azure AI Search formerly known as Azure Cognitive Search. The older name remains understandable in context, but future posts should prefer Azure AI Search.
