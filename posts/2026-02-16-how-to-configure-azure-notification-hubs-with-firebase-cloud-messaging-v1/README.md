# How to Configure Azure Notification Hubs with Firebase Cloud Messaging v1

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Notification Hubs, Firebase, FCM v1, Android, Push Notifications, Migration

Description: Configure Azure Notification Hubs to work with the Firebase Cloud Messaging v1 API for sending push notifications to Android devices.

---

Google deprecated the legacy FCM HTTP API and moved to the FCM v1 API. This matters for anyone using Azure Notification Hubs to send push notifications to Android devices because the authentication method and payload format are different. The legacy API used a simple server key, while FCM v1 uses OAuth 2.0 with a service account. If you have not migrated yet, now is the time.

In this post, I will walk through configuring Azure Notification Hubs to work with FCM v1, including setting up the Firebase service account, updating your notification hub configuration, and adjusting your notification payloads.

## What Changed with FCM v1

The main differences between the legacy FCM API and v1 are:

- **Authentication**: Legacy used a static server key. V1 uses OAuth 2.0 bearer tokens generated from a Google service account.
- **Endpoint**: Legacy used `https://fcm.googleapis.com/fcm/send`. V1 uses `https://fcm.googleapis.com/v1/projects/{project-id}/messages:send`.
- **Payload structure**: V1 has a more structured payload format with platform-specific overrides.
- **Per-platform customization**: V1 allows you to customize the notification for Android, iOS (via FCM), and web in a single request.

## Step 1: Create a Firebase Service Account

You need a service account JSON file from your Firebase project.

1. Go to the Firebase Console and select your project.
2. Navigate to Project Settings (the gear icon).
3. Click on the "Service accounts" tab.
4. Click "Generate new private key."
5. Save the downloaded JSON file securely.

The JSON file looks something like this (with actual values):

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

Do not commit this file to version control. Store it in Azure Key Vault or a similar secret management system.

## Step 2: Configure the Notification Hub for FCM v1

Update your notification hub to use FCM v1 credentials instead of the legacy server key.

### Using the Azure Portal

1. Open your notification hub in the Azure portal.
2. Go to Settings and then Platform notification settings (or "Google (GCM/FCM)").
3. Switch to the "FCM v1" option.
4. Paste the contents of your service account JSON file.
5. Save the configuration.

### Using the Azure CLI

```bash
# Update the notification hub with FCM v1 credentials
az notification-hub credential gcm update \
  --notification-hub-name my-notification-hub \
  --namespace-name my-notification-ns \
  --resource-group rg-notifications \
  --google-api-key @service-account.json
```

### Using the REST API

If you need to automate this, you can use the Azure REST API directly.

```javascript
// update-fcm-config.js - Programmatically update FCM v1 credentials
const { DefaultAzureCredential } = require('@azure/identity');
const { NotificationHubsManagementClient } = require('@azure/arm-notificationhubs');

async function updateFcmV1Config(serviceAccountJson) {
  const credential = new DefaultAzureCredential();
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;

  const mgmtClient = new NotificationHubsManagementClient(credential, subscriptionId);

  // Update the notification hub with FCM v1 credentials
  await mgmtClient.notificationHubs.createOrUpdate(
    'rg-notifications',          // resource group
    'my-notification-ns',         // namespace
    'my-notification-hub',        // hub name
    {
      location: 'eastus',
      gcmCredential: {
        // For FCM v1, provide the service account JSON
        googleApiKey: JSON.stringify(serviceAccountJson),
        gcmEndpoint: 'https://fcm.googleapis.com/fcm/send' // This is still used as a reference
      }
    }
  );

  console.log('FCM v1 credentials updated');
}
```

## Step 3: Update Your Notification Payloads

The FCM v1 payload format is different from the legacy format. Here is how to send notifications with the new structure.

```javascript
// send-fcm-v1.js - Send notifications using FCM v1 payload format
const { NotificationHubsClient } = require('@azure/notification-hubs');

const client = new NotificationHubsClient(
  process.env.NOTIFICATION_HUB_CONNECTION_STRING,
  'my-notification-hub'
);

// FCM v1 payload format
async function sendAndroidNotification(title, body, data) {
  const payload = {
    message: {
      notification: {
        title: title,
        body: body
      },
      android: {
        // Android-specific customization
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#4285F4',
          click_action: 'OPEN_ACTIVITY',
          channel_id: 'default'
        }
      },
      data: data || {}
    }
  };

  const result = await client.sendNotification(
    {
      kind: 'FcmV1',
      body: JSON.stringify(payload)
    }
  );

  console.log('Sent FCM v1 notification:', result.trackingId);
  return result;
}

// Send with custom data
sendAndroidNotification(
  'New Message',
  'You have a new message from Alice',
  {
    conversationId: 'conv-456',
    senderId: 'user-alice',
    messageType: 'text'
  }
);
```

