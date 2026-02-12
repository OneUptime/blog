# How to Integrate SES with Node.js Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Node.js, Email, JavaScript

Description: A practical guide to integrating Amazon SES with Node.js applications using the AWS SDK v3, including sending emails, templates, attachments, and error handling.

---

Sending email from a Node.js application is one of those things that sounds simple until you actually do it. Between SMTP configuration, authentication, templates, and error handling, there's more to it than just calling an API. Amazon SES with the AWS SDK v3 makes this significantly easier. Let's build a solid email-sending module from scratch.

## Installing the SDK

The AWS SDK v3 is modular - you only install the packages you need. For SES, that's the SES client.

```bash
# Install the SES client and required dependencies
npm install @aws-sdk/client-ses @aws-sdk/client-sesv2
```

The `client-ses` package gives you the v1 SES API (still widely used), and `client-sesv2` gives you the newer v2 API with additional features.

## Basic Email Sending

Let's start with the simplest case - sending a plain text email.

```javascript
// ses-client.js - Basic SES setup
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

// Create the SES client
// Credentials are loaded automatically from environment variables,
// AWS credentials file, or IAM role
const sesClient = new SESClient({
  region: 'us-east-1'
});

async function sendEmail(to, subject, textBody, htmlBody) {
  const params = {
    Source: 'sender@yourdomain.com',
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Text: {
          Data: textBody,
          Charset: 'UTF-8'
        }
      }
    }
  };

  // Add HTML body if provided
  if (htmlBody) {
    params.Message.Body.Html = {
      Data: htmlBody,
      Charset: 'UTF-8'
    };
  }

  const command = new SendEmailCommand(params);
  const response = await sesClient.send(command);
  return response.MessageId;
}

module.exports = { sendEmail };
```

Usage is straightforward.

```javascript
const { sendEmail } = require('./ses-client');

// Send a simple email
await sendEmail(
  'user@example.com',
  'Welcome to our platform',
  'Thanks for signing up! We are glad to have you.',
  '<h1>Welcome!</h1><p>Thanks for signing up! We are glad to have you.</p>'
);
```

## Building an Email Service Class

For production use, you'll want something more structured with error handling, retries, and configuration.

```javascript
// email-service.js
const { SESClient, SendEmailCommand, SendTemplatedEmailCommand } = require('@aws-sdk/client-ses');
const { SESv2Client, SendEmailCommand: SendEmailV2Command } = require('@aws-sdk/client-sesv2');

class EmailService {
  constructor(config = {}) {
    this.sesClient = new SESClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      maxAttempts: config.maxRetries || 3
    });

    this.sesV2Client = new SESv2Client({
      region: config.region || process.env.AWS_REGION || 'us-east-1'
    });

    this.defaultFrom = config.fromAddress || process.env.SES_FROM_ADDRESS;
    this.configurationSet = config.configurationSet || 'production-email-monitoring';
  }

  async sendSimpleEmail({ to, cc, bcc, subject, text, html, replyTo, tags }) {
    const params = {
      Source: this.defaultFrom,
      Destination: {
        ToAddresses: this._toArray(to)
      },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {}
      },
      ConfigurationSetName: this.configurationSet
    };

    if (text) params.Message.Body.Text = { Data: text, Charset: 'UTF-8' };
    if (html) params.Message.Body.Html = { Data: html, Charset: 'UTF-8' };
    if (cc) params.Destination.CcAddresses = this._toArray(cc);
    if (bcc) params.Destination.BccAddresses = this._toArray(bcc);
    if (replyTo) params.ReplyToAddresses = this._toArray(replyTo);

    // Add message tags for tracking
    if (tags) {
      params.Tags = Object.entries(tags).map(([Name, Value]) => ({ Name, Value }));
    }

    try {
      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);
      return { success: true, messageId: response.MessageId };
    } catch (error) {
      return this._handleError(error);
    }
  }

  async sendTemplatedEmail({ to, templateName, templateData, tags }) {
    const params = {
      Source: this.defaultFrom,
      Destination: {
        ToAddresses: this._toArray(to)
      },
      Template: templateName,
      TemplateData: JSON.stringify(templateData),
      ConfigurationSetName: this.configurationSet
    };

    if (tags) {
      params.Tags = Object.entries(tags).map(([Name, Value]) => ({ Name, Value }));
    }

    try {
      const command = new SendTemplatedEmailCommand(params);
      const response = await this.sesClient.send(command);
      return { success: true, messageId: response.MessageId };
    } catch (error) {
      return this._handleError(error);
    }
  }

  _toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  _handleError(error) {
    const errorResponse = {
      success: false,
      error: error.name || 'UnknownError',
      message: error.message
    };

    // Handle specific SES errors
    switch (error.name) {
      case 'MessageRejected':
        console.error('Email rejected by SES:', error.message);
        break;
      case 'MailFromDomainNotVerifiedException':
        console.error('Sending domain not verified:', error.message);
        break;
      case 'ThrottlingException':
        console.error('Rate limited by SES - consider adding a delay');
        break;
      case 'AccountSendingPausedException':
        console.error('SES sending is paused - check your reputation');
        break;
      default:
        console.error('SES error:', error.name, error.message);
    }

    return errorResponse;
  }
}

module.exports = EmailService;
```

