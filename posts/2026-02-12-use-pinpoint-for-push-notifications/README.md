# How to Use Pinpoint for Push Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Pinpoint, Push Notifications, Mobile, Cloud

Description: Learn how to configure Amazon Pinpoint to send push notifications to iOS and Android devices, including channel setup, device registration, and targeted messaging.

---

Push notifications are one of the most effective ways to re-engage mobile users. Amazon Pinpoint handles the complexity of talking to Apple's APNs and Google's FCM, giving you a single API for both platforms. Plus, you get the same segmentation and campaign features that Pinpoint offers for email and SMS.

Let's set up push notifications from scratch.

## Understanding the Architecture

Push notifications involve several moving parts.

```mermaid
graph LR
    A[Your Backend] --> B[Amazon Pinpoint]
    B --> C[APNs - Apple]
    B --> D[FCM - Google]
    C --> E[iOS Device]
    D --> F[Android Device]
    G[Mobile App] --> A
    G -->|Device Token| A
```

Your mobile app registers with APNs or FCM and gets a device token. Your backend sends that token to Pinpoint. When you want to send a notification, Pinpoint talks to APNs or FCM on your behalf.

## Setting Up the APNs Channel (iOS)

For iOS push notifications, you need an APNs authentication key or certificate from your Apple Developer account.

### Using an APNs Key (Recommended)

Apple's authentication keys don't expire and work for all your apps. This is the preferred approach.

1. Go to your Apple Developer account
2. Navigate to Keys and create a new key
3. Enable Apple Push Notifications service (APNs)
4. Download the `.p8` file

Now configure Pinpoint.

```bash
# Enable APNs channel with a token-based key
aws pinpoint update-apns-channel \
  --application-id YOUR_APP_ID \
  --apns-channel-request '{
    "BundleId": "com.yourcompany.yourapp",
    "TeamId": "YOUR_TEAM_ID",
    "TokenKey": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY_CONTENT\n-----END PRIVATE KEY-----",
    "TokenKeyId": "YOUR_KEY_ID",
    "Enabled": true
  }'
```

### Using a Certificate

If you prefer certificates (they expire yearly), export a `.p12` file from Keychain Access.

```python
import boto3
import base64

pinpoint = boto3.client('pinpoint', region_name='us-east-1')

# Read the certificate file
with open('push-cert.p12', 'rb') as f:
    cert_data = base64.b64encode(f.read()).decode('utf-8')

pinpoint.update_apns_channel(
    ApplicationId='YOUR_APP_ID',
    APNSChannelRequest={
        'Certificate': cert_data,
        'PrivateKey': 'YOUR_PRIVATE_KEY',
        'BundleId': 'com.yourcompany.yourapp',
        'Enabled': True
    }
)
```

## Setting Up the FCM Channel (Android)

For Android, you need a Firebase Cloud Messaging server key.

1. Go to the Firebase Console
2. Select your project
3. Navigate to Project Settings, then Cloud Messaging
4. Copy the Server Key (or create a new one)

```bash
# Enable FCM channel
aws pinpoint update-gcm-channel \
  --application-id YOUR_APP_ID \
  --gcm-channel-request '{
    "ApiKey": "YOUR_FCM_SERVER_KEY",
    "Enabled": true
  }'
```

With newer Firebase projects, you'll want to use a service account JSON instead.

```python
pinpoint.update_gcm_channel(
    ApplicationId='YOUR_APP_ID',
    GCMChannelRequest={
        'ApiKey': 'YOUR_FCM_SERVER_KEY',
        'Enabled': True
    }
)
```

## Registering Device Tokens

When a user installs your app and allows notifications, the app receives a device token. Send this token to your backend, which registers it with Pinpoint as an endpoint.

```python
import boto3

pinpoint = boto3.client('pinpoint', region_name='us-east-1')
APP_ID = 'YOUR_APP_ID'

def register_device(user_id, device_token, platform):
    """Register a device token with Pinpoint."""
    # Platform should be 'APNS' for iOS or 'GCM' for Android
    channel_type = 'APNS' if platform == 'ios' else 'GCM'

    pinpoint.update_endpoint(
        ApplicationId=APP_ID,
        EndpointId=device_token,  # Use token as endpoint ID for uniqueness
        EndpointRequest={
            'Address': device_token,
            'ChannelType': channel_type,
            'User': {
                'UserId': user_id
            },
            'Attributes': {
                'Platform': [platform]
            }
        }
    )
    print(f"Registered {platform} device for user {user_id}")

# Called from your API when the app sends the device token
register_device('user-123', 'device-token-abc', 'ios')
register_device('user-456', 'device-token-def', 'android')
```

## Sending a Direct Push Notification

To send a notification to a specific user immediately, use the `send_messages` API.

```python
def send_push_notification(user_id, title, body, data=None):
    """Send a push notification to all of a user's devices."""

    message = {
        'Action': 'OPEN_APP',
        'Title': title,
        'Body': body,
        'SilentPush': False
    }

    # Add custom data payload
    if data:
        message['Data'] = data

    response = pinpoint.send_users_messages(
        ApplicationId=APP_ID,
        SendUsersMessageRequest={
            'Users': {
                user_id: {}
            },
            'MessageConfiguration': {
                'APNSMessage': {
                    **message,
                    'Sound': 'default',
                    'Badge': 1
                },
                'GCMMessage': {
                    **message,
                    'Sound': 'default',
                    'Priority': 'high'
                }
            }
        }
    )

    # Check results
    result = response['SendUsersMessageResponse']['Result']
    for uid, endpoints in result.items():
        for endpoint_id, delivery in endpoints.items():
            status = delivery['StatusCode']
            print(f"User {uid}, endpoint {endpoint_id}: {status}")

    return response

# Send a notification
send_push_notification(
    'user-123',
    'New Message',
    'You have a new message from Alice',
    data={'messageId': '789', 'screen': 'chat'}
)
```

