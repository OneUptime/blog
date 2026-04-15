# How to Use Dapr Binding with SendGrid Email Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, SendGrid, Email, Output Binding

Description: Configure a Dapr SendGrid output binding to send transactional emails from your microservices without adding the SendGrid SDK as a dependency.

---

## Overview

The Dapr SendGrid binding allows your application to send emails via SendGrid's transactional email API through a simple Dapr HTTP call. No SendGrid SDK, no API key management in your code - just a component YAML and a POST request to the Dapr sidecar.

## Prerequisites

- SendGrid account with a verified sender email
- SendGrid API key with Mail Send permissions
- Dapr CLI initialized

## Creating a SendGrid API Key

1. Log into SendGrid and navigate to Settings > API Keys
2. Create an API key with "Mail Send" permission
3. Copy the generated key immediately

## Configuring the SendGrid Binding Component

```yaml
# sendgrid-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
  - name: apiKey
    secretKeyRef:
      name: sendgrid-secret
      key: apiKey
```

Create the Kubernetes secret:

```bash
kubectl create secret generic sendgrid-secret \
  --from-literal=apiKey=SG.xxxxxxxxxx
```

For self-hosted mode, create a local secrets file:

```json
{
  "sendgrid-secret": {
    "apiKey": "SG.xxxxxxxxxx"
  }
}
```

And a secret store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets.json"
```

## Sending a Basic Email

```bash
curl -X POST http://localhost:3500/v1.0/bindings/sendgrid \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "metadata": {
      "emailFrom": "noreply@myapp.com",
      "emailFromName": "My App",
      "emailTo": "alice@example.com",
      "emailToName": "Alice",
      "subject": "Welcome to My App!"
    },
    "data": "<h1>Welcome Alice!</h1><p>Your account has been created.</p>"
  }'
```

## Python Examples

```python
import requests
import os

DAPR_HTTP_PORT = os.environ.get("DAPR_HTTP_PORT", "3500")

def send_email(to_email, to_name, subject, html_body,
               from_email="noreply@myapp.com", from_name="My App",
               cc=None, bcc=None):
    """Send an email via Dapr SendGrid binding."""

    metadata = {
        "emailFrom": from_email,
        "emailFromName": from_name,
        "emailTo": to_email,
        "emailToName": to_name,
        "subject": subject,
    }

    if cc:
        metadata["emailCc"] = cc
    if bcc:
        metadata["emailBcc"] = bcc

    payload = {
        "operation": "create",
        "metadata": metadata,
        "data": html_body
    }

    resp = requests.post(
        f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/sendgrid",
        json=payload
    )
    resp.raise_for_status()
    print(f"Email sent to {to_email}")

# Welcome email
send_email(
    to_email="alice@example.com",
    to_name="Alice",
    subject="Welcome to My App!",
    html_body="""
    <h1>Welcome, Alice!</h1>
    <p>Your account has been created successfully.</p>
    <p><a href="https://myapp.com/login">Click here to log in</a></p>
    """
)

# Order confirmation with CC
send_email(
    to_email="bob@example.com",
    to_name="Bob",
    subject="Order Confirmation - ORD-001",
    html_body="""
    <h1>Order Confirmed!</h1>
    <p>Your order ORD-001 for $99.99 has been confirmed.</p>
    <p>Expected delivery: April 3, 2026</p>
    """,
    cc="support@myapp.com"
)

# Password reset email
send_email(
    to_email="carol@example.com",
    to_name="Carol",
    subject="Password Reset Request",
    html_body="""
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="https://myapp.com/reset?token=abc123">Reset Password</a></p>
    <p>This link expires in 30 minutes. If you did not request this, ignore this email.</p>
    """
)
```

## Node.js Example

```javascript
const axios = require('axios');

const DAPR_PORT = process.env.DAPR_HTTP_PORT || 3500;

async function sendEmail({ to, toName, subject, html, from = 'noreply@myapp.com', fromName = 'My App' }) {
  await axios.post(`http://localhost:${DAPR_PORT}/v1.0/bindings/sendgrid`, {
    operation: 'create',
    metadata: {
      emailFrom: from,
      emailFromName: fromName,
      emailTo: to,
      emailToName: toName,
      subject
    },
    data: html
  });
  console.log(`Email sent to ${to}`);
}

// Send order confirmation
await sendEmail({
  to: 'customer@example.com',
  toName: 'Customer',
  subject: 'Order Confirmation',
  html: '<h1>Your order has been confirmed!</h1>'
});
```

## Go Example

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "log"
)

type EmailRequest struct {
    Operation string            `json:"operation"`
    Metadata  map[string]string `json:"metadata"`
    Data      string            `json:"data"`
}

func sendEmail(to, toName, subject, htmlBody string) error {
    req := EmailRequest{
        Operation: "create",
        Metadata: map[string]string{
            "emailFrom":     "noreply@myapp.com",
            "emailFromName": "My App",
            "emailTo":       to,
            "emailToName":   toName,
            "subject":       subject,
        },
        Data: htmlBody,
    }
    body, _ := json.Marshal(req)
    resp, err := http.Post(
        "http://localhost:3500/v1.0/bindings/sendgrid",
        "application/json",
        bytes.NewBuffer(body),
    )
    if err != nil {
        return err
    }
    if resp.StatusCode >= 300 {
        return fmt.Errorf("email send failed with status %d", resp.StatusCode)
    }
    fmt.Printf("Email sent to %s\n", to)
    return nil
}

func main() {
    err := sendEmail(
        "alice@example.com",
        "Alice",
        "Welcome!",
        "<h1>Hello Alice!</h1><p>Welcome to our service.</p>",
    )
    if err != nil {
        log.Fatal(err)
    }
}
```

## Metadata Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| `emailFrom` | Yes | Sender email address (must be verified in SendGrid) |
| `emailFromName` | No | Sender display name |
| `emailTo` | Yes | Recipient email address |
| `emailToName` | No | Recipient display name |
| `subject` | Yes | Email subject |
| `emailCc` | No | CC email address |
| `emailBcc` | No | BCC email address |

## Dynamic Templates

To use SendGrid dynamic templates, set the template ID in metadata:

```python
payload = {
    "operation": "create",
    "metadata": {
        "emailFrom": "noreply@myapp.com",
        "emailTo": "alice@example.com",
        "subject": "Order Confirmed",
        "dynamicTemplateId": "d-xxx",
        "dynamicTemplateData": json.dumps({
            "firstName": "Alice",
            "orderId": "ORD-001",
            "amount": "99.99"
        })
    },
    "data": ""
}
```

## Integrating into Event-Driven Flows

Combine the SendGrid binding with Dapr pub/sub to send emails on events:

```python
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{"pubsubname": "pubsub", "topic": "user-registered", "route": "/send-welcome"}])

@app.route('/send-welcome', methods=['POST'])
def send_welcome():
    event = request.get_json()
    user = event.get("data", {})
    send_email(
        to_email=user["email"],
        to_name=user["name"],
        subject="Welcome!",
        html_body=f"<h1>Hello {user['name']}!</h1>"
    )
    return jsonify({"status": "SUCCESS"})
```

## Summary

The Dapr SendGrid output binding sends transactional emails with a single HTTP call to the Dapr sidecar. Configure the API key in a secret, define the binding component, and call it with recipient, subject, and HTML body metadata. This pattern removes the SendGrid SDK dependency from your application and keeps email-sending consistent with all other Dapr integrations.
