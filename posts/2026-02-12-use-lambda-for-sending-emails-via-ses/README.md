# How to Use Lambda for Sending Emails via SES

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, SES, Email, Serverless

Description: Learn how to build a serverless email sending service using AWS Lambda and Amazon SES for transactional emails, notifications, and bulk campaigns.

---

Sending emails from a serverless application is a common requirement. Whether it's order confirmations, password resets, or weekly reports, you need a reliable way to get emails out. Amazon SES (Simple Email Service) handles the actual delivery, and Lambda is perfect for triggering those sends in response to events - user sign-ups, completed orders, scheduled reports, or webhook callbacks.

Let's build a complete email sending setup from scratch.

## Setting Up SES

Before you can send emails through SES, you need to verify at least one email address or domain.

For development, verify a single email address:

```bash
# Verify an email address for sending
aws ses verify-email-identity --email-address noreply@yourdomain.com
```

For production, verify your entire domain by adding DNS records:

```bash
# Start domain verification - this gives you DNS records to add
aws ses verify-domain-identity --domain yourdomain.com
```

SES starts in sandbox mode, which means you can only send to verified email addresses. To send to anyone, you need to request production access through the AWS console.

## Basic Email Sending

Here's a straightforward Lambda function that sends an email:

```javascript
// Lambda function to send emails using SES
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const { to, subject, htmlBody, textBody } = event;

  const command = new SendEmailCommand({
    Source: 'Your App <noreply@yourdomain.com>',
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: htmlBody },
        Text: { Data: textBody },  // Plain text fallback
      },
    },
  });

  try {
    const result = await ses.send(command);
    console.log(`Email sent. MessageId: ${result.MessageId}`);
    return { statusCode: 200, messageId: result.MessageId };
  } catch (error) {
    console.error('Failed to send email:', error.message);
    throw error;
  }
};
```

## Using Email Templates

For production apps, you don't want to hardcode email HTML in your Lambda function. SES supports templates that you create once and reference by name.

Create a template:

```bash
# Create an SES email template
aws ses create-template --template '{
  "TemplateName": "WelcomeEmail",
  "SubjectPart": "Welcome to {{appName}}, {{name}}!",
  "HtmlPart": "<h1>Welcome, {{name}}!</h1><p>Thanks for signing up for {{appName}}. Click <a href=\"{{confirmUrl}}\">here</a> to confirm your email.</p>",
  "TextPart": "Welcome, {{name}}! Thanks for signing up for {{appName}}. Confirm your email: {{confirmUrl}}"
}'
```

Then send emails using the template:

```javascript
// Send a templated email with dynamic variables
const { SESClient, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const { to, templateName, templateData } = event;

  const command = new SendTemplatedEmailCommand({
    Source: 'Your App <noreply@yourdomain.com>',
    Destination: {
      ToAddresses: [to],
    },
    Template: templateName,
    // Template data must be a JSON string
    TemplateData: JSON.stringify(templateData),
  });

  const result = await ses.send(command);
  return { messageId: result.MessageId };
};
```

Invoke it like this:

```bash
# Send a templated welcome email
aws lambda invoke \
  --function-name email-sender \
  --payload '{
    "to": "user@example.com",
    "templateName": "WelcomeEmail",
    "templateData": {
      "name": "Alex",
      "appName": "MyApp",
      "confirmUrl": "https://myapp.com/confirm?token=abc123"
    }
  }' \
  response.json
```

## Sending Emails with Attachments

For emails with attachments (like invoices or reports), you need to use the raw email API:

```javascript
// Send an email with a PDF attachment using raw email
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ses = new SESClient({ region: 'us-east-1' });
const s3 = new S3Client({ region: 'us-east-1' });

exports.handler = async (event) => {
  const { to, subject, body, attachmentBucket, attachmentKey } = event;

  // Download the attachment from S3
  const attachment = await s3.send(
    new GetObjectCommand({ Bucket: attachmentBucket, Key: attachmentKey })
  );
  const attachmentBuffer = Buffer.from(await attachment.Body.transformToByteArray());
  const attachmentBase64 = attachmentBuffer.toString('base64');

  const filename = attachmentKey.split('/').pop();
  const boundary = `----=_Part_${Date.now()}`;

  // Build the raw MIME email
  const rawEmail = [
    `From: Your App <noreply@yourdomain.com>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    body,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    `Content-Disposition: attachment; filename="${filename}"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    attachmentBase64,
    ``,
    `--${boundary}--`,
  ].join('\r\n');

  const command = new SendRawEmailCommand({
    RawMessage: { Data: Buffer.from(rawEmail) },
  });

  const result = await ses.send(command);
  return { messageId: result.MessageId };
};
```

