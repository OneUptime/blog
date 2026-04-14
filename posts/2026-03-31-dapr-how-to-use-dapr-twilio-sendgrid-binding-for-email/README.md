# How to Use Dapr Twilio SendGrid Binding for Email

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, SendGrid, Email, Binding, Twilio

Description: Learn how to use the Dapr Twilio SendGrid output binding to send transactional emails from your microservices using SendGrid's email API.

---

## What Is the Dapr Twilio SendGrid Binding

The Dapr Twilio SendGrid binding is an output binding that enables your application to send emails via the SendGrid API through the Dapr sidecar. Unlike the SMTP binding which uses an SMTP server, this binding calls the SendGrid REST API directly, which is more reliable for transactional email delivery at scale.

## Prerequisites

- Dapr CLI installed and initialized
- A Twilio SendGrid account with an API key
- A verified sender email address in SendGrid

## Define the SendGrid Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid-email
  namespace: default
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
  - name: apiKey
    secretKeyRef:
      name: sendgrid-secret
      key: apiKey
  - name: emailFrom
    value: "noreply@myapp.com"
  - name: emailFromName
    value: "MyApp Notifications"
  - name: emailTo
    value: "default@example.com"
  - name: subject
    value: "Notification from MyApp"
```

Create the secret for the API key:

```bash
kubectl create secret generic sendgrid-secret \
  --from-literal=apiKey="SG.xxxxxxxxxxxxxxxxxxxx"
```

## Send a Basic Email

```bash
curl -X POST http://localhost:3500/v1.0/bindings/sendgrid-email \
  -H "Content-Type: application/json" \
  -d '{
    "data": "Your account has been successfully verified.",
    "metadata": {
      "emailTo": "user@example.com",
      "emailToName": "John Doe",
      "subject": "Account Verified"
    },
    "operation": "create"
  }'
```

## Send an HTML Email

```bash
curl -X POST http://localhost:3500/v1.0/bindings/sendgrid-email \
  -H "Content-Type: application/json" \
  -d '{
    "data": "<h1>Welcome!</h1><p>Your account is ready. <a href=\"https://myapp.com\">Get started</a>.</p>",
    "metadata": {
      "emailTo": "user@example.com",
      "emailToName": "John Doe",
      "subject": "Welcome to MyApp"
    },
    "operation": "create"
  }'
```

The SendGrid binding always sends the `data` field as `text/html` content, so you can use HTML markup directly in the body.

## Use in a Node.js Application

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const BINDING = 'sendgrid-email';

async function sendEmail({ to, toName, subject, body }) {
  await client.binding.send(BINDING, 'create', body, {
    emailTo: to,
    emailToName: toName || '',
    subject: subject,
  });

  console.log(`Email sent to ${to}: ${subject}`);
}

async function sendWelcomeEmail(user) {
  await sendEmail({
    to: user.email,
    toName: user.name,
    subject: `Welcome to MyApp, ${user.name}!`,
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>Welcome, ${user.name}!</h2>
        <p>Your account is ready. Here's how to get started:</p>
        <ol>
          <li>Complete your profile</li>
          <li>Explore the dashboard</li>
          <li>Invite your team</li>
        </ol>
        <a href="https://myapp.com/dashboard"
           style="background:#0070f3;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">
          Go to Dashboard
        </a>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(email, name, resetLink) {
  await sendEmail({
    to: email,
    toName: name,
    subject: 'Reset Your Password',
    body: `
      <p>Hi ${name},</p>
      <p>You requested to reset your password. Click the link below:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  });
}

async function sendInvoiceEmail(customer, invoiceData) {
  const total = invoiceData.items.reduce((sum, item) => sum + item.total, 0);

  await sendEmail({
    to: customer.email,
    toName: customer.name,
    subject: `Invoice #${invoiceData.id} - $${total.toFixed(2)}`,
    body: `
      <h2>Invoice #${invoiceData.id}</h2>
      <p>Due: ${invoiceData.dueDate}</p>
      <table border="1" cellpadding="8">
        <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
        ${invoiceData.items.map(item =>
          `<tr><td>${item.name}</td><td>${item.qty}</td><td>$${item.total.toFixed(2)}</td></tr>`
        ).join('')}
      </table>
      <p><strong>Total: $${total.toFixed(2)}</strong></p>
    `,
  });
}
```

## Use in a Python Application

```python
from dapr.clients import DaprClient

BINDING = 'sendgrid-email'

def send_email(to: str, subject: str, body: str, to_name: str = ''):
    with DaprClient() as client:
        client.invoke_binding(
            binding_name=BINDING,
            operation='create',
            data=body,
            binding_metadata={
                'emailTo': to,
                'emailToName': to_name,
                'subject': subject,
            }
        )
    print(f"Email sent to {to}")

# Send a plain text alert (rendered as HTML content type by SendGrid binding)
send_email(
    to='ops@company.com',
    subject='Deployment Completed',
    body='Production deployment v2.1.0 completed successfully at 14:32 UTC.'
)

# Send HTML notification
send_email(
    to='user@example.com',
    to_name='Alice',
    subject='Your Report is Ready',
    body='<h2>Report Ready</h2><p>Your monthly report is available for download.</p>'
)
```

## Summary

The Dapr Twilio SendGrid binding provides a reliable API-based email delivery solution for microservices, using SendGrid's infrastructure instead of raw SMTP. It supports HTML emails, custom sender names, and integrates with Dapr secret stores for secure API key management. By centralizing email configuration in a Dapr component, all services share the same SendGrid setup without code duplication.
