# Validation Summary: How to Set Up Azure Notification Hubs for Cross-Platform Push Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Notification Hubs
- Azure CLI notification-hub extension
- Apple Push Notification Service (APNs)
- Firebase Cloud Messaging v1 (FCM v1)
- Windows Push Notification Service (WNS)
- Microsoft.Azure.NotificationHubs .NET SDK
- C# push notification registration and send APIs

## Sources Consulted
- Microsoft Learn: Quickstart: Set up push notifications in a notification hub - https://learn.microsoft.com/en-us/azure/notification-hubs/configure-notification-hub-portal-pns-settings
- Microsoft Learn: Google Firebase Cloud Messaging migration using Azure SDKs - https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-sdk
- Microsoft Learn: az notification-hub namespace - https://learn.microsoft.com/en-us/cli/azure/notification-hub/namespace
- Microsoft Learn: az notification-hub - https://learn.microsoft.com/en-us/cli/azure/notification-hub
- Microsoft Learn: az notification-hub credential apns - https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/apns
- Microsoft Learn: az notification-hub credential gcm - https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/gcm
- Microsoft Learn: az notification-hub credential wns - https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/wns
- Microsoft Learn: NotificationHubClient class - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.notificationhubs.notificationhubclient
- Microsoft Learn: INotificationHubClient interface - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.notificationhubs.inotificationhubclient
- Microsoft Learn: Get notification message telemetry - https://learn.microsoft.com/en-us/rest/api/notificationhubs/get-notification-message-telemetry
- Microsoft Azure: Notification Hubs pricing - https://azure.microsoft.com/en-us/pricing/details/notification-hubs/

## Issues Found
- The Android setup used legacy GCM/FCM server-key configuration. Microsoft documents legacy FCM as deprecated and no longer supported, so I changed the Android setup to FCM v1 with service account JSON credentials configured through the Azure portal.
- The .NET Android registration and send examples used legacy `FcmRegistrationDescription` and `SendFcmNativeNotificationAsync`. I updated them to current FCM v1 registration and send patterns using `CreateFcmV1NativeRegistrationAsync`, `FcmV1Notification`, and `SendNotificationAsync`.
- The Android payload examples used legacy FCM payload shape. I updated them to FCM v1 payloads with a top-level `message` object.
- The APNs token-auth CLI example used `--apns-certificate` for a `.p8` key, mapped the Bundle ID to `--app-id`, omitted `--app-name`, and listed certificate-auth APNs gateway endpoints. I corrected the token-auth parameters and endpoint values.
- The C# registration snippet declared `public` methods at top level, which is not valid top-level C#. I changed them to local async functions and added the required using directives.
- The telemetry section implied per-message telemetry was generally available. I clarified that it is a Standard-tier feature.
- The post overstated automatic token refresh and cleanup behavior. I softened those claims to reflect that apps/backends still need to update changed tokens and that expired tokens remain a common operational issue.

## Review Notes
The Azure CLI `notification-hub` command group is documented as an extension and several commands are marked experimental. The local environment did not have `az` installed, so CLI checks were performed against Microsoft Learn CLI reference documentation rather than local `az --help` output.
