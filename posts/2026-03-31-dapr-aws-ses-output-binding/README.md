# How to Use Dapr AWS SES Output Binding for Email

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, SES, Binding, Email

Description: Learn how to configure and use the Dapr AWS SES output binding to send transactional and notification emails from microservices without managing the AWS SDK.

---

## What Is the Dapr AWS SES Output Binding?

Amazon Simple Email Service (SES) is a managed email delivery service. The Dapr AWS SES output binding allows your microservices to send emails through SES using the Dapr binding API, without adding the AWS SDK as a dependency or writing SES-specific code.

## Prerequisites

Before using SES, verify your sender email address or domain in the AWS Console:

```bash
aws ses verify-email-identity \
  --email-address noreply@example.com \
  --region us-east-1
```

## Setting Up the SES Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: email-service
  namespace: default
spec:
  type: bindings.aws.ses
  version: v1
  metadata:
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
    - name: emailFrom
      value: "noreply@example.com"
    - name: emailTo
      value: ""
    - name: subject
      value: ""
```

## Sending a Transactional Email

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function sendOrderConfirmation(order) {
  await client.binding.send(
    "email-service",
    "create",
    `
      <h2>Order Confirmed - ${order.id}</h2>
      <p>Dear ${order.customerName},</p>
      <p>Your order has been confirmed. Here are the details:</p>
      <ul>
        ${order.items.map((item) => `<li>${item.name} x${item.quantity} - $${item.price}</li>`).join("")}
      </ul>
      <p><strong>Total: $${order.totalAmount}</strong></p>
      <p>Estimated delivery: 3-5 business days</p>
    `,
    {
      emailTo: order.customerEmail,
      emailFrom: "orders@example.com",
      subject: `Order Confirmation - ${order.id}`,
      emailCc: "orders-log@example.com",
    }
  );

  console.log(`Confirmation email sent to ${order.customerEmail}`);
}
```

## Sending Plain Text Emails

```javascript
async function sendPasswordReset(userEmail, resetToken) {
  const resetLink = `https://app.example.com/reset-password?token=${resetToken}`;

  await client.binding.send(
    "email-service",
    "create",
    `Password Reset Request

You requested a password reset. Click the link below to reset your password:

${resetLink}

This link expires in 1 hour. If you did not request this, please ignore this email.

Best regards,
The Support Team`,
    {
      emailTo: userEmail,
      subject: "Password Reset Request",
    }
  );
}
```

## Sending Emails to Multiple Recipients

SES supports multiple recipients via semicolon-separated addresses:

```javascript
async function sendTeamAlert(alertMessage, teamEmails) {
  await client.binding.send(
    "email-service",
    "create",
    alertMessage,
    {
      emailTo: teamEmails.join(";"),
      subject: "System Alert: Immediate Attention Required",
    }
  );
}

await sendTeamAlert(
  "Database CPU exceeded 90% for 5 minutes. Immediate investigation required.",
  ["ops-team@example.com", "on-call@example.com"]
);
```

## Email Templates with HTML

```javascript
function buildInvoiceEmail(invoice) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h1>Invoice #${invoice.number}</h1>
  <p>Date: ${invoice.date}</p>
  <table>
    <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
    ${invoice.items.map((i) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${i.price}</td></tr>`).join("")}
    <tr><td colspan="2"><strong>Total</strong></td><td><strong>$${invoice.total}</strong></td></tr>
  </table>
</body>
</html>
  `;
}

await client.binding.send(
  "email-service",
  "create",
  buildInvoiceEmail(invoice),
  {
    emailTo: invoice.customerEmail,
    subject: `Invoice #${invoice.number}`,
  }
);
```

## Error Handling and Sandbox Mode

In SES sandbox mode, you can only send to verified email addresses. To move out of the sandbox, submit a production access request through the AWS Console under **SES > Account dashboard > Request production access**, or use the CLI:

```bash
aws sesv2 put-account-details \
  --production-access-enabled \
  --mail-type TRANSACTIONAL \
  --use-case-description "Sending transactional emails from microservices" \
  --website-url "https://example.com" \
  --region us-east-1
```

## Summary

The Dapr AWS SES output binding makes transactional email straightforward to add to any microservice. Configure the binding component with your AWS credentials and verified sender address, then call `create` with your HTML or text content and per-request metadata for recipient and subject. Combined with Dapr's resiliency policies, you get reliable email delivery with automatic retries on transient failures.
