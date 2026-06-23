# Validation Summary: Connect OneUptime to Microsoft Teams with Workspace Connections

## Status
validated

## Post Type
Product feature guide / Tutorial (UI-driven walkthrough of OneUptime's native Microsoft Teams Workspace Connection)

## Technologies Covered
- OneUptime Workspace Connections (Microsoft Teams integration)
- Microsoft Teams
- Microsoft Entra (admin consent / OAuth)
- Microsoft Graph API
- Adaptive Cards
- Microsoft Bot Framework
- OneUptime incident/alert/monitor/on-call/maintenance notification rules

## Sources Consulted
- OneUptime codebase (`/home/simon-larsen/oneuptime/oneuptime`):
  - `Common/Server/API/MicrosoftTeamsAPI.ts` — admin-consent endpoint, app manifest ZIP download, delegated user OAuth, `/microsoft-teams/teams` and `/microsoft-teams/refresh-teams` Graph-backed endpoints
  - `App/FeatureSet/Dashboard/src/Components/MicrosoftTeams/MicrosoftTeamsIntegration.tsx` and `MicrosoftTeamsIntegrationDocumentation.tsx` — connection card UI, "Connect with Microsoft Teams", app upload guidance, View Available Teams / Refresh
  - `Common/Server/Utils/Workspace/MicrosoftTeams/MicrosoftTeams.ts` — Microsoft Graph usage, Adaptive Card (v1.5) and Bot Framework integration, `sendAdaptiveCardToChannel`
  - `Common/Server/Utils/Workspace/MicrosoftTeams/Messages/Incident.ts`, `Alert.ts`, and `Actions/ActionTypes.ts` — card actions (View, Execute On-Call Policy, Acknowledge, Resolve, Change State, Add Note)
  - `Common/Types/Workspace/NotificationRules/EventType.ts` and `NotificationRuleCondition.ts` — supported event types and filters (severity, state, labels, monitors)
  - `App/FeatureSet/Dashboard/src/Components/Workspace/WorkspaceNotificationRulesTable.tsx` — Test Rule action
  - `Common/Models/DatabaseModels/WorkspaceNotificationLog.ts` — Workspace Notification Log
  - `Common/Server/EnvironmentConfig.ts` — self-hosted global Teams app registration env vars (`MICROSOFT_TEAMS_APP_CLIENT_ID/SECRET/TENANT_ID`)

## Issues Found
No technical issues found. All ten verifiable claims in the post (admin consent flow storing tenant ID + app token, Teams app package download/upload, delegated user connect, View Available Teams / Refresh via Microsoft Graph, supported event types and filters, Test Rule, adaptive card actions, Graph tokens / adaptive cards / bot, Workspace Notification Log, and self-hosted global app registration) are supported by the OneUptime codebase.

## Review Notes
- The post is UI-flow oriented and contains no code snippets or CLI commands, but it does describe concrete technical implementation details (OAuth/admin consent, Microsoft Graph, Bot Framework adaptive cards, env-var-based self-hosted registration), so it qualifies as a technical post rather than not-code-blog.
- The "(Self-hosted only) Ensure the global Microsoft Teams app registration is configured — see the checklist below" line references a checklist that is not present in this post; it is effectively a pointer to the in-product self-hosted documentation. Not a technical error, but a future copy-edit could either include the checklist or link to the configuration docs.
- Card action labels in the post (e.g., "Acknowledge Alert", "View Incident") match the action types in the codebase; exact button text may vary slightly by event type but the described capabilities are accurate.
