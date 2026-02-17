# How to Implement Silent Push Notifications with Azure Notification Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hubs, Silent Push, Background Sync, iOS, Android, Mobile

Description: Implement silent push notifications with Azure Notification Hubs to trigger background processing on mobile devices without alerting users.

---

Not every push notification needs to buzz the user's phone or show a banner. Silent push notifications are messages sent to your app that the user never sees. They trigger background processing in your app - syncing data, updating content, refreshing caches, or preloading resources. The user experience improves because the app appears up-to-date the next time they open it, without them having to wait for a sync.

In this post, I will show you how to implement silent push notifications using Azure Notification Hubs for both iOS and Android.

## What Are Silent Push Notifications?

A regular push notification shows a visual alert, plays a sound, or updates a badge. A silent notification does none of that. Instead, it wakes up your app in the background and gives it a short window to perform work.

Common use cases include:

- Syncing new content (emails, messages, articles)
- Updating cached data
- Triggering a location update
- Invalidating a local cache when server data changes
- Preloading content for faster app launch

The important constraint is time. On iOS, your app gets roughly 30 seconds of background execution time when a silent push arrives. On Android, the time varies but is similarly limited. Design your background work to be quick or to kick off a background task that continues after the notification handler returns.

## Silent Push on iOS via APNs

For iOS, a silent push notification is called a "background update notification." The key is setting `content-available: 1` in the `aps` payload and omitting the `alert`, `badge`, and `sound` fields.

```javascript
// silent-ios.js - Send a silent push notification to iOS devices
const { NotificationHubsClient } = require('@azure/notification-hubs');

const client = new NotificationHubsClient(
  process.env.NOTIFICATION_HUB_CONNECTION_STRING,
  'my-hub'
);

async function sendSilentIos(tagExpression, customData) {
  // The APNs payload for a silent notification
  const payload = {
    aps: {
      'content-available': 1 // This flag makes it a silent notification
      // Do NOT include alert, badge, or sound
    },
    // Custom data that your app will process
    ...customData
  };

  const result = await client.sendNotification(
    {
      kind: 'Apple',
      body: JSON.stringify(payload),
      headers: {
        'apns-push-type': 'background', // Required for silent pushes on iOS 13+
        'apns-priority': '5'            // Must be 5 (not 10) for background pushes
      }
    },
    { tagExpression }
  );

  console.log('Silent iOS notification sent:', result.trackingId);
  return result;
}

// Trigger a data sync for a specific user
sendSilentIos('user:user-123 && platform:ios', {
  action: 'sync',
  resource: 'messages',
  since: '2026-02-16T10:00:00Z'
});
```

Two critical details for iOS silent pushes:

1. **apns-push-type must be "background"**. Starting with iOS 13, Apple requires this header. If you omit it or set it to "alert", the silent push may not be delivered.
2. **apns-priority must be 5**. A priority of 10 tells APNs to deliver immediately, but Apple throttles background notifications with high priority. Priority 5 tells the system it can deliver the notification at an optimal time, which is what you want for background updates.

## Silent Push on Android via FCM

On Android, silent notifications are called "data messages." You send a payload with only a `data` field and no `notification` field. When FCM receives a data-only message, it delivers it directly to your app's message handler without showing any UI.

```javascript
// silent-android.js - Send a silent push notification to Android devices
async function sendSilentAndroid(tagExpression, data) {
  // FCM data-only message - no notification field means no UI shown
  const payload = {
    data: {
      action: data.action,
      resource: data.resource,
      since: data.since,
      // All values must be strings in FCM data messages
      priority: String(data.priority || 'normal')
    }
  };

  const result = await client.sendNotification(
    {
      kind: 'Gcm',
      body: JSON.stringify(payload)
    },
    { tagExpression }
  );

  console.log('Silent Android notification sent:', result.trackingId);
  return result;
}

// Trigger a cache refresh
sendSilentAndroid('user:user-123 && platform:android', {
  action: 'refresh_cache',
  resource: 'user_profile',
  since: new Date().toISOString()
});
```

On the Android side, data messages are handled by your `FirebaseMessagingService` even when the app is in the background. This is different from notification messages, which are handled by the system tray when the app is not in the foreground.

## Cross-Platform Silent Push with Templates

If you are targeting both platforms, templates make it cleaner. Register each platform with a silent notification template.

