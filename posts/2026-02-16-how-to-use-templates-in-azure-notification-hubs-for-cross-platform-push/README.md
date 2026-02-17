# How to Use Templates in Azure Notification Hubs for Cross-Platform Push

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hubs, Templates, Cross-Platform, Push Notifications, Mobile, Backend

Description: Use template registrations in Azure Notification Hubs to send a single notification that renders correctly across iOS, Android, and Windows.

---

If you are sending push notifications to multiple platforms, you quickly run into a problem: each platform has a different payload format. APNs expects a JSON structure with an `aps` key. FCM expects a `notification` object or a `data` object. WNS has its own XML-based format. Without templates, your backend needs to construct a separate payload for each platform and send them individually.

Azure Notification Hubs templates solve this by letting each device register with a platform-specific template. When your backend sends a notification, it just provides the data properties. The service fills in the template for each registered device and sends the correctly formatted payload to each platform. One API call, all platforms covered.

## How Templates Work

The concept is straightforward. Instead of a standard registration that just maps a device token to tags, a template registration also includes a payload template with placeholders. When you send a template notification, you provide values for the placeholders, and the service substitutes them into each device's template.

```mermaid
graph TD
    A[Backend sends: title=Alert, body=CPU high] --> B[Notification Hubs]
    B --> C[iOS Template: aps.alert.title=$(title)]
    B --> D[Android Template: notification.title=$(title)]
    B --> E[Windows Template: toast text=$(title)]
    C --> F[APNs]
    D --> G[FCM]
    E --> H[WNS]
```

## Registering Devices with Templates

On the mobile client side, when registering with the notification hub, you include the template along with the device token and tags.

Here is how you register an Android device with a template.

```javascript
// register-android-template.js - Register an Android device with a template
const { NotificationHubsClient } = require('@azure/notification-hubs');

const connectionString = process.env.NOTIFICATION_HUB_CONNECTION_STRING;
const hubName = 'my-notification-hub';
const client = new NotificationHubsClient(connectionString, hubName);

async function registerAndroidWithTemplate(fcmToken, userId) {
  // The template defines the FCM payload structure with placeholders
  const template = JSON.stringify({
    notification: {
      title: '$(title)',       // Placeholder for the title
      body: '$(body)'         // Placeholder for the body
    },
    data: {
      action: '$(action)',    // Custom data placeholder
      timestamp: '$(timestamp)'
    }
  });

  const registration = await client.createOrUpdateRegistration({
    kind: 'GcmTemplate',
    gcmRegistrationId: fcmToken,
    bodyTemplate: template,
    tags: [`user:${userId}`, 'platform:android'],
    templateName: 'default' // A name to identify this template
  });

  console.log('Template registration ID:', registration.registrationId);
  return registration;
}
```

And here is the iOS equivalent.

```javascript
// register-ios-template.js - Register an iOS device with a template
async function registerIosWithTemplate(deviceToken, userId) {
  // The APNs payload template with the same placeholder names
  const template = JSON.stringify({
    aps: {
      alert: {
        title: '$(title)',
        body: '$(body)'
      },
      sound: 'default',
      badge: '$(badge)'
    },
    action: '$(action)',
    timestamp: '$(timestamp)'
  });

  const registration = await client.createOrUpdateRegistration({
    kind: 'AppleTemplate',
    deviceToken: deviceToken,
    bodyTemplate: template,
    tags: [`user:${userId}`, 'platform:ios'],
    templateName: 'default',
    // Set the APNs headers for the template
    headers: {
      'apns-push-type': 'alert',
      'apns-priority': '10'
    }
  });

  console.log('Template registration ID:', registration.registrationId);
  return registration;
}
```

Notice that both templates use the same placeholder names: `$(title)`, `$(body)`, `$(action)`, and `$(timestamp)`. This is the key. Because the placeholders are shared, a single send call can populate both templates.

## Sending a Template Notification

With template registrations in place, sending a notification is dead simple. You just provide the property values.

```javascript
// send-template.js - Send a cross-platform template notification
async function sendTemplateNotification(title, body, action) {
  const properties = {
    title: title,
    body: body,
    action: action || 'default',
    timestamp: new Date().toISOString(),
    badge: '1'
  };

  // One call sends to all platforms
  const result = await client.sendNotification({
    kind: 'Template',
    body: JSON.stringify(properties)
  });

  console.log('Tracking ID:', result.trackingId);
  return result;
}

// Send to all registered devices across all platforms
sendTemplateNotification(
  'Deployment Complete',
  'Version 2.5.0 has been deployed to production',
  'open_deployments'
);
```

That is it. One API call, and every registered device gets a notification formatted correctly for its platform. The iOS device gets a properly structured APNs payload, and the Android device gets a properly structured FCM payload.

## Targeting Template Notifications with Tags

Template notifications work with the same tag system as regular notifications.

