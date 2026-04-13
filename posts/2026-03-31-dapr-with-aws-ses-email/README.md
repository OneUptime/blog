# How to Use Dapr with AWS SES for Email

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SES, Email, Binding

Description: Use the Dapr AWS SES output binding to send transactional and notification emails from microservices without embedding AWS SDK code in your application.

---

AWS Simple Email Service (SES) is a cost-effective email delivery service. Dapr's SES output binding lets any service send emails through a uniform binding API, abstracting away AWS SDK calls and credential management.

## Verify Sender Email in SES

```bash
# Verify sender email address (required for SES sandbox)
aws ses verify-email-identity \
  --email-address noreply@example.com \
  --region us-east-1

# Check verification status
aws ses get-identity-verification-attributes \
  --identities noreply@example.com \
  --region us-east-1
```

## Configure the Dapr SES Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: email-binding
  namespace: default
spec:
  type: bindings.aws.ses
  version: v1
  metadata:
  - name: region
    value: us-east-1
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: emailFrom
    value: noreply@example.com
```

## Send a Plain Text Email

```python
import requests

def send_email(to: str, subject: str, body: str):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/email-binding",
        json={
            "operation": "create",
            "data": body,
            "metadata": {
                "emailTo": to,
                "subject": subject
            }
        }
    )
    resp.raise_for_status()
    print(f"Email sent to {to}")

send_email(
    to="customer@example.com",
    subject="Your order has been confirmed",
    body="Thank you for your order. Your order ID is ORD-001."
)
```

## Send an HTML Email

The `data` field in the binding request is used as the HTML body of the email.

```python
def send_html_email(to: str, subject: str, html_body: str):
    resp = requests.post(
        "http://localhost:3500/v1.0/bindings/email-binding",
        json={
            "operation": "create",
            "data": html_body,
            "metadata": {
                "emailTo": to,
                "subject": subject
            }
        }
    )
    resp.raise_for_status()

html = """
<html>
  <body>
    <h1>Order Confirmed</h1>
    <p>Your order <strong>ORD-001</strong> has been placed successfully.</p>
    <p>Total: <strong>$99.99</strong></p>
  </body>
</html>
"""

send_html_email(
    to="customer@example.com",
    subject="Order Confirmation - ORD-001",
    html_body=html
)
```

## Send Email with CC and BCC

```python
requests.post(
    "http://localhost:3500/v1.0/bindings/email-binding",
    json={
        "operation": "create",
        "data": "New high-value order placed: ORD-999",
        "metadata": {
            "emailTo": "ops-lead@example.com",
            "emailCc": "manager@example.com",
            "emailBcc": "audit@example.com",
            "subject": "Alert: High Value Order"
        }
    }
).raise_for_status()
```

## Send Emails in a Workflow

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "orderpubsub",
        "topic": "order-placed",
        "route": "/send-confirmation"
    }])

@app.route('/send-confirmation', methods=['POST'])
def send_confirmation():
    event = request.json
    order = event.get('data', {})
    send_email(
        to=order['customerEmail'],
        subject=f"Order Confirmed - {order['id']}",
        body=f"Your order {order['id']} for ${order['total']} has been confirmed."
    )
    return jsonify({"status": "SUCCESS"})
```

## Summary

Dapr's AWS SES binding provides a simple interface for sending plain text and HTML emails with CC/BCC support. By separating email delivery from business logic through the binding abstraction, services can be tested without real email calls and the email provider can be swapped by changing the component configuration. This pattern works well for order confirmations, alerts, and other event-driven notification workflows.
