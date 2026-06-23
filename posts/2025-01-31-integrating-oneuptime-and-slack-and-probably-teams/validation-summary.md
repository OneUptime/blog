# Validation Summary: Integrating OneUptime and Slack (and probably Teams)

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OneUptime Workflows (No-Code component editor)
- OneUptime "On Create Incident" and "On Create Incident State Timeline" triggers
- "Send Message to Slack" workflow component (and the equivalent Microsoft Teams component)
- "If/Else" condition component
- JSON5 field-selection syntax for trigger "Select Fields"
- Slack Incoming Webhooks and Slack `mrkdwn` message formatting

## Sources Consulted
- OneUptime source (monorepo at `/home/simon-larsen/oneuptime/oneuptime`):
  - `Common/Server/Types/Workflow/Components/BaseModel/OnTriggerBaseModel.ts` — confirms the trigger's `select` string is parsed and only selected fields are returned under `returnValues.model`.
  - `Common/Types/JSONFunctions.ts` (`parse()` → `JSON5.parse(val)`) — confirms the "Select Fields" box is parsed as JSON5, so `//` comments are valid and do not break parsing.
  - `Common/Models/DatabaseModels/Incident.ts` — confirms `monitors`, `currentIncidentState`, `incidentSeverity`, `createdAt`, `title`, `description`, `_id`, `projectId` fields.
  - `Common/Models/DatabaseModels/IncidentStateTimeline.ts` — confirms `createdAt`, `incident` (relation), `incidentState`, `_id`, `projectId`, `incidentId`, `rootCause`, `createdByUser` fields.
  - `Common/Models/DatabaseModels/DatabaseBaseModel/DatabaseBaseModel.ts` — confirms `_id` serializes as a plain string while other `ObjectID` columns (e.g. `projectId`) serialize as objects requiring `.value`.
  - `Common/Server/Types/Workflow/Components/MicrosoftTeams/` — confirms a Teams component exists, supporting the "Connecting to Teams" claim.

## Issues Found
1. **Broken "See more here" URL in the second (state-change) Slack template.** The URL used `model.projectId.value` and `model._id`, but:
   - `projectId` was not included in that trigger's "Select Fields", so `{{...model.projectId.value}}` rendered empty.
   - `model._id` on the `On Create Incident State Timeline` trigger is the *state timeline entry's* ID, not the incident's ID, so the link pointed to the wrong resource.
   **Fix:** Added `"projectId": true` to the trigger's Select Fields and added `"_id": true` under the `incident` object, then changed the URL to use `model.incident._id` for the incident ID. The first (on-create) template was already correct because its trigger model *is* the Incident, so its `_id`/`projectId` resolve directly.

## Review Notes
- The `//` inline comments inside the ```json``` blocks are technically not valid in strict JSON, but OneUptime parses the "Select Fields" box with **JSON5** (`JSONFunctions.parse` → `JSON5.parse`), which permits comments. So the snippets work as written when pasted verbatim. The blocks are tagged ```json``` for syntax highlighting; ```json5``` would be marginally more accurate but is a cosmetic point only.
- Minor non-technical prose issue (left unchanged, out of scope): the closing line "`.. is exactly the, but replace the Slack component with the Teams one.`" appears to be missing the word "same" ("...exactly the same..."). This is a typo, not a technical error.
- The serialization quirk where `_id` is referenced directly (string) while `projectId` requires `.value` is inherent to OneUptime's `BaseModel.toJSON` and is used consistently and correctly in the templates.