```javascript
// targeted-template.js - Send template notifications to specific audiences
async function notifyUser(userId, title, body) {
  const result = await client.sendNotification(
    {
      kind: 'Template',
      body: JSON.stringify({ title, body, action: 'default', badge: '1', timestamp: new Date().toISOString() })
    },
    { tagExpression: `user:${userId}` }
  );

  return result;
}

// Notify a specific team
async function notifyTeam(teamName, title, body) {
  const result = await client.sendNotification(
    {
      kind: 'Template',
      body: JSON.stringify({ title, body, action: 'default', badge: '0', timestamp: new Date().toISOString() })
    },
    { tagExpression: `team:${teamName}` }
  );

  return result;
}
```

## Multiple Templates per Device

A single device can have multiple template registrations. This is useful when you want different notification types to have different payload structures.

```javascript
// multi-template.js - Register multiple templates for one device
async function registerAlertTemplate(fcmToken, userId) {
  // Alert template with high-priority settings
  const alertTemplate = JSON.stringify({
    notification: {
      title: 'ALERT: $(title)',
      body: '$(body)',
      click_action: 'ALERT_ACTIVITY'
    },
    priority: 'high'
  });

  await client.createOrUpdateRegistration({
    kind: 'GcmTemplate',
    gcmRegistrationId: fcmToken,
    bodyTemplate: alertTemplate,
    tags: [`user:${userId}`, 'type:alert'],
    templateName: 'alert'
  });
}

async function registerInfoTemplate(fcmToken, userId) {
  // Info template with normal priority
  const infoTemplate = JSON.stringify({
    notification: {
      title: '$(title)',
      body: '$(body)'
    },
    data: {
      type: 'info',
      link: '$(link)'
    }
  });

  await client.createOrUpdateRegistration({
    kind: 'GcmTemplate',
    gcmRegistrationId: fcmToken,
    bodyTemplate: infoTemplate,
    tags: [`user:${userId}`, 'type:info'],
    templateName: 'info'
  });
}

// Now you can target different templates using tags
// Send an alert notification
await client.sendNotification(
  { kind: 'Template', body: JSON.stringify({ title: 'CPU Critical', body: '95% usage' }) },
  { tagExpression: 'user:user-123 && type:alert' }
);

// Send an info notification
await client.sendNotification(
  { kind: 'Template', body: JSON.stringify({ title: 'Weekly Report', body: 'Your report is ready', link: '/reports/weekly' }) },
  { tagExpression: 'user:user-123 && type:info' }
);
```

## Template Expressions

Templates support more than simple property substitution. You can use expressions for conditional content and string manipulation.

```javascript
// The template can include conditional expressions
const conditionalTemplate = JSON.stringify({
  aps: {
    alert: {
      title: '$(title)',
      // The body will show the full message or a default if not provided
      body: '$(body)'
    },
    sound: '$(sound)',
    // Badge can be set dynamically
    badge: '$(badge)'
  }
});
```

Keep in mind that the expression language is limited. For complex transformations, do the processing on your backend before sending the notification properties.

## Migrating from Platform-Specific to Template Sends

If you already have a working notification system that sends platform-specific payloads, migrating to templates is straightforward:

1. Define templates that match your current payload structures, but with placeholders for the dynamic parts.
2. Update your device registration code to use template registrations. You can do this gradually by supporting both registration types during the transition.
3. Update your send code to use template sends instead of platform-specific sends.
4. Remove the old platform-specific registration and send code once the migration is complete.

```javascript
// migration-example.js - Before and after comparison

// BEFORE: Platform-specific sends (two separate calls)
async function sendOldWay(title, body) {
  await client.sendNotification({
    kind: 'Gcm',
    body: JSON.stringify({ notification: { title, body } })
  });
  await client.sendNotification({
    kind: 'Apple',
    body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default' } })
  });
}

// AFTER: Template send (one call)
async function sendNewWay(title, body) {
  await client.sendNotification({
    kind: 'Template',
    body: JSON.stringify({ title, body, badge: '1' })
  });
}
```

## Debugging Template Issues

When template notifications are not arriving, check these things:

- **Placeholder names must match exactly.** If your template has `$(title)` but you send `{ heading: 'value' }`, the placeholder will not be substituted.
- **Missing placeholders result in empty strings.** If a required field ends up empty, the platform notification service may reject the payload.
- **Use test sends.** Enable `enableTestSend: true` to get detailed feedback about template expansion and delivery results.
- **Check the template registration.** Use the SDK to list registrations and verify the template content is what you expect.

```javascript
// debug-registrations.js - List registrations to verify templates
async function listRegistrations() {
  const registrations = client.listRegistrations();

  for await (const reg of registrations) {
    console.log('Registration:', reg.registrationId);
    console.log('Kind:', reg.kind);
    console.log('Tags:', reg.tags);
    if (reg.bodyTemplate) {
      console.log('Template:', reg.bodyTemplate);
    }
    console.log('---');
  }
}
```

## Wrapping Up

Templates in Azure Notification Hubs are the right way to handle cross-platform push notifications. Instead of your backend knowing the payload format for every platform, each device registers with its own template, and your backend just sends the data. This simplifies your server code, reduces the number of API calls, and makes it easy to add support for new platforms without changing your notification send logic. Start by defining a common set of placeholder names, register devices with platform-specific templates, and let the service handle the rest.