## Sending Emails with Attachments

For attachments, you need to build a raw MIME message. The `nodemailer` package makes this much easier than doing it by hand.

```bash
npm install nodemailer
```

```javascript
// email-service-attachments.js
const { SESClient, SendRawEmailCommand } = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');

// Create a nodemailer transport backed by SES
const sesClient = new SESClient({ region: 'us-east-1' });

const transporter = nodemailer.createTransport({
  SES: {
    ses: sesClient,
    aws: { SendRawEmailCommand }
  }
});

async function sendEmailWithAttachment(to, subject, htmlBody, attachments) {
  const mailOptions = {
    from: 'sender@yourdomain.com',
    to: to,
    subject: subject,
    html: htmlBody,
    attachments: attachments.map(att => ({
      filename: att.filename,
      content: att.content,       // Buffer or string
      contentType: att.contentType // e.g., 'application/pdf'
    }))
  };

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}

// Example usage
const fs = require('fs');

await sendEmailWithAttachment(
  'user@example.com',
  'Your Invoice',
  '<p>Please find your invoice attached.</p>',
  [{
    filename: 'invoice-2026-02.pdf',
    content: fs.readFileSync('/path/to/invoice.pdf'),
    contentType: 'application/pdf'
  }]
);
```

## Template Management

You can create and manage SES templates directly from your Node.js code.

```javascript
const { SESClient, CreateTemplateCommand, UpdateTemplateCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'us-east-1' });

async function createOrUpdateTemplate(name, subject, html, text) {
  const template = {
    Template: {
      TemplateName: name,
      SubjectPart: subject,
      HtmlPart: html,
      TextPart: text
    }
  };

  try {
    // Try to create first
    await sesClient.send(new CreateTemplateCommand(template));
    console.log(`Template ${name} created`);
  } catch (error) {
    if (error.name === 'AlreadyExistsException') {
      // Template exists, update it instead
      await sesClient.send(new UpdateTemplateCommand(template));
      console.log(`Template ${name} updated`);
    } else {
      throw error;
    }
  }
}

// Create a welcome email template
await createOrUpdateTemplate(
  'welcome-email',
  'Welcome, {{name}}!',
  `<html>
    <body>
      <h1>Welcome, {{name}}!</h1>
      <p>Thanks for creating an account. Here is what you can do next:</p>
      <ul>
        <li><a href="{{dashboard_url}}">Visit your dashboard</a></li>
        <li><a href="{{docs_url}}">Read the documentation</a></li>
      </ul>
    </body>
  </html>`,
  'Welcome, {{name}}! Visit your dashboard at {{dashboard_url}}'
);
```

## Rate Limiting with a Queue

If you're sending lots of emails, you need to respect SES rate limits. Here's a simple queue-based approach.

```javascript
// email-queue.js
class EmailQueue {
  constructor(emailService, ratePerSecond = 14) {
    this.emailService = emailService;
    this.queue = [];
    this.processing = false;
    this.interval = 1000 / ratePerSecond;
  }

  add(emailParams) {
    return new Promise((resolve, reject) => {
      this.queue.push({ params: emailParams, resolve, reject });
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  async processQueue() {
    this.processing = true;

    while (this.queue.length > 0) {
      const { params, resolve, reject } = this.queue.shift();

      try {
        const result = await this.emailService.sendSimpleEmail(params);
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Wait to stay within rate limits
      await new Promise(r => setTimeout(r, this.interval));
    }

    this.processing = false;
  }
}

module.exports = EmailQueue;
```

## Express.js Integration Example

Here's how you might use the email service in an Express application.

```javascript
const express = require('express');
const EmailService = require('./email-service');

const app = express();
const emailService = new EmailService({
  fromAddress: 'noreply@yourdomain.com'
});

app.post('/api/contact', express.json(), async (req, res) => {
  const { name, email, message } = req.body;

  // Send notification to your team
  const result = await emailService.sendSimpleEmail({
    to: 'support@yourdomain.com',
    subject: `Contact form: ${name}`,
    text: `From: ${name} (${email})\n\n${message}`,
    tags: { EmailType: 'contact-form' }
  });

  if (result.success) {
    // Send confirmation to the user
    await emailService.sendSimpleEmail({
      to: email,
      subject: 'We received your message',
      text: `Hi ${name},\n\nThanks for reaching out. We will get back to you within 24 hours.\n\nBest regards`,
      tags: { EmailType: 'auto-reply' }
    });

    res.json({ message: 'Message sent successfully' });
  } else {
    res.status(500).json({ error: 'Failed to send message' });
  }
});
```

## Summary

Integrating SES with Node.js is straightforward once you have the building blocks in place. Use the AWS SDK v3 for the client, build a service class with proper error handling, use nodemailer for attachments, and add rate limiting when sending in bulk. The key is to handle errors gracefully - SES will throttle you, reject bad addresses, and occasionally have hiccups. Your code needs to deal with all of that without losing emails. For the Python equivalent, check out our guide on [integrating SES with Python Boto3](https://oneuptime.com/blog/post/integrate-ses-with-python-boto3-applications/view).
