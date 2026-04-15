# How to Use Dapr Apple Push Notification Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Push Notification, IOS, APNs

Description: Learn how to configure the Dapr Apple Push Notification Service binding to send push notifications to iOS devices from any microservice.

---

## Overview of the Dapr APNs Binding

The Dapr Apple Push Notification Service (APNs) binding lets you send push notifications to iOS, iPadOS, macOS, and watchOS devices from any service in your architecture. The binding handles APNs JWT authentication and HTTP/2 connection management.

## Prerequisites

You need an Apple Developer account with:
- An APNs authentication key (`.p8` file)
- Your Team ID
- Your App Bundle ID

## Configure the APNs Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: apns-binding
spec:
  type: bindings.apns
  version: v1
  metadata:
  - name: development
    value: "true"   # false for production APNs endpoint
  - name: private-key
    secretKeyRef:
      name: apns-secret
      key: private-key
  - name: key-id
    secretKeyRef:
      name: apns-secret
      key: key-id
  - name: team-id
    secretKeyRef:
      name: apns-secret
      key: team-id
```

## Create the Kubernetes Secret

```bash
kubectl create secret generic apns-secret \
  --from-literal=key-id=ABCDE12345 \
  --from-literal=team-id=TEAMID1234 \
  --from-file=private-key=./AuthKey_ABCDE12345.p8
```

## Send a Simple Push Notification

```bash
curl -X POST http://localhost:3500/v1.0/bindings/apns-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "aps": {
        "alert": {
          "title": "Order Shipped",
          "body": "Your order #1001 is on its way!"
        },
        "badge": 1,
        "sound": "default"
      }
    },
    "metadata": {
      "device-token": "device-push-token-here",
      "apns-topic": "com.example.myapp"
    }
  }'
```

## Send a Silent Background Notification

```bash
curl -X POST http://localhost:3500/v1.0/bindings/apns-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "aps": {
        "content-available": 1
      },
      "dataType": "inventory-update",
      "newCount": 5
    },
    "metadata": {
      "device-token": "device-push-token-here",
      "apns-topic": "com.example.myapp",
      "apns-push-type": "background",
      "apns-priority": "5"
    }
  }'
```

## Application Code for Sending Notifications

```python
import requests

def send_push_notification(device_token: str, title: str, body: str, badge: int = 0):
    payload = {
        "operation": "create",
        "data": {
            "aps": {
                "alert": {
                    "title": title,
                    "body": body,
                },
                "badge": badge,
                "sound": "default",
            }
        },
        "metadata": {
            "device-token": device_token,
            "apns-topic": "com.example.myapp",
            "apns-push-type": "alert",
            "apns-priority": "10",
        },
    }
    response = requests.post(
        "http://localhost:3500/v1.0/bindings/apns-binding",
        json=payload,
    )
    return response.status_code == 200
```

## Switch Between Sandbox and Production

Change the `development` field to switch between APNs environments:

```yaml
- name: development
  value: "false"  # Use production APNs endpoint
```

The development endpoint is `api.sandbox.push.apple.com`; production uses `api.push.apple.com`.

## Summary

The Dapr APNs binding simplifies sending iOS push notifications by handling APNs authentication and connection management. Configure the binding with your Apple Developer credentials via Kubernetes secrets, then invoke it with the device token, notification payload, and APNs metadata headers to reach your users' devices.
