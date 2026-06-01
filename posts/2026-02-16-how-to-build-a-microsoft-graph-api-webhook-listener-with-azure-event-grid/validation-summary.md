# Validation Summary: How to Build a Microsoft Graph API Webhook Listener with Azure Event Grid

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Graph API change notifications
- Microsoft Graph subscriptions
- Azure Event Grid
- Azure Functions
- C#/.NET
- Microsoft Entra ID app registrations
- Microsoft 365 webhooks

## Sources Consulted
- Microsoft Graph: Receive change notifications through webhooks: https://learn.microsoft.com/en-us/graph/change-notifications-delivery-webhooks
- Microsoft Graph: Set up notifications for changes in resource data: https://learn.microsoft.com/en-us/graph/change-notifications-overview
- Microsoft Graph: Create subscription: https://learn.microsoft.com/en-us/graph/api/subscription-post-subscriptions
- Microsoft Graph: Set up change notifications with resource data: https://learn.microsoft.com/en-us/graph/change-notifications-with-resource-data
- Azure Event Grid: Receive Microsoft Graph API change events through Azure Event Grid: https://learn.microsoft.com/en-us/azure/event-grid/subscribe-to-graph-api-events
- Azure Event Grid client library for .NET: https://learn.microsoft.com/en-us/dotnet/api/overview/azure/messaging.eventgrid-readme
- Azure Functions Event Grid trigger documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-event-grid-trigger

## Issues Found
- The post stated that Graph subscription expiration is a maximum of three days for most resources. Microsoft Graph subscription lifetimes vary by resource, including under seven days for Outlook resources, under 29 days for users/groups/directory resources, and under one day for rich notification subscriptions. Updated the wording to say the maximum varies by resource and clarified the example expiration comment.
- The post described the 3-second response guidance as a hard delivery failure threshold. Microsoft Graph recommends 200 OK when processing completes within 3 seconds and allows queueing with 202 Accepted before the 10-second response window. Updated the explanation and comments to match the documented retry behavior.
- The app registration section used the old Azure AD portal name. Updated it to Microsoft Entra ID, which is the current Microsoft naming in Azure portal documentation.
- The webhook receiver C# model used PascalCase properties without JSON property mapping, but Microsoft Graph sends camel-case JSON such as `value`, `subscriptionId`, `changeType`, `resourceData`, and `clientState`. Added `JsonPropertyName` attributes so the payload deserializes correctly.
- The webhook receiver forwarded notifications before validating `clientState`, even though the post later says this must always be validated. Moved the `clientState` check into the forwarding loop and only publishes valid notifications.
- The webhook receiver snippet used `Uri`, `DateTime`, and `List<T>` without the required `System` and `System.Collections.Generic` imports. Added the missing usings.
- The notification processor snippet referenced `NotificationData` but did not define it. Added the missing model and required `System` import for `DateTime`.
- The rich notification example used `/users`, which is supported for basic user change notifications but is not listed as a rich notification resource in Microsoft Graph documentation. Changed the example to an Outlook message subscription with `$select`, and changed the expiration to 23 hours because rich notification subscriptions have a maximum lifetime under one day.

## Review Notes
The post uses a custom Event Grid topic behind a webhook receiver. Microsoft Graph also supports direct delivery to Azure Event Grid partner topics by using an `EventGrid:?...` `notificationUrl`; that could simplify a future version, but the webhook-plus-custom-topic architecture remains technically valid.
