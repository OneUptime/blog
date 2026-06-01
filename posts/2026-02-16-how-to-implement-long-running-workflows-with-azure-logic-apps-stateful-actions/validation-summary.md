# Validation Summary: How to Implement Long-Running Workflows with Azure Logic Apps Stateful Actions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Logic Apps Standard
- Stateful and stateless workflows
- Request triggers
- HTTP actions and asynchronous polling
- HTTP Webhook actions
- Wait actions
- Azure Monitor and tracked properties

## Sources Consulted
- Microsoft Learn: Workflow trigger and action schema reference for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-workflow-actions-triggers
- Microsoft Learn: Differences between Standard and Consumption logic apps - https://learn.microsoft.com/en-us/azure/logic-apps/single-tenant-overview-compare
- Microsoft Learn: Limits and configuration reference for Azure Logic Apps - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-limits-and-config
- Microsoft Learn: Run workflows or actions based on service endpoint events by using HTTP webhooks - https://learn.microsoft.com/en-us/azure/connectors/connectors-native-webhook
- Microsoft Learn: Create workflows that you can call, trigger, or nest using HTTPS endpoints - https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-http-endpoint
- Microsoft Learn: Call external HTTPS endpoints from workflows - https://learn.microsoft.com/en-us/azure/connectors/connectors-native-http
- Microsoft Learn: Collect diagnostic data for workflows - https://learn.microsoft.com/en-us/azure/logic-apps/monitor-workflows-collect-diagnostic-data

## Issues Found
- The post incorrectly described the async polling pattern as something automatically exposed to the original caller of a Request-triggered workflow through a Location header. Updated the section to distinguish inbound Request trigger behavior from the outbound HTTP action asynchronous polling pattern.
- The Request trigger examples used `"operationOptions": "asynchronous"`, which is not the documented way to make a Request trigger return immediately. Removed that property and clarified that a workflow without a Response action returns 202 Accepted immediately.
- The webhook explanation said unsubscribe is called only when the workflow is cancelled or times out. Updated the text to match documented webhook action behavior: the action remains subscribed until it succeeds, the run is cancelled, the workflow times out, or parameters change.
- The timeout section claimed a single action has a maximum timeout of 30 days. Replaced this with documented run-duration guidance and the recommendation to use asynchronous polling or webhook actions for long-running HTTP work.
- The best-practices section said a workflow could run indefinitely without a callback timeout. Updated this to account for the documented workflow run-duration limit.
- One JSON example used an ellipsis placeholder inside a `json` code block, which is invalid JSON. Replaced it with a syntactically valid `HttpWebhook` example.
- The tracked properties example showed `trackedProperties` as a standalone object. Updated it to show `trackedProperties` as a sibling property on an action, which matches the documented workflow definition shape.

## Review Notes
The multi-stage workflow remains an illustrative workflow-definition fragment. A production approval workflow would still need a concrete connector configuration or custom webhook endpoint and explicit branching logic for approval versus rejection.
