# Validation Summary: How to Use Incoming Email Monitor in OneUptime

## Status
validated

## Post Type
Tutorial / Product feature guide

## Technologies Covered
- OneUptime Incoming Email Monitor
- OneUptime monitor criteria (CheckOn / FilterType)
- SendGrid Inbound Parse webhook (email ingestion)

## Sources Consulted
Verified against the OneUptime source code in the monorepo (`/home/simon-larsen/oneuptime/oneuptime`):
- `Common/Types/Monitor/MonitorType.ts` — `IncomingEmail = "Incoming Email"` monitor type
- `Common/Server/Services/InboundEmail/Providers/SendGridInboundProvider.ts` — `generateMonitorEmailAddress()` returns `monitor-${secretKey}@${inboundDomain}`; SendGrid Inbound Parse is the only provider
- `App/FeatureSet/Telemetry/API/ProbeIngest/IncomingEmail.ts` — `POST /incoming-email/sendgrid/:secret` webhook endpoint
- `Common/Types/Monitor/CriteriaFilter.ts` — `CheckOn` and `FilterType` enum display strings
- `Common/Server/Utils/Monitor/Criteria/IncomingEmailCriteria.ts` — email criteria evaluation (text + received-time filters; case-insensitive matching)
- `Common/Server/Utils/Monitor/MonitorCriteriaEvaluator.ts` — JavaScript expression evaluation context (`storageMap`) and multi-filter combination (`FilterCondition.All` default = AND)
- `App/FeatureSet/Dashboard/src/Components/Monitor/SummaryView/IncomingEmailMonitorSummaryView.tsx` — info cards and detail fields

## Issues Found

1. **Example 4 — JavaScript Expression with email variables (incorrect; replaced).**
   The post showed a JavaScript Expression criteria that referenced bare variables `subject`, `from`, and `body`. The evaluator (`MonitorCriteriaEvaluator.ts`) only populates the JS expression context (`storageMap`) for `API`/`Website` (responseBody, etc.) and `IncomingRequest` (requestBody, requestHeaders) monitor types. For `IncomingEmail` monitors the `storageMap` is left empty, so those variables are undefined and the expression would throw / never match. I replaced Example 4 with a "Combine Multiple Checks for Precision" example using multiple supported criteria filters (AND-combined), which is the actual way to do complex matching for email monitors. I also removed the **JavaScript Expression** row from the "Available Check Fields" table and the troubleshooting bullet that recommended using it for debugging, since it is not functional for email-content matching.

2. **Check-field display labels corrected.** Updated the field names to match the actual UI strings from `CriteriaFilter.ts`:
   - "Email Received At" → **Email Received** (`EmailReceivedAt = "Email Received"`)
   - "Email From" → **Email From Address** (`EmailFrom = "Email From Address"`)
   - "Email To" → **Email To Address** (`EmailTo = "Email To Address"`)
   These were updated in the Available Check Fields table, the Filter Types subheading, and Examples 2 and 3. "Email Subject" and "Email Body" already matched exactly.

3. **Case-sensitivity note tightened.** The troubleshooting section hedged ("most string matches are case-insensitive but verify"). `IncomingEmailCriteria.evaluateStringCriteria()` calls `.toLowerCase()` on both sides for Contains/Not Contains/Equal To/Not Equal To/Starts With/Ends With, so all string matches are case-insensitive. Reworded to state this definitively.

## Review Notes
- **Accurate as written (no change needed):** the `IncomingEmail` monitor type and its UI description, the unique email-address format `monitor-{secret-key}@{your-inbound-domain}` (the secret key is a UUID-style ObjectID, matching the example), SendGrid Inbound Parse as the ingestion mechanism, the queue → criteria → status → incident flow, the time-based filters (Received / Not Received In Minutes), the eight text filter types, and all info-card and detail field names ("Last Email Received At", "From", "Subject", "Monitor Status Check At", "Email Headers" JSON, "Email Body (Text)", "Email Body (HTML)").
- **Minor caveat not changed:** In the product the two time filters are spelled "Recieved In Minutes" / "Not Recieved In Minutes" (a typo in the enum values). The post uses the correct spelling "Received In Minutes"; I intentionally did not propagate the misspelling into the blog. If the code typo is ever fixed the labels will then match exactly.
- The JavaScript Expression option does still appear in the OneUptime UI for Incoming Email monitors, but because no email data is injected into its evaluation context it cannot match on email content today — worth wiring up email fields into the JS `storageMap` in a future product change.