## Event-Driven Email Sending

A powerful pattern is triggering emails from other AWS events. For example, sending a notification when a file is uploaded to S3, or when a DynamoDB record changes.

Here's a Lambda function triggered by DynamoDB Streams that sends an email when a new order is created:

```javascript
// Send order confirmation when a new record appears in DynamoDB
const { SESClient, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  for (const record of event.Records) {
    // Only process new records (inserts)
    if (record.eventName !== 'INSERT') continue;

    const order = record.dynamodb.NewImage;
    const email = order.customerEmail.S;
    const orderId = order.orderId.S;
    const total = order.total.N;

    console.log(`Sending confirmation for order ${orderId} to ${email}`);

    await ses.send(new SendTemplatedEmailCommand({
      Source: 'Orders <orders@yourdomain.com>',
      Destination: { ToAddresses: [email] },
      Template: 'OrderConfirmation',
      TemplateData: JSON.stringify({
        orderId,
        total: parseFloat(total).toFixed(2),
        orderDate: new Date().toLocaleDateString(),
      }),
    }));
  }
};
```

## Bulk Email Sending

For sending to many recipients (newsletters, announcements), use SES bulk templated email:

```javascript
// Send bulk emails using SES bulk template API
const { SESClient, SendBulkTemplatedEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: 'us-east-1' });

exports.handler = async (event) => {
  const { recipients, templateName } = event;

  // SES allows up to 50 destinations per bulk send call
  const batchSize = 50;
  const results = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const command = new SendBulkTemplatedEmailCommand({
      Source: 'Newsletter <news@yourdomain.com>',
      Template: templateName,
      DefaultTemplateData: JSON.stringify({ unsubscribeUrl: '#' }),
      Destinations: batch.map((r) => ({
        Destination: { ToAddresses: [r.email] },
        ReplacementTemplateData: JSON.stringify({
          name: r.name,
          unsubscribeUrl: `https://myapp.com/unsubscribe?id=${r.id}`,
        }),
      })),
    });

    const result = await ses.send(command);
    results.push(...result.Status);

    // Brief pause between batches to respect SES rate limits
    if (i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const sent = results.filter(r => r.Status === 'Success').length;
  const failed = results.filter(r => r.Status !== 'Success').length;
  console.log(`Sent: ${sent}, Failed: ${failed}`);

  return { sent, failed };
};
```

## IAM Permissions

Your Lambda function needs permission to use SES:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendTemplatedEmail",
        "ses:SendBulkTemplatedEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@yourdomain.com"
        }
      }
    }
  ]
}
```

The condition restricts which "from" addresses the Lambda can use, adding a layer of safety.

## Handling Bounces and Complaints

SES tracks bounces (undeliverable emails) and complaints (spam reports). You should process these to maintain your sender reputation.

Set up an SNS topic that SES publishes to, then create a Lambda function to process them:

```javascript
// Process bounce and complaint notifications from SES via SNS
exports.handler = async (event) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);

    if (message.notificationType === 'Bounce') {
      const bounced = message.bounce.bouncedRecipients;
      for (const recipient of bounced) {
        console.log(`Bounce: ${recipient.emailAddress} - ${recipient.status}`);
        // Mark this email as undeliverable in your database
        await markEmailBounced(recipient.emailAddress);
      }
    }

    if (message.notificationType === 'Complaint') {
      const complained = message.complaint.complainedRecipients;
      for (const recipient of complained) {
        console.log(`Complaint: ${recipient.emailAddress}`);
        // Unsubscribe this user immediately
        await unsubscribeUser(recipient.emailAddress);
      }
    }
  }
};
```

## Error Handling and Retries

SES can throw throttling errors if you exceed your sending rate. Handle this with exponential backoff:

```javascript
// Send email with retry logic for throttling
async function sendWithRetry(command, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ses.send(command);
    } catch (error) {
      if (error.name === 'Throttling' && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Throttled, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

For more on error handling patterns, see our post on [handling errors in Lambda functions gracefully](https://oneuptime.com/blog/post/2026-02-12-handle-errors-in-lambda-functions-gracefully/view).

## Wrapping Up

Lambda and SES together give you a scalable, cost-effective email sending system. You can handle everything from simple transactional emails to bulk campaigns without running a mail server. The key is to use templates for consistency, handle bounces and complaints to protect your sender reputation, implement retry logic for throttling, and set up proper IAM permissions to control which addresses your functions can send from.
