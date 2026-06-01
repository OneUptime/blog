# Validation Summary: How to Schedule Push Notifications in Azure Notification Hubs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Notification Hubs
- Azure Notification Hubs JavaScript SDK (`@azure/notification-hubs`)
- Firebase Cloud Messaging v1
- JavaScript / Node.js
- Luxon time zone handling
- Azure Functions timer-trigger scheduling pattern

## Sources Consulted
- Microsoft Learn: Azure Notification Hubs SDK for JavaScript - https://learn.microsoft.com/en-us/javascript/api/overview/azure/notification-hubs-readme?view=azure-node-latest
- Microsoft Learn: `NotificationHubsClient` class API reference - https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/notificationhubsclient?view=azure-node-latest
- Microsoft Learn: `ScheduleNotificationOptions` API reference - https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/schedulenotificationoptions?view=azure-node-latest
- Microsoft Learn: How to send scheduled notifications - https://learn.microsoft.com/en-ie/azure/notification-hubs/notification-hubs-send-push-notifications-scheduled
- Microsoft Learn: Azure Notification Hubs and Google Firebase Cloud Messaging migration - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Learn: Routing and tag expressions in Azure Notification Hubs - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-tags-segment-push-message
- Luxon API documentation - https://moment.github.io/luxon/api-docs/index.html
- npm package metadata and TypeScript declarations for `@azure/notification-hubs@2.1.0`

## Issues Found
- The JavaScript examples called `client.scheduleNotification(notification, scheduledTime, options)`, but the current `@azure/notification-hubs` SDK signature is `scheduleNotification(scheduledTime, notification, options)`. Updated all examples to use the documented parameter order.
- The notification examples used raw objects with `kind: 'Gcm'`, which is not the current SDK notification model and also points at legacy FCM/GCM. Updated examples to use `createFcmV1Notification` with an FCM v1 `message` payload.
- The template notification example used a raw `{ kind: 'Template' }` object. Updated it to use `createTemplateNotification`.
- The time-zone helper claimed to convert a local time in a requested IANA time zone to UTC, but it actually used the server's local time and did not apply the `timezone` parameter. Replaced it with Luxon-based conversion.
- The recurring scheduler accepted a `timezone` parameter but ignored it when calculating the next fire time. Updated the daily recurrence example to calculate the next local time in the requested zone and convert it to UTC.

## Review Notes
The post is technically valid after the fixes. The examples remain illustrative because they assume existing hub credentials, FCM v1 configuration, registered devices with matching tags, and application database helper methods.
