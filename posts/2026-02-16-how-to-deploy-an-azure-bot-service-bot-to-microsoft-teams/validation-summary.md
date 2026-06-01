# Validation Summary: How to Deploy an Azure Bot Service Bot to Microsoft Teams

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Bot Service
- Microsoft Teams apps
- Bot Framework SDK v4 for Python
- Teams app manifest schema v1.16
- Teams custom app upload and organization app catalog
- Adaptive Cards
- ZIP app packaging

## Sources Consulted
- Microsoft Learn: Connect a Bot Framework bot to Microsoft Teams - https://learn.microsoft.com/en-us/azure/bot-service/channel-connect-teams?view=azure-bot-service-4.0
- Microsoft Learn: Introduction to bots in Teams apps - https://learn.microsoft.com/en-us/microsoftteams/platform/resources/bot-v3/bots-overview
- Microsoft Learn: Teams app package - https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/apps-package
- Microsoft Learn: Upload your app in Teams - https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload
- Microsoft Learn: Manage custom app policies and settings - https://learn.microsoft.com/en-us/microsoftteams/teams-custom-app-policies-and-settings
- Microsoft Teams manifest schema v1.16 - https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json
- Microsoft Learn: Bot Framework Python `TeamsActivityHandler` API reference - https://learn.microsoft.com/en-us/python/api/botbuilder-core/botbuilder.core.teams.teamsactivityhandler
- Microsoft Learn: Bot Framework Python `ActivityHandler` API reference - https://learn.microsoft.com/en-us/python/api/botbuilder-core/botbuilder.core.activity_handler.activityhandler
- Microsoft BotBuilder Python source: `TurnContext.remove_recipient_mention` - https://github.com/microsoft/botbuilder-python/blob/main/libraries/botbuilder-core/botbuilder/core/turn_context.py
- Microsoft Learn: Types of cards in Teams - https://learn.microsoft.com/en-us/microsoftteams/platform/task-modules-and-cards/cards/cards-reference

## Issues Found
- The Teams channel setup described "Messaging" as a simple enable switch and included a "Tab applications" option. Microsoft documentation describes the Teams channel configuration as Messaging, Calling, and Publish areas; the post now says Messaging selects the bot cloud environment and Publish is for publishing the Teams app.
- The smoke-test step referred to an "Open in Teams" link. Microsoft documentation directs users to use "Get bot embed code" and open the HTTPS Teams link from the embed code, so the post now uses that wording.
- The manifest example used non-GUID placeholder strings for `id` and `botId`, even though the schema requires GUIDs. The sample now uses GUID placeholders.
- The manifest explanation said both `id` and `botId` must match the Microsoft App ID. The schema defines `id` as the unique Teams app GUID and `botId` as the Bot Framework Microsoft App ID, so the text now says `botId` must match the bot registration and `id` must be a unique GUID that can commonly reuse the same value for bot-only apps.
- The Python Teams event handler example inherited from `ActivityHandler`, which does not dispatch Teams-specific `on_teams_*` handlers. It now imports and derives from `TeamsActivityHandler`.
- The Python installation event override used `on_installation_update_activity`, which is not the Bot Framework Python handler name. It now uses `on_installation_update_add` for install events.
- The Python mention-removal helper manually parsed mention entities. The post now uses the Bot Framework Python `TurnContext.remove_recipient_mention()` helper.
- The troubleshooting note said to stick to Adaptive Card version 1.4 or earlier for maximum compatibility. Microsoft Teams documentation states bot-sent Adaptive Cards support features through version 1.5, with Teams mobile support limited to 1.2, so the note now reflects that distinction.

## Review Notes
- The Teams app manifest example is valid JSON and uses valid v1.16 bot fields, including `botId`, `scopes`, `commandLists`, `permissions`, and `validDomains`.
- The `team`, `personal`, and `groupChat` bot scopes are valid for the Teams manifest schema used in the post.
- The ZIP packaging command is technically correct for creating a Teams app package when run from the directory containing `manifest.json`, `color.png`, and `outline.png`.