## Migrating Existing Registrations

If you have existing device registrations using the legacy GCM/FCM format, you do not need to re-register all devices. The device tokens (registration IDs) are the same for both the legacy and v1 APIs. What changes is how your server authenticates with FCM and the payload format.

However, if you are using template registrations, you may need to update the templates to match the v1 payload structure.

```javascript
// migrate-templates.js - Update templates from legacy to v1 format
async function migrateTemplates() {
  const registrations = client.listRegistrations();

  for await (const reg of registrations) {
    if (reg.kind === 'GcmTemplate') {
      // Check if the template uses the legacy format
      const template = JSON.parse(reg.bodyTemplate);

      if (!template.message) {
        // Legacy format - needs migration
        const v1Template = {
          message: {
            notification: template.notification,
            data: template.data
          }
        };

        // Update the registration with the v1 template
        reg.bodyTemplate = JSON.stringify(v1Template);
        await client.createOrUpdateRegistration(reg);
        console.log(`Migrated template for registration ${reg.registrationId}`);
      }
    }
  }
}
```

## Handling the Transition Period

During migration, you might have a mix of devices registered with legacy templates and v1 templates. Here is a strategy for handling this gracefully.

```javascript
// dual-send.js - Send to both legacy and v1 registrations during migration
async function sendDualFormat(title, body, tagExpression) {
  // Send using FCM v1 format for updated registrations
  try {
    await client.sendNotification(
      {
        kind: 'FcmV1',
        body: JSON.stringify({
          message: {
            notification: { title, body }
          }
        })
      },
      { tagExpression: `${tagExpression} && fcm:v1` }
    );
  } catch (err) {
    console.error('FCM v1 send failed:', err.message);
  }

  // Send using legacy format for devices not yet migrated
  try {
    await client.sendNotification(
      {
        kind: 'Gcm',
        body: JSON.stringify({
          notification: { title, body }
        })
      },
      { tagExpression: `${tagExpression} && !fcm:v1` }
    );
  } catch (err) {
    console.error('Legacy FCM send failed:', err.message);
  }
}
```

Add a `fcm:v1` tag to devices as they update their registration to the v1 format. Once all devices have migrated, you can remove the legacy send path.

## Testing the Configuration

After updating your configuration, test that notifications are being delivered correctly.

```javascript
// test-fcm-v1.js - Test FCM v1 configuration
async function testFcmV1() {
  const result = await client.sendNotification(
    {
      kind: 'FcmV1',
      body: JSON.stringify({
        message: {
          notification: {
            title: 'FCM v1 Test',
            body: 'If you see this, FCM v1 is working!'
          }
        }
      })
    },
    { enableTestSend: true } // Use test send for detailed feedback
  );

  console.log('Test result:', JSON.stringify(result, null, 2));
}

testFcmV1().catch(console.error);
```

Test sends return detailed information about the delivery attempt, including whether the FCM v1 endpoint accepted or rejected the message.

## Common Migration Issues

**Invalid service account JSON.** Make sure you are using the complete JSON file downloaded from Firebase, not just the private key. The entire file is needed for authentication.

**Permission errors.** The service account needs the `cloudmessaging.messages.create` permission. This is included in the "Firebase Cloud Messaging API Admin" role, which is typically assigned automatically when you generate the key.

**Payload format mismatch.** The v1 format wraps everything in a `message` object. If you forget this wrapper, FCM will reject the payload. Double-check that your JSON starts with `{"message": {...}}`.

**Token refresh.** FCM v1 uses short-lived OAuth tokens that Azure Notification Hubs manages internally. If you see authentication errors after a long period of inactivity, ensure your service account credentials are still valid in the Firebase Console.

## Wrapping Up

Migrating from the legacy FCM API to FCM v1 in Azure Notification Hubs is primarily a configuration change. You update the credentials from a server key to a service account JSON, adjust your payload format to use the v1 structure, and optionally update your template registrations. The device tokens remain the same, so you do not need to re-register devices. Get the service account set up, test with a small group of devices, and then roll out the change across your fleet.
