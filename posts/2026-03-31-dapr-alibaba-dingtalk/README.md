# How to Use Dapr with Alibaba Cloud DingTalk

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Alibaba, DingTalk, Binding, Notification

Description: Configure the Dapr DingTalk output binding to send notifications and messages to DingTalk group chats from your microservices.

---

## Overview

DingTalk is Alibaba Cloud's enterprise communication platform widely used in Chinese tech organizations. Dapr provides a DingTalk webhook output binding that lets microservices send automated notifications, alerts, and messages to DingTalk groups without embedding DingTalk SDK dependencies in each service.

## Prerequisites

- A DingTalk group with a custom robot webhook configured
- Dapr CLI installed
- Access token and secret from the DingTalk robot configuration

## Setting Up a DingTalk Robot

In the DingTalk desktop or mobile app:
1. Open the group chat settings
2. Go to "Smart Group Assistant" and add a custom robot
3. Choose "Sign" as the security setting
4. Note the Webhook URL and secret

## Configuring the Dapr Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: dingtalk-webhook
  namespace: default
spec:
  type: bindings.dingtalk.webhook
  version: v1
  metadata:
  - name: id
    value: "my-robot"
  - name: url
    value: "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN"
  - name: secret
    value: "YOUR_SIGNING_SECRET"
```

Store the token securely in a Kubernetes secret:

```bash
kubectl create secret generic dingtalk-credentials \
  --from-literal=token=YOUR_ACCESS_TOKEN \
  --from-literal=secret=YOUR_SIGNING_SECRET
```

## Sending Text Messages

```bash
curl -X POST http://localhost:3500/v1.0/bindings/dingtalk-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "msgtype": "text",
      "text": {
        "content": "Alert: Service order-service has high error rate!"
      }
    },
    "operation": "create"
  }'
```

## Sending Markdown Messages

```bash
curl -X POST http://localhost:3500/v1.0/bindings/dingtalk-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "msgtype": "markdown",
      "markdown": {
        "title": "Deployment Alert",
        "text": "## Deployment Complete\n- **Service**: order-service\n- **Version**: v2.1.0\n- **Status**: Success"
      }
    },
    "operation": "create"
  }'
```

## Integration with Dapr Pub/Sub for Alerts

Subscribe to alert events and forward them to DingTalk:

```python
from dapr.clients import DaprClient
import json

def on_alert(event):
    client = DaprClient()
    alert_data = json.loads(event.data)

    message = {
        "msgtype": "markdown",
        "markdown": {
            "title": f"Alert: {alert_data['service']}",
            "text": f"## {alert_data['title']}\n\n{alert_data['message']}\n\n**Severity**: {alert_data['severity']}"
        }
    }

    client.invoke_binding(
        binding_name="dingtalk-webhook",
        operation="create",
        data=json.dumps(message)
    )
```

## Sending Action Cards

For interactive messages with buttons:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/dingtalk-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "msgtype": "actionCard",
      "actionCard": {
        "title": "Production Deployment Approval",
        "text": "Service **payment-service v3.0.0** is ready to deploy.",
        "btnOrientation": "0",
        "btns": [
          {"title": "Approve", "actionURL": "https://ci.example.com/approve/123"},
          {"title": "Reject", "actionURL": "https://ci.example.com/reject/123"}
        ]
      }
    },
    "operation": "create"
  }'
```

## Summary

Dapr's DingTalk webhook binding provides a simple integration point for sending notifications to DingTalk group chats from microservices. By centralizing DingTalk communication through a Dapr binding component, you keep notification logic decoupled from business services and can easily swap or extend notification channels.
