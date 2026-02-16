# How to Fix Azure Notification Hub Push Notification Delivery Failures on iOS and Android

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hubs, Push Notifications, iOS, Android, APNs, FCM, Troubleshooting

Description: Diagnose and resolve Azure Notification Hub push notification delivery failures for iOS and Android including certificate errors, token issues, and payload formatting.

---

Push notifications are one of those features that seem simple on the surface but have a surprising number of failure points. You set up Azure Notification Hubs, configure your platform credentials, send a notification, and nothing happens. No error on the Azure side, no notification on the device, and no clear indication of what went wrong. The notification just vanishes into the void.

I have debugged notification delivery issues for applications with millions of users. The problems are almost always in one of three areas: platform credential configuration (APNs certificates or FCM keys), device registration state, or payload formatting. Let me walk you through systematic troubleshooting for both iOS and Android.

## How Azure Notification Hubs Delivers Messages

Understanding the delivery chain helps you isolate failures. When you send a notification through Azure Notification Hubs:

1. Your backend calls the Notification Hub API with a notification payload
2. Notification Hub looks up device registrations matching your target (tag, template, or direct)
3. For each matching registration, Notification Hub sends the notification to the platform notification service (APNs for iOS, FCM for Android)
4. The platform notification service delivers the notification to the device
5. The device OS displays the notification

Failures can occur at any step. Azure Notification Hubs can tell you about failures in steps 1-3, but once the notification is handed off to APNs or FCM, you depend on platform-specific feedback.

## Enabling Diagnostic Logging

Before troubleshooting anything, enable per-message telemetry. This is the single most important step because it tells you whether notifications are being sent, dropped, or rejected.

```bash
# Enable diagnostic logging for Notification Hub
az monitor diagnostic-settings create \
  --name "nh-diagnostics" \
  --resource "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.NotificationHubs/namespaces/myNHNamespace/notificationHubs/myHub" \
  --workspace "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myLAW" \
  --logs '[{"category":"OperationalLogs","enabled":true}]'
```

Also enable per-message telemetry for detailed send results. This is done at the notification level by including the `ServiceBusNotification-DeviceHandle` header in test sends, or by using the "Test Send" feature in the Azure portal.

## iOS (APNs) Delivery Failures

### Certificate vs Token Authentication

APNs supports two authentication methods: certificate-based and token-based. Certificate-based authentication uses a .p12 certificate that expires after one year. Token-based authentication uses a signing key (.p8 file) that does not expire.

I strongly recommend token-based authentication because it eliminates the most common iOS failure: expired certificates.

To configure token-based authentication:

```bash
# Configure APNs token authentication in Notification Hub
# You need: Key ID, Team ID, Bundle ID, and the .p8 key file
az notification-hub credential apns update \
  --resource-group myRG \
  --namespace-name myNHNamespace \
  --notification-hub-name myHub \
  --apns-credential \
    key-id="ABC123DEF4" \
    app-name="com.mycompany.myapp" \
    app-id="TEAM123456" \
    token="<base64-encoded-p8-key-content>" \
    endpoint="https://api.push.apple.com"
```

Common APNs configuration mistakes:
- Using the sandbox endpoint for production or vice versa
- Bundle ID mismatch between the app and the Notification Hub configuration
- Using a development certificate for production pushes
- Expired .p12 certificate (if using certificate authentication)

### Sandbox vs Production

APNs has two environments: sandbox (for development builds) and production (for App Store and TestFlight builds). Using the wrong environment means notifications are sent to the wrong APNs server and silently dropped.

```
// Sandbox endpoint (for development)
https://api.sandbox.push.apple.com

// Production endpoint (for App Store and TestFlight)
https://api.push.apple.com
```

If your development builds get notifications but production builds do not (or vice versa), check the endpoint configuration.

### Invalid Device Tokens

APNs device tokens change when a user reinstalls the app, restores from backup, or upgrades the OS. If your Notification Hub has stale registrations with invalid tokens, APNs returns a "BadDeviceToken" or "Unregistered" response.

Use test send to a specific device token and check the result.

```bash
# Test send to a specific iOS device
# This gives you detailed feedback including APNs response
curl -X POST \
  "https://myNHNamespace.servicebus.windows.net/myHub/messages?direct&api-version=2015-01" \
  -H "ServiceBusNotification-Format: apple" \
  -H "ServiceBusNotification-DeviceHandle: <device-token>" \
  -H "Authorization: <sas-token>" \
  -H "Content-Type: application/json" \
  -d '{"aps":{"alert":"Test notification","badge":1}}'
```

