# How to Implement Notification Fan-Out with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Notification, Fan-Out, Messaging

Description: Learn how to implement notification fan-out using Dapr pub/sub to deliver a single event to multiple notification channels - email, SMS, push, and Slack simultaneously.

---

## What Is Notification Fan-Out?

Fan-out sends one event to multiple independent consumers in parallel. For notifications, this means a single `user.alert` event can simultaneously trigger an email, an SMS, a push notification, and a Slack message - without any of these channels knowing about each other.

## Configure Pub/Sub

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: notify-pubsub
  namespace: production
spec:
  type: pubsub.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
```

## Publishing a Notification Event

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function sendAlertToUser(userId, alert) {
  await client.pubsub.publish('notify-pubsub', 'user.alert', {
    userId,
    title: alert.title,
    body: alert.body,
    severity: alert.severity,   // 'info' | 'warning' | 'critical'
    link: alert.link,
    triggeredAt: new Date().toISOString()
  });
}
```

## Email Channel Consumer

```javascript
const { DaprServer } = require('@dapr/dapr');
const emailServer = new DaprServer({ serverPort: '3001' });

await emailServer.pubsub.subscribe('notify-pubsub', 'user.alert', async (event) => {
  const user = await getUserById(event.userId);
  if (!user.preferences.email) return;

  await emailService.send({
    to: user.email,
    subject: `[${event.severity.toUpperCase()}] ${event.title}`,
    html: `<p>${event.body}</p><a href="${event.link}">View details</a>`
  });
});

await emailServer.start();
```

## SMS Channel Consumer

```javascript
const smsServer = new DaprServer({ serverPort: '3002' });

await smsServer.pubsub.subscribe('notify-pubsub', 'user.alert', async (event) => {
  const user = await getUserById(event.userId);
  if (!user.preferences.sms || event.severity !== 'critical') return;

  await twilioClient.messages.create({
    to: user.phone,
    from: process.env.TWILIO_FROM,
    body: `ALERT: ${event.title} - ${event.body.slice(0, 100)}`
  });
});

await smsServer.start();
```

## Push Notification Consumer

```javascript
const pushServer = new DaprServer({ serverPort: '3003' });

await pushServer.pubsub.subscribe('notify-pubsub', 'user.alert', async (event) => {
  const devices = await getDeviceTokens(event.userId);

  await Promise.all(devices.map(device =>
    firebaseAdmin.messaging().send({
      token: device.token,
      notification: {
        title: event.title,
        body: event.body
      },
      data: { link: event.link, severity: event.severity }
    })
  ));
});

await pushServer.start();
```

## Slack Consumer

```javascript
const slackServer = new DaprServer({ serverPort: '3004' });

await slackServer.pubsub.subscribe('notify-pubsub', 'user.alert', async (event) => {
  const user = await getUserById(event.userId);
  if (!user.slackUserId) return;

  await slackClient.chat.postMessage({
    channel: user.slackUserId,
    text: `*${event.title}*\n${event.body}`,
    attachments: [{ color: event.severity === 'critical' ? 'danger' : 'warning' }]
  });
});

await slackServer.start();
```

## Controlling Fan-Out with Consumer Groups

Each channel service uses a different Dapr app ID, so Dapr creates independent consumer group subscriptions - all four get every message:

```yaml
# email-service deployment
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "email-notification-service"

# sms-service deployment
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "sms-notification-service"

# push-service deployment
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "push-notification-service"

# slack-service deployment
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "slack-notification-service"
```

## Summary

Dapr pub/sub fan-out eliminates notification coupling by letting each channel service independently subscribe to the same event stream. Adding a new notification channel requires no changes to the publisher or other consumers - just deploy a new subscriber and annotate it with a unique app ID.
