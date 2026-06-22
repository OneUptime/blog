# Validation Summary: How to Set Up Push Notifications with Firebase in React Native

## Status
validated

## Post Type
Tutorial / Guide (step-by-step implementation walkthrough)

## Technologies Covered
- React Native
- Firebase Cloud Messaging (FCM)
- `@react-native-firebase/app` and `@react-native-firebase/messaging`
- `@notifee/react-native` (local notifications & channels)
- Apple Push Notification service (APNs)
- Android notification channels (API 26+) and `POST_NOTIFICATIONS` permission (API 33+)
- React Navigation (deep linking)
- Firebase Admin SDK (`firebase-admin`)
- FCM HTTP v1 API

## Sources Consulted
- React Native Firebase — Messaging usage: https://rnfirebase.io/messaging/usage
- Firebase Cloud Messaging docs (HTTP v1 API): https://firebase.google.com/docs/cloud-messaging
- FCM legacy API deprecation/shutdown notices (Google "Action Required" announcement; endpoint `fcm.googleapis.com/fcm/send` disabled after June 2024): https://firebase.google.com/docs/cloud-messaging/migrate-v1
- Notifee docs: https://notifee.app/
- Android notification channels: https://developer.android.com/develop/ui/views/notifications/channels
- Apple Push Notifications (UserNotifications): https://developer.apple.com/documentation/usernotifications

## Issues Found
1. **Legacy FCM HTTP send API in the cURL testing section (broken).** The post used `https://fcm.googleapis.com/fcm/send` with an `Authorization: key=YOUR_SERVER_KEY` header and a top-level `"to"` payload. This is the legacy FCM HTTP API, which Google deprecated (June 2023) and shut down in 2024 — the endpoint now returns errors and the legacy server key no longer works. **Fixed:** replaced both cURL examples with the FCM HTTP v1 endpoint (`https://fcm.googleapis.com/v1/projects/YOUR_PROJECT_ID/messages:send`), an OAuth 2.0 `Authorization: Bearer` token (minted via `gcloud auth application-default print-access-token`), and the v1 `"message"` payload wrapper (with `"topic"` instead of `"/topics/..."`). Added a one-sentence note explaining the migration.

2. **Legacy-format JSON in "Sending Deep Link Notifications" (outdated).** The example used the legacy top-level `"to"` / `"notification"` / `"data"` shape. **Fixed:** wrapped it in the HTTP v1 `"message"` envelope to match the rest of the post (the Data-Only Messages section already correctly used v1).

3. **Missing `Platform` import in `tokenManager.ts` (would not compile).** The `syncTokenWithServer` method references `Platform.OS`, but the file only imported `messaging` and `AsyncStorage`. **Fixed:** added `import { Platform } from 'react-native';`.

4. **Troubleshooting referenced the legacy "server key".** "Verify server key is correct" pointed at the now-defunct legacy credential. **Fixed:** changed to "Verify your server credentials are correct (a valid service account for the FCM HTTP v1 API)".

## Review Notes
- **Deprecated (but still functional) namespaced API:** The post uses the `@react-native-firebase/messaging` namespaced/default-export style (`messaging().onMessage(...)`, `messaging().getToken()`, `messaging.AuthorizationStatus`, etc.). In recent RNFirebase versions (v22+) this style emits deprecation warnings in favor of the modular API (`getMessaging`, `onMessage(messaging, ...)`). The namespaced API still works and is the form most existing apps use, so it was left intact — converting the entire post to the modular API would be a structural rewrite beyond the scope of correctness fixes. Worth modernizing in a future revision.
- RNFirebase docs also now note that `requestPermission`/`hasPermission`/`AuthorizationStatus` are being deprecated in favor of `react-native-permissions`/`expo-notifications`; the shown code remains valid for current versions.
- `notifee.displayNotification({ id: messageId, ... })` passes `messageId`, which can be `undefined`; Notifee treats `id` as optional and auto-generates one when absent, so this is safe.
- The iOS `AppDelegate` snippet (`#import <Firebase.h>`, `[FIRApp configure]`, setting `[FIRMessaging messaging].APNSToken`) is consistent with current RNFirebase guidance.
- Firebase Console navigation ("Engage > Messaging"), APNs `.p8` key upload steps, Android manifest meta-data keys, and notification-channel importance levels were all verified as accurate.
