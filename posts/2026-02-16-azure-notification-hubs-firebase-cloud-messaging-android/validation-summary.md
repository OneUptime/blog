# Validation Summary: How to Configure Azure Notification Hubs with Firebase Cloud Messaging

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Notification Hubs
- Firebase Cloud Messaging (FCM and FCM v1)
- Android
- Firebase Android SDK
- Azure CLI
- .NET Azure Notification Hubs SDK
- Android notification channels and runtime notification permission

## Sources Consulted
- Microsoft Learn: Send push notifications to Android using Azure Notification Hubs and Firebase SDK - https://learn.microsoft.com/en-us/azure/notification-hubs/android-sdk
- Microsoft Learn: Azure Notification Hubs and Google Firebase Cloud Messaging migration - https://learn.microsoft.com/en-us/azure/notification-hubs/notification-hubs-gcm-to-fcm
- Microsoft Learn: Google Firebase Cloud Messaging migration using Azure SDKs - https://learn.microsoft.com/en-us/azure/notification-hubs/firebase-migration-sdk
- Microsoft Learn: Configure Google Firebase settings for a notification hub - https://learn.microsoft.com/en-us/azure/notification-hubs/configure-google-firebase-cloud-messaging
- Microsoft Learn: Azure CLI `az notification-hub credential gcm update` reference - https://learn.microsoft.com/en-us/cli/azure/notification-hub/credential/gcm
- Firebase documentation: Add Firebase to your Android project - https://firebase.google.com/docs/android/setup
- Firebase documentation: Receive messages in Android apps - https://firebase.google.com/docs/cloud-messaging/android/receive
- Android Developers: Notification runtime permission - https://developer.android.com/develop/ui/views/notifications/notification-permission
- Azure Notification Hubs Android SDK repository - https://github.com/Azure/azure-notificationhubs-android

## Issues Found
- The post described legacy FCM as still supported and only "eventually" deprecated. Updated the wording because Google retired FCM legacy APIs in June 2024 and Azure guidance says new integrations should use FCM v1.
- The Firebase credentials section implied a Server Key is still one of the required Firebase items. Updated it to make the FCM v1 service account JSON the required credential for new setups, with legacy server keys only for migration scenarios.
- The Azure portal instructions said to paste the entire service account JSON for FCM v1. Updated this to match Azure's FCM v1 credential fields: Project ID, Private Key, and Client Email.
- The Azure CLI section did not clearly distinguish the `gcm update` command as a legacy API-key command. Clarified that it applies to legacy migration scenarios, and noted that FCM v1 can be configured through the portal, REST API, or management SDKs.
- The Android Gradle snippet used an older direct Firebase Messaging version and included `firebase-core` as if it were required for hub registration. Updated the example to use the Firebase Android BoM and `firebase-messaging`, removed `firebase-core`, updated the Google services plugin version, and added `androidx.core` for `NotificationCompat`.
- The Application class example did not show that the custom `Application` must be registered in `AndroidManifest.xml`. Added the minimal manifest entry needed for the initialization code to run.
- The manifest and testing guidance omitted Android 13+ notification permission requirements. Added `POST_NOTIFICATIONS` and a note to request it at runtime.
- The backend .NET example used the legacy FCM payload shape and `SendFcmNativeNotificationAsync`. Updated it to an FCM v1 payload and `FcmV1Notification` with `SendNotificationAsync`.
- The test send instructions said to select Google (GCM). Updated the wording to select Android or FCM v1, depending on the portal label.
- The backend connection string guidance said to use "Full" for the backend. Updated it to "Send or Full" because sending notifications only requires send permission.

## Review Notes
- The tutorial is technically relevant and salvageable. It now aligns with current FCM v1 guidance, but future maintenance should periodically check Firebase BoM and AndroidX dependency versions.
- The Azure CLI was not installed in the local environment, so the CLI command was verified against the official Microsoft Learn CLI reference instead of local `az --help` output.