```javascript
// silent-template-register.js - Register templates for silent push on both platforms

// iOS silent template
async function registerIosSilentTemplate(deviceToken, userId) {
  const template = JSON.stringify({
    aps: {
      'content-available': 1
    },
    action: '$(action)',
    resource: '$(resource)',
    since: '$(since)'
  });

  await client.createOrUpdateRegistration({
    kind: 'AppleTemplate',
    deviceToken: deviceToken,
    bodyTemplate: template,
    templateName: 'silent',
    tags: [`user:${userId}`, 'platform:ios', 'type:silent'],
    headers: {
      'apns-push-type': 'background',
      'apns-priority': '5'
    }
  });
}

// Android silent template
async function registerAndroidSilentTemplate(fcmToken, userId) {
  const template = JSON.stringify({
    data: {
      action: '$(action)',
      resource: '$(resource)',
      since: '$(since)'
    }
  });

  await client.createOrUpdateRegistration({
    kind: 'GcmTemplate',
    gcmRegistrationId: fcmToken,
    bodyTemplate: template,
    templateName: 'silent',
    tags: [`user:${userId}`, 'platform:android', 'type:silent']
  });
}
```

Now you can send a single template notification that silently reaches both platforms.

```javascript
// send-silent-template.js - Cross-platform silent notification
async function sendSilentSync(userId, resource) {
  const result = await client.sendNotification(
    {
      kind: 'Template',
      body: JSON.stringify({
        action: 'sync',
        resource: resource,
        since: new Date().toISOString()
      })
    },
    { tagExpression: `user:${userId} && type:silent` }
  );

  return result;
}

// Trigger a sync across all of a user's devices
sendSilentSync('user-123', 'conversations');
```

## Handling Silent Push in Your Mobile App

On the mobile side, you need to handle the silent notification and perform the background work.

### iOS (Swift)

```swift
// AppDelegate.swift - Handle silent push on iOS
func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
) {
    // Extract the custom data from the notification
    guard let action = userInfo["action"] as? String else {
        completionHandler(.noData)
        return
    }

    switch action {
    case "sync":
        let resource = userInfo["resource"] as? String ?? ""
        let since = userInfo["since"] as? String ?? ""

        // Perform the sync operation
        DataSyncManager.shared.sync(resource: resource, since: since) { success in
            // Tell the system whether new data was fetched
            completionHandler(success ? .newData : .failed)
        }

    case "refresh_cache":
        CacheManager.shared.refresh { success in
            completionHandler(success ? .newData : .noData)
        }

    default:
        completionHandler(.noData)
    }
}
```

### Android (Kotlin)

```kotlin
// MyFirebaseService.kt - Handle silent push on Android
class MyFirebaseService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Data messages arrive here even when the app is in the background
        val data = remoteMessage.data

        when (data["action"]) {
            "sync" -> {
                val resource = data["resource"] ?: return
                val since = data["since"] ?: return
                // Use WorkManager for reliable background work
                val syncWork = OneTimeWorkRequestBuilder<SyncWorker>()
                    .setInputData(workDataOf(
                        "resource" to resource,
                        "since" to since
                    ))
                    .build()
                WorkManager.getInstance(this).enqueue(syncWork)
            }
            "refresh_cache" -> {
                CacheManager.refreshInBackground()
            }
        }
    }
}
```

## Rate Limiting and Throttling

Both Apple and Google throttle silent push notifications. This is important to understand:

- **iOS**: Apple limits the rate of background notifications. If you send too many, the system will start delaying or dropping them. There is no published rate limit, but in practice, more than a few per hour per device can trigger throttling.
- **Android**: FCM has a higher tolerance for data messages, but extremely high volumes can still be throttled. Android also limits background execution in Doze mode.

Design your system to send silent pushes only when there is actually new data to sync, not on a fixed schedule.

```javascript
// smart-silent-push.js - Only send silent pushes when there is actually new data
async function notifyIfChanged(userId, resource) {
  // Check if there is actually new data for this user
  const lastSync = await getLastSyncTime(userId, resource);
  const hasNewData = await checkForNewData(resource, lastSync);

  if (hasNewData) {
    await sendSilentSync(userId, resource);
    console.log(`Sent silent push to ${userId} for ${resource}`);
  } else {
    console.log(`No new ${resource} data for ${userId}, skipping push`);
  }
}
```

## Combining Silent and Visible Notifications

Sometimes you want to send a silent push to update data AND show a visible notification. On iOS, you can do this by including both `content-available: 1` and an `alert` field. But be careful - Apple classifies these as alert notifications, not background notifications, which changes the priority and delivery behavior.

A more reliable pattern is to send them separately: a silent push to trigger the data sync, followed by a visible notification after a short delay.

## Wrapping Up

Silent push notifications are a powerful tool for keeping your app's data fresh without bothering users. Azure Notification Hubs makes it straightforward to send them to both iOS and Android through a single API. The key details to get right are the platform-specific payload formats (content-available for iOS, data-only for Android), the APNs headers (push-type and priority), and respecting the rate limits that each platform enforces. Use silent pushes sparingly and only when there is actual new data, and your users will enjoy an app that always feels up-to-date.
