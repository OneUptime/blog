# Validation Summary: How to Use Templates in Azure Notification Hubs for Cross-Platform Push

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Notification Hubs
- Azure Notification Hubs template registrations
- Azure Notification Hubs JavaScript SDK
- Firebase Cloud Messaging v1
- Apple Push Notification service
- Windows Notification Service
- JavaScript

## Sources Consulted
- Microsoft Learn, Azure Notification Hubs templates: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-templates-cross-platform-push-messages
- Microsoft Learn, Google Firebase Cloud Messaging migration using Azure SDKs: https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-sdk
- Microsoft Learn, @azure/notification-hubs NotificationHubsClient API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/notificationhubsclient?view=azure-node-latest
- Microsoft Learn, @azure/notification-hubs FcmV1TemplateRegistrationDescription API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/fcmv1templateregistrationdescription?view=azure-node-latest
- Microsoft Learn, @azure/notification-hubs AppleTemplateRegistrationDescription API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/appletemplateregistrationdescription?view=azure-node-latest
- Microsoft Learn, @azure/notification-hubs TemplateNotification API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/templatenotification?view=azure-node-latest
- Microsoft Learn, @azure/notification-hubs SendNotificationOptions API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/sendnotificationoptions?view=azure-node-latest
- npm package metadata and TypeScript declarations for @azure/notification-hubs 2.1.0.

## Issues Found
- The Android examples used legacy GCM template registrations and legacy FCM payload shape. Updated them to FCM v1 template registrations with `kind: 'FcmV1Template'`, `fcmV1RegistrationId`, and `message`-wrapped FCM v1 payload templates.
- The JavaScript notification examples used `kind: 'Template'`, `kind: 'Gcm'`, and `kind: 'Apple'` notification objects. Updated sends to use current SDK helper constructors such as `createTemplateNotification`, `createFcmV1Notification`, and `createAppleNotification`.
- The broadcast template send used `sendNotification` with no targeting options. Updated broadcast examples to use `sendBroadcastNotification`, matching the current SDK methods.
- The Apple template registration used `headers`; the current SDK registration field is `apnsHeaders`. Updated the registration example.
- APNs badge values were passed as strings through `$(badge)`. Updated the APNs template to use `#(badge)` and numeric badge values so the expanded JSON value is numeric.
- The template expression section described conditional expressions, but official Notification Hubs templates support property references, clipping, URI encoding, JSON numeric expansion, literals, and concatenation, not general conditionals. Updated the wording and example.
- The introductory FCM explanation described legacy FCM payload shape. Updated it to describe the FCM v1 `message` wrapper.

## Review Notes
The post remains focused on the registration model. Microsoft documentation also notes that the installation model is preferred for template registration scenarios, which could be expanded in a future revision.
