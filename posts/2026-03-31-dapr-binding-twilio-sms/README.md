# How to Configure Dapr Binding with Twilio SMS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Twilio, SMS, Notification

Description: Configure the Dapr Twilio SMS output binding to send SMS messages from your microservices using your Twilio account SID and auth token without the Twilio SDK.

---

## Overview

The Dapr Twilio SMS binding is an output-only binding that enables your microservices to send SMS messages through the Twilio API. This is useful for sending order confirmations, alerts, OTP codes, and other notifications.

```mermaid
flowchart LR
    App[Microservice] -->|POST /v1.0/bindings/twilio-sms| Sidecar[Dapr Sidecar]
    Sidecar -->|HTTPS REST API| Twilio[Twilio API]
    Twilio -->|SMS| Phone[Mobile Phone]
```

## Prerequisites

- A Twilio account (sign up at twilio.com)
- Twilio Account SID and Auth Token
- A Twilio phone number capable of SMS
- Dapr CLI installed and initialized

## Get Twilio Credentials

Log in to the Twilio console and note:
- **Account SID** (starts with `AC`)
- **Auth Token**
- **Phone Number** (format: `+15551234567`)

## Kubernetes Secret

```bash
kubectl create secret generic twilio-secret \
  --from-literal=accountSid=AC_YOUR_ACCOUNT_SID \
  --from-literal=authToken=YOUR_AUTH_TOKEN \
  --namespace default
```

## Component Configuration

```yaml
# binding-twilio-sms.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: twilio-sms
  namespace: default
spec:
  type: bindings.twilio.sms
  version: v1
  metadata:
  - name: accountSid
    secretKeyRef:
      name: twilio-secret
      key: accountSid
  - name: authToken
    secretKeyRef:
      name: twilio-secret
      key: authToken
  - name: fromNumber
    value: "+15551234567"
  - name: toNumber
    value: "+15559876543"
```

The `toNumber` can also be set per-request in the metadata at runtime, overriding the component default.

Apply:

```bash
# Self-hosted
cp binding-twilio-sms.yaml ~/.dapr/components/

# Kubernetes
kubectl apply -f binding-twilio-sms.yaml
```

## Sending an SMS

```bash
# Send a fixed message
curl -X POST http://localhost:3500/v1.0/bindings/twilio-sms \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Your order ORD-001 has been shipped and will arrive tomorrow.",
    "operation": "create"
  }'
```

To override the recipient number per request:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/twilio-sms \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Your OTP code is 847293. It expires in 5 minutes.",
    "operation": "create",
    "metadata": {
      "toNumber": "+15550001111"
    }
  }'
```

## Python Application: Order Notification Service

```python
# notification_service.py
import requests
import json
from flask import Flask, request, jsonify

app = Flask(__name__)
DAPR_HTTP_PORT = 3500

def send_sms(to_number: str, message: str):
    """Send an SMS via Dapr Twilio binding."""
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/twilio-sms"
    payload = {
        "data": message,
        "operation": "create",
        "metadata": {
            "toNumber": to_number
        }
    }
    response = requests.post(url, json=payload)
    response.raise_for_status()
    print(f"SMS sent to {to_number}: {message[:50]}...")

@app.route('/order-shipped', methods=['POST'])
def order_shipped():
    """Handle order-shipped events and notify the customer."""
    data = request.get_json()
    order_id = data.get('orderId')
    customer_phone = data.get('customerPhone')
    tracking_number = data.get('trackingNumber', 'N/A')

    message = (
        f"Your order {order_id} has shipped! "
        f"Tracking: {tracking_number}. "
        f"Reply STOP to unsubscribe."
    )

    send_sms(customer_phone, message)
    return jsonify({"status": "notification_sent"})

@app.route('/send-otp', methods=['POST'])
def send_otp():
    """Send a one-time password via SMS."""
    data = request.get_json()
    phone = data.get('phone')
    otp = data.get('otp')

    message = f"Your verification code is {otp}. Valid for 5 minutes. Do not share this code."
    send_sms(phone, message)
    return jsonify({"status": "otp_sent"})

@app.route('/alert-admin', methods=['POST'])
def alert_admin():
    """Send an operational alert to admin phone."""
    data = request.get_json()
    alert_message = data.get('message', 'System alert')
    admin_phone = "+15550001111"

    send_sms(admin_phone, f"ALERT: {alert_message}")
    return jsonify({"status": "alert_sent"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
```

## Go Example: Sending SMS

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func sendSMS(ctx context.Context, client dapr.Client, toNumber, message string) error {
    in := &dapr.InvokeBindingRequest{
        Name:      "twilio-sms",
        Operation: "create",
        Data:      []byte(message),
        Metadata: map[string]string{
            "toNumber": toNumber,
        },
    }
    _, err := client.InvokeBinding(ctx, in)
    return err
}

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatalf("failed to create dapr client: %v", err)
    }
    defer client.Close()

    ctx := context.Background()
    if err := sendSMS(ctx, client, "+15559876543", "Hello from Dapr! Your order is ready."); err != nil {
        log.Fatalf("failed to send SMS: %v", err)
    }
    fmt.Println("SMS sent successfully")
}
```

## Running Locally

```bash
dapr run \
  --app-id notification-service \
  --app-port 5001 \
  --dapr-http-port 3500 \
  --components-path ~/.dapr/components \
  -- python notification_service.py
```

## Testing

```bash
# Test order shipped notification
curl -X POST http://localhost:5001/order-shipped \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-12345",
    "customerPhone": "+15559876543",
    "trackingNumber": "1Z999AA1012345678"
  }'

# Test OTP
curl -X POST http://localhost:5001/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+15559876543", "otp": "847293"}'
```

## Summary

The Dapr Twilio SMS binding is an output-only component that sends SMS messages via the Twilio REST API. Set the Account SID, Auth Token, and from number in the component YAML. Override the `toNumber` per request in the metadata to send to dynamic recipients. The binding removes the Twilio SDK dependency from your application and centralizes credential management in Kubernetes secrets.
