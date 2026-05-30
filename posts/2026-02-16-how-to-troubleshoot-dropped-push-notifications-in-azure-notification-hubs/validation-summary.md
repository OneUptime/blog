# Validation Summary: How to Troubleshoot Dropped Push Notifications in Azure Notification Hubs

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Notification Hubs
- Azure CLI
- Azure Monitor diagnostics and metrics
- JavaScript / Node.js
- Azure Notification Hubs JavaScript SDK
- Apple Push Notification service (APNs)
- Firebase Cloud Messaging (FCM v1)
- Android notification channels

## Sources Consulted
- Microsoft Learn: Azure Notification Hubs JavaScript SDK `SendNotificationOptions` - https://learn.microsoft.com/en-us/javascript/api/%40azure/notification-hubs/sendnotificationoptions
- Microsoft Learn: Azure Notification Hubs JavaScript SDK `NotificationHubsMessageResponse` - https://learn.microsoft.com/en-us/javascript/api/%40azure/notification-hubs/notificationhubsmessageresponse
- Microsoft Learn: Azure Notification Hubs JavaScript SDK `FcmV1Notification` - https://learn.microsoft.com/en-us/javascript/api/%40azure/notification-hubs/fcmv1notification
- Microsoft Learn: Azure Notification Hubs FCM migration - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Learn: Azure Notification Hubs monitoring data reference - https://learn.microsoft.com/en-us/azure/notification-hubs/monitor-notification-hubs-reference
- Microsoft Learn: Monitor Azure Notification Hubs - https://learn.microsoft.com/en-us/azure/notification-hubs/monitor-notification-hubs
- Microsoft Learn: Azure Notification Hubs resource logs - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-diagnostic-logs
- Microsoft Learn: Get notification message telemetry REST API - https://learn.microsoft.com/en-us/rest/api/notificationhubs/get-notification-message-telemetry
- Microsoft Learn: Azure CLI `az notification-hub` - https://learn.microsoft.com/en-us/cli/azure/notification-hub
- Microsoft Learn: Azure CLI `az monitor diagnostic-settings` - https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Apple Developer Documentation: Remote notification payloads and APNs payload size limits - https://developer.apple.com/documentation/UserNotifications/generating-a-remote-notification
- Firebase Documentation: FCM REST v1 message resource and error codes - https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages and https://firebase.google.com/docs/cloud-messaging/error-codes
- Android Developers: NotificationChannel API reference - https://developer.android.com/reference/android/app/NotificationChannel

## Issues Found
- The JavaScript send examples used an outdated/incorrect notification object shape with `kind: 'Gcm'`. Updated them to the current Azure Notification Hubs JavaScript SDK shape for FCM v1 using `platform: 'fcmv1'`, JSON content type, and an FCM v1 `message` payload.
- The registration inspection snippet only checked legacy `gcmRegistrationId`. Added `fcmV1RegistrationId` and labeled the legacy token output clearly.
- The FCM credential guidance still allowed legacy server key language. Updated it to require FCM v1 credentials and note that FCM legacy HTTP APIs are retired.
- The Android payload example used legacy FCM structure. Updated it to the FCM v1 `message` wrapper while preserving the guidance that `data` values must be strings.
- The diagnostic logs section claimed push delivery logs could be enabled with a `PushNotificationLogs` category and queried through an `NHPushNotificationLog` table. Current Azure Notification Hubs docs list `OperationalLogs` for resource logs and state that data operations are not captured, so the section now explains the limitation and points to metrics, test send, and Standard-tier per-message telemetry.
- The checklist referred to diagnostic logs for delivery errors. Updated it to refer to metrics and per-message telemetry.

## Review Notes
The post is technically useful after correction. The Azure CLI was not installed in the local environment, so CLI syntax was verified against Microsoft Learn rather than local `az --help` output.
