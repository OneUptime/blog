# Validation Summary: How to Configure Azure Notification Hubs with Firebase Cloud Messaging v1

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Notification Hubs
- Firebase Cloud Messaging HTTP v1
- Azure CLI / Azure Resource Manager REST API
- Azure Notification Hubs JavaScript SDK
- Azure Notification Hubs management SDK for JavaScript
- Android push notification payloads

## Sources Consulted
- Azure Notification Hubs FCM migration using SDKs: https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-sdk
- Azure Notification Hubs FCM migration using REST API and Azure portal: https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-rest
- Azure ARM template reference for Microsoft.NotificationHubs/namespaces/notificationHubs 2023-10-01-preview: https://learn.microsoft.com/en-us/azure/templates/microsoft.notificationhubs/2023-10-01-preview/namespaces/notificationhubs
- Azure Notification Hubs REST API reference: https://learn.microsoft.com/en-us/rest/api/notificationhubs/
- Azure Notification Hubs JavaScript SDK package types for @azure/notification-hubs 2.1.0
- Azure Notification Hubs management SDK package types for @azure/arm-notificationhubs 3.0.0-beta.1
- Firebase Cloud Messaging HTTP v1 send guide: https://firebase.google.com/docs/cloud-messaging/send/v1-api
- Firebase Cloud Messaging REST API reference: https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages

## Issues Found
- The Azure CLI example used `az notification-hub credential gcm update --google-api-key`, which configures legacy GCM/FCM credentials rather than FCM v1. Replaced it with an `az rest` ARM PATCH example using the `fcmV1Credential` property and the 2023-10-01-preview API shape.
- The portal instructions said to paste the full service account JSON. Azure's FCM v1 setup expects the Project ID, Private Key, and Client Email values. Updated the portal instructions accordingly and noted that the Firebase Cloud Messaging API (V1) must be enabled.
- The management SDK example wrote FCM v1 credentials into `gcmCredential.googleApiKey` and kept the legacy GCM endpoint. Replaced this with `fcmV1Credential` using `project_id`, `private_key`, and `client_email` from the service account JSON.
- The JavaScript send examples used `{ kind: 'FcmV1' }`, but the current JavaScript SDK uses notification helpers such as `createFcmV1Notification`, which produce `platform: 'fcmv1'`. Updated the send, migration-period, and test-send examples to use `createFcmV1Notification`.
- The registration migration section said existing Azure Notification Hubs registrations did not need to be updated. Firebase device tokens can be reused, but Azure Notification Hubs requires registrations or installations to be moved to the FCM v1 platform. Updated the explanation and template migration example to create an `FcmV1Template` registration.
- The transition-period code sent both FCM v1 and legacy GCM payloads. Since the legacy FCM HTTP API is retired, replaced that with an FCM v1-only migration filter example.
- The common issues section said Azure needs the entire service account JSON. Updated it to specify the three fields Azure uses for FCM v1 credentials.

## Review Notes
The examples are now aligned with the current Azure guidance for FCM v1 migration. In a production migration, teams should test registration migration carefully because changing a registration from GCM to FCM v1 may be easier to handle by recreating registrations or using installations, depending on the client/server registration flow.
