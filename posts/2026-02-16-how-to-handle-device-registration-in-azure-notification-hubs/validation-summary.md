# Validation Summary: How to Handle Device Registration in Azure Notification Hubs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Notification Hubs
- Notification Hubs registrations and installations
- Azure Notification Hubs JavaScript SDK (`@azure/notification-hubs`)
- APNs
- Firebase Cloud Messaging v1
- Express.js backend endpoints
- Azure Functions timer-triggered cleanup jobs
- JSON Patch

## Sources Consulted
- Microsoft Learn: Registration management - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-push-notification-registration-management
- Microsoft Learn: NotificationHubsClient class for JavaScript - https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/notificationhubsclient
- Microsoft Learn: Installation type for JavaScript - https://learn.microsoft.com/en-us/javascript/api/@azure/notification-hubs/installation
- Microsoft Learn: Update an installation REST API - https://learn.microsoft.com/en-us/rest/api/notificationhubs/update-installation
- Microsoft Learn: Google Firebase Cloud Messaging migration using Azure SDKs - https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-sdk
- Microsoft Learn: Azure Notification Hubs and Google Firebase Cloud Messaging migration - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Learn: Azure Notification Hubs limits - https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#azure-notification-hubs-limits
- Firebase documentation: Migrate from legacy FCM APIs to HTTP v1 - https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Firebase documentation: Best practices for FCM registration token management - https://firebase.google.com/docs/cloud-messaging/manage-tokens
- `@azure/notification-hubs` npm package 2.1.0 type definitions and README

## Issues Found
- The Android installation examples used the legacy `gcm` platform. Updated them to `fcmv1`, matching Azure Notification Hubs FCM v1 guidance and the current JavaScript SDK installation type.
- The Android template examples used legacy FCM payload shapes with top-level `notification` and `data` objects. Updated them to FCM v1 `message.android.notification` and `message.android.data` payload structures.
- The post referred to FCM "registration IDs." Updated the wording to "registration tokens," which matches current Firebase terminology.
- The push-channel patch examples used `replace` for `/pushChannel`. Updated them to `add`, matching the Notification Hubs installation patch examples for updating the push channel.
- The delete-installation comment implied an app can reliably delete on uninstall. Updated it to explicit logout/device-disable cases.
- The stale-token feedback guidance implied direct manual removal whenever APNs or FCM reports invalid tokens. Updated it to reflect Notification Hubs' automatic cleanup after PNS expiry responses and to reserve custom cleanup for secondary records.
- The client-managed registration section implied broad hub credential exposure. Clarified that a client should only use a Listen-only connection string or SAS token.

## Review Notes
- The JavaScript snippets are illustrative and rely on surrounding application functions such as `requireAuth`, `getUserPreferences`, and `isUserActive`.
- The post does not cover the one-time requirement to configure FCM v1 credentials on the notification hub; this would be useful future context but was not necessary to correct the device registration examples.
