# Validation Summary: How to Fix Azure Notification Hub Push Notification Delivery Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Notification Hubs
- Azure CLI
- Azure Monitor diagnostic settings
- Azure Notification Hubs REST API
- Apple Push Notification service (APNs)
- Firebase Cloud Messaging (FCM)
- Android Firebase Messaging Service
- Push notification registration and tag routing

## Sources Consulted
- Microsoft Learn: Azure Notification Hubs resource logs - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-diagnostic-logs
- Microsoft Learn: Monitor Azure Notification Hubs - https://learn.microsoft.com/en-us/azure/notification-hubs/monitor-notification-hubs
- Microsoft Learn: Get notification message telemetry - https://learn.microsoft.com/en-us/rest/api/notificationhubs/get-notification-message-telemetry
- Microsoft Learn: Direct send - https://learn.microsoft.com/en-us/rest/api/notificationhubs/direct-send
- Microsoft Learn: Azure CLI `az notification-hub credential apns` - https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/apns
- Microsoft Learn: Azure CLI `az notification-hub credential gcm` - https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/gcm
- Microsoft Learn: Google Firebase Cloud Messaging migration using REST API and the Azure portal - https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-rest
- Microsoft Learn: Read all registrations with a tag / Notification Hubs REST API methods - https://learn.microsoft.com/en-us/rest/api/notificationhubs/rest-api-methods
- Microsoft Learn: NotificationHubDescription.RegistrationTtl property - https://learn.microsoft.com/en-us/dotnet/api/microsoft.azure.notificationhubs.notificationhubdescription.registrationttl
- Microsoft Azure: Notification Hubs pricing - https://azure.microsoft.com/en-us/pricing/details/notification-hubs/
- Apple Developer Documentation: Establishing a connection to APNs - https://developer.apple.com/documentation/usernotifications/establishing-a-connection-to-apns
- Apple Developer Documentation: Generating a remote notification - https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification
- Firebase Documentation: Receive messages in Android apps - https://firebase.google.com/docs/cloud-messaging/android/receive-messages

## Issues Found
- The diagnostic logging section incorrectly described operational logs as per-message telemetry. Updated it to distinguish Azure Monitor operational logs from Standard-tier per-message telemetry and added the telemetry REST API pattern.
- The diagnostic settings resource path targeted a notification hub. Updated it to target the Notification Hubs namespace, matching the resource logs documentation.
- The APNs CLI example used a non-existent `--apns-credential` aggregate option and incomplete endpoints. Replaced it with current `az notification-hub credential apns update` flags and APNs HTTP/2 endpoint paths.
- The APNs sandbox endpoint used `api.sandbox.push.apple.com`. Updated it to the current APNs development endpoint used by Apple and Azure docs: `api.development.push.apple.com:443/3/device`.
- The direct send example used `api-version=2015-01` without the documented `x-ms-version` header. Updated it to the direct-send documented `2015-04` version and content type.
- JSON examples included comments inside `json` code fences. Changed those fences to `jsonc` so the examples are labeled correctly.
- The FCM section called the legacy `gcm` CLI key command an FCM v1 configuration command. Reworded it as legacy FCM configuration and added the correct FCM v1 credential guidance using service account fields or `FcmV1Credential`.
- The FCM v1 payload examples omitted the required top-level `message` object. Updated both notification and data-only examples to the HTTP v1 payload shape.
- The registration management command claimed to check active registration count but only queried `registrationTtl`. Reworded the surrounding text and comment to match what the command actually returns.
- The tag registration example used an Azure CLI registration command that is not present in the current Azure CLI reference. Replaced it with the Notification Hubs REST pattern for reading registrations by tag.
- The pricing section said Standard has unlimited pushes. Updated it to the current pricing language: 10 million included pushes per month, unlimited active devices, and rich telemetry.

## Review Notes
Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn command reference pages rather than local `az --help` output.
