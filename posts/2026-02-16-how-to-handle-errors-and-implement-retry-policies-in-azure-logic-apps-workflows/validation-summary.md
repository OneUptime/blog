# Validation Summary: How to Handle Errors and Implement Retry Policies in Azure Logic Apps Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Logic Apps
- Workflow Definition Language
- Logic Apps retry policies
- Logic Apps run-after configuration
- Logic Apps scopes
- HTTP and API Connection actions
- Azure Table Storage connector

## Sources Consulted
- Microsoft Learn: Handle errors and exceptions in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/error-exception-handling
- Microsoft Learn: Schema reference for trigger and action types in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Reference for workflow expression functions in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/expression-functions-reference
- Microsoft Learn: Group related actions into scopes in Azure Logic Apps - https://learn.microsoft.com/en-gb/azure/logic-apps/logic-apps-control-flow-run-steps-group-scopes
- Microsoft Learn: View workflow status and run history in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/view-workflow-status-run-history
- Microsoft Learn: Handle throttling problems and 429 errors in Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/handle-throttling-problems-429-errors

## Issues Found
- The post said each action can finish with only four statuses. Updated the wording to explain that Succeeded, Failed, Skipped, and TimedOut are the main statuses used for run-after/error handling, while run history can show additional statuses such as Cancelled, Aborted, Running, Waiting, and Succeeded with retries.
- The retry policy section stated that every HTTP-based action supports retry policies and that the default always retries four times with exponential backoff. Updated this to match Microsoft guidance: many operations support retry settings, and the default is exponential with up to four retries for most operations, but some connector operations differ.
- The exponential retry explanation implied a deterministic 10-second first delay. Updated it to describe Logic Apps' exponential policy more accurately as using the configured interval with delays chosen within the configured minimum and maximum ranges.
- The scope error-detail example used unsupported lambda-style syntax with `filter(result('Try'), item => ...)`. Replaced it with the documented Filter Array (`Query`) action pattern using `@result('Try')` and `@equals(item()['status'], 'Failed')`.
- The retry-then-fallback example used `runAfter` as if multiple predecessor entries were OR conditions. Updated the `Process_Result` action so it can run when the primary succeeds and fallback is skipped, or when the primary fails/times out and fallback succeeds.
- The HTTP status-code handling example used invalid Switch case syntax. Updated the cases to include explicit `case` values, as required by the Logic Apps Switch action schema.
- The 429 branch waited but did not actually perform a retry. Added a retry HTTP action after the Wait action with an exponential retry policy.
- The Table Storage logging example referenced `actions('Try_Scope')?['error']?['message']`, which is not the documented way to inspect scope failures. Updated it to log `string(result('Try_Scope'))`, which uses the documented scope result function.

## Review Notes
The examples remain illustrative snippets rather than complete deployable workflow definitions. A complete production workflow would still need a trigger, full connector connection metadata, real API Connection paths, and service-specific idempotency safeguards for retries and compensating transactions.