If the response includes "The device token is not valid," the registration is stale and should be cleaned up.

### APNs Payload Format

APNs has specific requirements for the notification payload. Common formatting errors that cause silent failures:

```json
// Correct iOS payload format
{
  "aps": {
    "alert": {
      "title": "New Message",
      "body": "You have a new message from John"
    },
    "badge": 1,
    "sound": "default",
    "content-available": 1
  },
  "customKey": "customValue"
}
```

```json
// Wrong: Missing the "aps" wrapper - notification is silently dropped
{
  "alert": "This will not work",
  "badge": 1
}
```

The payload must not exceed 4 KB for regular notifications. Larger payloads are rejected by APNs.

## Android (FCM) Delivery Failures

### FCM Configuration

Azure Notification Hubs supports both the legacy FCM HTTP v1 API and the newer FCM v1 API. The legacy API uses a server key, while the v1 API uses a service account JSON key.

Google deprecated the legacy FCM API, so you should migrate to FCM v1 if you have not already.

```bash
# Configure FCM v1 authentication
# Upload the service account JSON key from the Firebase Console
az notification-hub credential gcm update \
  --resource-group myRG \
  --namespace-name myNHNamespace \
  --notification-hub-name myHub \
  --google-api-key "<your-server-key>"
```

### FCM Token Registration Issues

FCM tokens are device-specific and can change. When a token changes, the old registration in Notification Hub becomes stale. The app should update its registration when it receives a new token.

```java
// Android: Handle FCM token refresh
// Update the Notification Hub registration whenever the token changes
@Override
public void onNewToken(String token) {
    // Send the new token to your backend
    // Your backend updates the Notification Hub registration
    Log.d("FCM", "New token: " + token);
    sendRegistrationToServer(token);
}
```

### FCM Payload Formatting

FCM supports two types of messages: notification messages and data messages. Notification messages are displayed automatically by the OS when the app is in the background. Data messages are always delivered to the app, which handles display.

```json
// FCM notification message - shown automatically when app is in background
{
  "notification": {
    "title": "New Update",
    "body": "Version 2.0 is now available"
  },
  "data": {
    "url": "https://example.com/update"
  }
}
```

```json
// FCM data-only message - always delivered to app code
// Use this for silent notifications or custom display
{
  "data": {
    "title": "New Update",
    "body": "Version 2.0 is now available",
    "url": "https://example.com/update"
  }
}
```

A common mistake is sending notification messages but expecting the app to handle them while in the background. Notification messages are only delivered to the app's `onMessageReceived` handler when the app is in the foreground.

## Registration Management

Stale registrations are a major source of delivery failures. Over time, as users uninstall your app or change devices, registrations accumulate that point to devices that no longer exist.

Monitor your registration count and delivery success rate.

```bash
# Check the number of active registrations
az notification-hub show \
  --resource-group myRG \
  --namespace-name myNHNamespace \
  --name myHub \
  --query "registrationTtl"
```

Set a registration TTL (time-to-live) to automatically expire old registrations. A 90-day TTL is reasonable for most applications.

Implement a feedback loop in your backend: when APNs or FCM reports that a device token is invalid, remove the corresponding registration from Notification Hub.

## Tag-Based Routing Issues

If you use tags to target notifications, make sure the registration tags match the send tags exactly. Tags are case-sensitive.

```bash
# List registrations for a specific tag to verify they exist
# If no registrations match your target tag, no notifications are sent
az notification-hub registration list \
  --resource-group myRG \
  --namespace-name myNHNamespace \
  --notification-hub-name myHub \
  --top 10
```

A notification sent to a tag with zero matching registrations succeeds from the API perspective (HTTP 201) but delivers to zero devices. This is not an error; it is working as designed. Always verify that registrations exist for your target tags before troubleshooting delivery.

## Throttling and Rate Limits

Notification Hub has rate limits based on your pricing tier:
- **Free**: 1 million pushes per month, limited active devices
- **Basic**: 10 million pushes per month
- **Standard**: Unlimited pushes, with per-second rate limits based on namespace capacity

If you are being throttled, you will see HTTP 429 responses from the API. Scale up your tier or spread sends over time to stay within limits.

Push notification debugging requires patience because the feedback loop is slow. You send a notification, it goes through multiple systems, and the result may take minutes to surface. Enable diagnostics, test with individual device tokens first, and verify your platform credentials before doing broad sends.