## Sending to a Segment

For campaigns targeting groups of users, create a segment first and then send to it.

```python
def create_push_campaign(app_id, name, segment_id, title, body):
    """Create a push notification campaign."""
    response = pinpoint.create_campaign(
        ApplicationId=app_id,
        WriteCampaignRequest={
            'Name': name,
            'SegmentId': segment_id,
            'MessageConfiguration': {
                'APNSMessage': {
                    'Action': 'OPEN_APP',
                    'Title': title,
                    'Body': body,
                    'Sound': 'default'
                },
                'GCMMessage': {
                    'Action': 'OPEN_APP',
                    'Title': title,
                    'Body': body,
                    'Sound': 'default',
                    'Priority': 'high'
                }
            },
            'Schedule': {
                'StartTime': 'IMMEDIATE'
            }
        }
    )

    campaign_id = response['CampaignResponse']['Id']
    print(f"Push campaign created: {campaign_id}")
    return campaign_id
```

## Handling Rich Push Notifications

Rich notifications can include images, buttons, and custom layouts. Here's how to configure them for both platforms.

```python
def send_rich_push(user_id, title, body, image_url, actions):
    """Send a rich push notification with image and action buttons."""

    response = pinpoint.send_users_messages(
        ApplicationId=APP_ID,
        SendUsersMessageRequest={
            'Users': {user_id: {}},
            'MessageConfiguration': {
                'APNSMessage': {
                    'Action': 'URL',
                    'Title': title,
                    'Body': body,
                    'MediaUrl': image_url,
                    'Sound': 'default',
                    'Category': 'ACTIONABLE',  # Matches your UNNotificationCategory
                    'Data': {
                        'url': actions.get('url', ''),
                        'action_type': actions.get('type', 'open_app')
                    }
                },
                'GCMMessage': {
                    'Action': 'URL',
                    'Title': title,
                    'Body': body,
                    'ImageUrl': image_url,
                    'Sound': 'default',
                    'Priority': 'high',
                    'Data': {
                        'url': actions.get('url', ''),
                        'action_type': actions.get('type', 'open_app')
                    }
                }
            }
        }
    )
    return response

# Send a rich notification
send_rich_push(
    'user-123',
    'Flash Sale!',
    '50% off all premium plans. Tap to learn more.',
    'https://yourdomain.com/images/sale-banner.jpg',
    {'type': 'deep_link', 'url': 'myapp://promotions/flash-sale'}
)
```

## Silent Push Notifications

Silent notifications wake up your app in the background without showing anything to the user. They're useful for triggering content updates, syncing data, or refreshing state.

```python
def send_silent_push(user_id, data):
    """Send a silent push to trigger background processing."""
    response = pinpoint.send_users_messages(
        ApplicationId=APP_ID,
        SendUsersMessageRequest={
            'Users': {user_id: {}},
            'MessageConfiguration': {
                'APNSMessage': {
                    'SilentPush': True,
                    'Data': data
                },
                'GCMMessage': {
                    'SilentPush': True,
                    'Data': data,
                    'Priority': 'normal'  # Use normal priority for silent
                }
            }
        }
    )
    return response

# Trigger a background sync
send_silent_push('user-123', {'action': 'sync', 'resource': 'messages'})
```

## Tracking Engagement

Pinpoint automatically tracks push notification delivery and engagement. You can view analytics in the Pinpoint console or query them via the API.

```python
def get_push_metrics(app_id):
    """Get push notification engagement metrics."""
    response = pinpoint.get_application_date_range_kpi(
        ApplicationId=app_id,
        KpiName='push-open-rate',
        StartTime='2026-02-01T00:00:00Z',
        EndTime='2026-02-12T00:00:00Z'
    )

    for row in response['ApplicationDateRangeKpiResponse']['KpiResult']['Rows']:
        print(row)
```

## Best Practices

1. **Always handle token expiration.** Devices get new tokens when the OS updates or the app is reinstalled. Update endpoints when you receive new tokens.
2. **Don't spam.** Push notification fatigue is real. Users will disable notifications or uninstall your app if you send too many.
3. **Use segments wisely.** Target notifications to users who will find them relevant.
4. **Test on both platforms.** iOS and Android handle notifications differently. What works on one might not look right on the other.
5. **Include a clear call to action.** Every notification should give the user a reason to tap.

For email campaigns alongside push notifications, see our guide on [using Pinpoint for email campaigns](https://oneuptime.com/blog/post/2026-02-12-use-pinpoint-for-email-campaigns/view).

## Summary

Amazon Pinpoint provides a unified platform for push notifications across iOS and Android. Once you've configured your APNs and FCM channels, sending notifications is just API calls. The real power comes from combining push with Pinpoint's segmentation and campaign features - targeting the right users with the right message at the right time. Start simple, measure engagement, and iterate.
