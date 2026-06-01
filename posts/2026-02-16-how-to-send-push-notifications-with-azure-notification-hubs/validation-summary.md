# Validation Summary: How to Send Push Notifications with Azure Notification Hubs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Notification Hubs
- Azure CLI
- Firebase Cloud Messaging v1
- Apple Push Notification service
- JavaScript
- `@azure/notification-hubs`

## Sources Consulted
- Microsoft Learn, Quickstart: Create an Azure notification hub using the Azure CLI: https://learn.microsoft.com/en-us/azure/notification-hubs/create-notification-hub-azure-cli
- Microsoft Learn, `az notification-hub credential apns` CLI reference: https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/apns
- Microsoft Learn, `az notification-hub credential gcm` CLI reference: https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/gcm
- Microsoft Learn, Azure Notification Hubs and Google Firebase Cloud Messaging migration: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Learn, `@azure/notification-hubs` `NotificationHubsClient` API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/notificationhubsclient
- Microsoft Learn, `@azure/notification-hubs` `FcmV1Notification` API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/fcmv1notification
- Microsoft Learn, `@azure/notification-hubs` `FcmV1RegistrationDescription` API: https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/fcmv1registrationdescription
- Microsoft Learn, Registration management: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-registration-management
- Microsoft Learn, Routing and tag expressions: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-tags-segment-push-message
- Microsoft Learn, Diagnose dropped notifications in Azure Notification Hubs: https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-fixer
- npm package metadata and TypeScript declarations for `@azure/notification-hubs` 2.1.0.

## Issues Found
- The Android credential section used the retired FCM legacy server-key flow. I changed it to describe FCM v1 service account credentials and noted that the Azure CLI `gcm update` command is for Google API key credentials.
- The APNs token-authentication command used `--apns-certificate` and an incomplete HTTP/2 endpoint. I changed it to `--token` and `https://api.push.apple.com:443/3/device`, matching the Azure CLI APNs reference.
- The Android registration example used legacy `kind: 'Gcm'` and `gcmRegistrationId`. I changed it to `kind: 'FcmV1'` and `fcmV1RegistrationId`.
- The registration examples called `createOrUpdateRegistration` without a registration ID. In the JavaScript SDK, that path is for updating or overwriting a known registration ID, so I changed new-device examples to `createRegistration`.
- The send examples used `kind` on notification objects. Current `@azure/notification-hubs` notification objects use `platform`, `contentType`, and `body`; I updated the examples to use `createFcmV1Notification` and `createAppleNotification`.
- Broadcast examples used `sendNotification` with only `enableTestSend`. Current `sendNotification` requires a tag expression or device handle, so I changed broadcast sends to `sendBroadcastNotification`.
- FCM payload examples used the legacy payload shape. I changed them to the FCM v1 `message` envelope.

## Review Notes
The post is now technically aligned with current Azure Notification Hubs JavaScript SDK types and the FCM v1 migration guidance. The local environment did not have the Azure CLI installed, so CLI validation was performed against Microsoft Learn reference documentation instead of local `az --help` output.
