# How to Build a Multi-Channel Notification System with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Notification, Pub/Sub, Email, SMS

Description: Build a scalable multi-channel notification system with Dapr pub/sub to deliver email, SMS, push, and webhook notifications from a single event-driven architecture.

---

## Multi-Channel Notification Architecture

A notification system receives events from multiple upstream services and delivers them through appropriate channels (email, SMS, push, Slack, webhooks) based on user preferences and notification type.

With Dapr, each channel becomes a dedicated subscriber that reads from a shared pub/sub topic, enabling independent scaling and channel-specific retry policies.

```text
Order Service --> [pubsub: notifications] --> Email Service
                                           --> SMS Service
                                           --> Push Service
                                           --> Webhook Service
```

## Notification Publisher

```python
# publisher.py - Any service publishes to the notifications topic
from dapr.clients import DaprClient
import json

class NotificationPublisher:
    def __init__(self):
        self.client = DaprClient()
        self.pubsub = "pubsub"
        self.topic = "notifications"

    def send(self, notification: dict):
        """
        notification = {
          "notificationId": "uuid",
          "userId": "user-123",
          "type": "order_confirmation",
          "channels": ["email", "sms"],
          "priority": "high",
          "data": { "orderId": "...", "amount": 99.99 }
        }
        """
        self.client.publish_event(
            self.pubsub, self.topic,
            json.dumps(notification),
            data_content_type="application/json"
        )

    def send_bulk(self, notifications: list):
        for n in notifications:
            self.send(n)
```

## User Preferences Service

```javascript
// preferences-service.js
const { DaprClient } = require('@dapr/dapr');
const express = require('express');

const app = express();
const client = new DaprClient();
app.use(express.json());

// Get notification channels for a user
app.get('/api/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  const prefs = await client.state.get('statestore', `prefs-${userId}`);

  const defaults = {
    email: true, sms: false, push: true, webhook: false,
    doNotDisturb: { enabled: false }
  };

  res.json(prefs || defaults);
});

// Update user preferences
app.put('/api/preferences/:userId', async (req, res) => {
  const { userId } = req.params;
  await client.state.save('statestore', [
    { key: `prefs-${userId}`, value: req.body }
  ]);
  res.json({ updated: true });
});

app.listen(8080);
```

## Email Notification Service

```csharp
// Email subscriber
[Topic("pubsub", "notifications", "event.type == 'order_confirmation' || event.type == 'password_reset'", 1)]
[HttpPost("notifications/email")]
public async Task<IActionResult> HandleEmailNotification(
    [FromBody] CloudEvent<Notification> cloudEvent)
{
    var notification = cloudEvent.Data!;

    // Get user preferences
    var prefs = await _dapr.InvokeMethodAsync<UserPreferences>(
        HttpMethod.Get,
        "preferences-service",
        $"api/preferences/{notification.UserId}");

    if (!prefs.Email)
    {
        _logger.LogInformation("Email notifications disabled for user {UserId}",
            notification.UserId);
        return Ok(); // Acknowledge without sending
    }

    // Get template and render
    var template = GetEmailTemplate(notification.Type);
    var body = RenderTemplate(template, notification.Data);

    await _emailService.SendAsync(new EmailMessage
    {
        To = notification.UserEmail,
        Subject = template.Subject,
        Body = body
    });

    return Ok();
}
```

## SMS Service with Retry

```yaml
# SMS resiliency policy
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: sms-resiliency
spec:
  policies:
    retries:
      smsRetry:
        policy: exponential
        maxRetries: 5
        maxInterval: 30s
  targets:
    components:
      pubsub:
        inbound:
          retry: smsRetry
```

```go
// sms-service.go subscriber
func handleSMSNotification(ctx context.Context, e *daprd.TopicEvent) (bool, error) {
    var notification map[string]interface{}
    json.Unmarshal(e.RawData, &notification)

    userId := notification["userId"].(string)
    channels := notification["channels"].([]interface{})

    // Check if SMS is requested
    smsRequired := false
    for _, ch := range channels {
        if ch.(string) == "sms" {
            smsRequired = true
            break
        }
    }

    if !smsRequired {
        return false, nil // no retry needed
    }

    phone := getUserPhone(userId)
    message := formatSMS(notification)

    err := sendSMS(phone, message)
    if err != nil {
        return true, err // retry = true
    }
    return false, nil
}
```

## Webhook Delivery Service

```python
# webhook_service.py
import json
import httpx
from fastapi import FastAPI
from dapr.clients import DaprClient
from dapr.ext.fastapi import DaprApp

app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="pubsub", topic="notifications",
                    metadata={"rawPayload": "false"})
async def deliver_webhook(event: dict):
    data = event.get("data", {})
    user_id = data.get("userId")

    # Get webhook URL from user config
    with DaprClient() as client:
        config = client.get_state("statestore", f"webhook-config-{user_id}")

    if not config.data:
        return {"status": "SUCCESS"}

    webhook_url = json.loads(config.data).get("url")
    async with httpx.AsyncClient(timeout=10.0) as http:
        response = await http.post(webhook_url, json=data,
                                   headers={"X-Notification-ID": event.get("id", "")})
        response.raise_for_status()

    return {"status": "SUCCESS"}
```

## Summary

A Dapr-based multi-channel notification system uses pub/sub with topic filters to route notifications to channel-specific subscriber services. Each channel (email, SMS, push, webhook) operates independently with its own resiliency policy and scaling configuration. User preferences are retrieved via service invocation to determine which channels are active per user, and Dapr's CloudEvents envelope provides the notification metadata (ID, type, timestamp) needed for deduplication and audit trails.
