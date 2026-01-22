# How to Create Email Sending with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Email, Nodemailer, SMTP, API

Description: Learn how to send emails in Node.js using Nodemailer, email service APIs like SendGrid and AWS SES, with templates and attachments.

---

Sending emails is a common requirement in web applications for notifications, password resets, and marketing. Node.js offers several ways to send emails, from direct SMTP to email service APIs.

## Using Nodemailer

Nodemailer is the most popular email package for Node.js.

```bash
npm install nodemailer
```

### Basic Setup

```javascript
const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.example.com',
  port: 587,
  secure: false,  // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send email
async function sendEmail() {
  const info = await transporter.sendMail({
    from: '"My App" <noreply@myapp.com>',
    to: 'user@example.com',
    subject: 'Hello!',
    text: 'Plain text version',
    html: '<h1>Hello!</h1><p>HTML version</p>',
  });
  
  console.log('Message sent:', info.messageId);
}
```

### Gmail Configuration

```javascript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,  // Use App Password, not regular password
  },
});
```

### OAuth2 for Gmail

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

async function createTransporter() {
  const accessToken = await oauth2Client.getAccessToken();
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      accessToken: accessToken.token,
    },
  });
}
```

## Email Templates

### Using Handlebars

```bash
npm install handlebars
```

```javascript
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

async function loadTemplate(templateName, data) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const templateSource = await fs.readFile(templatePath, 'utf-8');
  const template = handlebars.compile(templateSource);
  return template(data);
}

// templates/welcome.hbs
/*
<!DOCTYPE html>
<html>
<head>
  <style>
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: #4F46E5; color: white; padding: 20px; }
    .content { padding: 20px; }
    .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to {{appName}}!</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>Thanks for signing up. Click below to verify your email:</p>
      <a href="{{verifyUrl}}" class="button">Verify Email</a>
    </div>
  </div>
</body>
</html>
*/

async function sendWelcomeEmail(user) {
  const html = await loadTemplate('welcome', {
    appName: 'My App',
    userName: user.name,
    verifyUrl: `https://myapp.com/verify?token=${user.verificationToken}`,
  });
  
  await transporter.sendMail({
    from: '"My App" <noreply@myapp.com>',
    to: user.email,
    subject: 'Welcome to My App!',
    html,
  });
}
```

### Using EJS

```bash
npm install ejs
```

```javascript
const ejs = require('ejs');
const path = require('path');

async function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.ejs`);
  return ejs.renderFile(templatePath, data);
}
```

## Attachments

```javascript
await transporter.sendMail({
  from: '"My App" <noreply@myapp.com>',
  to: 'user@example.com',
  subject: 'Report',
  html: '<p>Please find attached report.</p>',
  attachments: [
    // File from path
    {
      filename: 'report.pdf',
      path: '/path/to/report.pdf',
    },
    
    // Buffer content
    {
      filename: 'data.json',
      content: JSON.stringify(data, null, 2),
    },
    
    // Stream
    {
      filename: 'large-file.zip',
      content: fs.createReadStream('/path/to/file.zip'),
    },
    
    // Base64 encoded
    {
      filename: 'image.png',
      content: base64Data,
      encoding: 'base64',
    },
    
    // URL
    {
      filename: 'logo.png',
      path: 'https://example.com/logo.png',
    },
    
    // Embedded image (CID)
    {
      filename: 'logo.png',
      path: '/path/to/logo.png',
      cid: 'logo',  // Reference in HTML as <img src="cid:logo">
    },
  ],
});
```

### Inline Images

```javascript
await transporter.sendMail({
  from: '"My App" <noreply@myapp.com>',
  to: 'user@example.com',
  subject: 'Newsletter',
  html: `
    <h1>Our Newsletter</h1>
    <img src="cid:header-image" />
    <p>Content here...</p>
  `,
  attachments: [
    {
      filename: 'header.png',
      path: '/path/to/header.png',
      cid: 'header-image',
    },
  ],
});
```

## Using SendGrid

```bash
npm install @sendgrid/mail
```

```javascript
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendWithSendGrid() {
  const msg = {
    to: 'user@example.com',
    from: 'noreply@myapp.com',  // Verified sender
    subject: 'Hello',
    text: 'Plain text',
    html: '<h1>Hello</h1>',
  };
  
  await sgMail.send(msg);
}

// Send multiple emails
async function sendBulk(recipients) {
  const messages = recipients.map(recipient => ({
    to: recipient.email,
    from: 'noreply@myapp.com',
    subject: 'Newsletter',
    html: renderTemplate('newsletter', { name: recipient.name }),
  }));
  
  await sgMail.send(messages);
}

// Using dynamic templates
async function sendWithTemplate() {
  await sgMail.send({
    to: 'user@example.com',
    from: 'noreply@myapp.com',
    templateId: 'd-xxxxxxxxxxxxx',
    dynamicTemplateData: {
      name: 'John',
      orderNumber: '12345',
    },
  });
}
```

## Using AWS SES

```bash
npm install @aws-sdk/client-ses
```

```javascript
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function sendWithSES() {
  const command = new SendEmailCommand({
    Source: 'noreply@myapp.com',
    Destination: {
      ToAddresses: ['user@example.com'],
      CcAddresses: ['cc@example.com'],
      BccAddresses: ['bcc@example.com'],
    },
    Message: {
      Subject: {
        Data: 'Hello',
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: 'Plain text version',
          Charset: 'UTF-8',
        },
        Html: {
          Data: '<h1>Hello</h1>',
          Charset: 'UTF-8',
        },
      },
    },
  });
  
  const response = await sesClient.send(command);
  console.log('Message ID:', response.MessageId);
}
```

### Using Nodemailer with SES

```javascript
const nodemailer = require('nodemailer');
const aws = require('@aws-sdk/client-ses');

const ses = new aws.SES({
  region: 'us-east-1',
});

const transporter = nodemailer.createTransport({
  SES: { ses, aws },
});

await transporter.sendMail({
  from: 'noreply@myapp.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>Hello</h1>',
});
```

## Email Queue with Bull

```bash
npm install bull
```

```javascript
const Queue = require('bull');
const nodemailer = require('nodemailer');

const emailQueue = new Queue('email', process.env.REDIS_URL);

const transporter = nodemailer.createTransport({
  // config
});

// Producer: Add email to queue
async function queueEmail(emailData) {
  await emailQueue.add('send', emailData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  });
}

// Consumer: Process emails
emailQueue.process('send', async (job) => {
  const { to, subject, html, attachments } = job.data;
  
  await transporter.sendMail({
    from: '"My App" <noreply@myapp.com>',
    to,
    subject,
    html,
    attachments,
  });
  
  return { sent: true };
});

// Event handlers
emailQueue.on('completed', (job, result) => {
  console.log(`Email sent to ${job.data.to}`);
});

emailQueue.on('failed', (job, error) => {
  console.error(`Email to ${job.data.to} failed:`, error.message);
});

// Usage
await queueEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome!</h1>',
});
```

## Email Service Class

```javascript
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor(config) {
    this.transporter = nodemailer.createTransport(config);
    this.templatesDir = config.templatesDir || path.join(__dirname, 'templates');
    this.from = config.from;
    this.templateCache = new Map();
  }
  
  async loadTemplate(name) {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name);
    }
    
    const templatePath = path.join(this.templatesDir, `${name}.hbs`);
    const source = await fs.readFile(templatePath, 'utf-8');
    const template = handlebars.compile(source);
    
    this.templateCache.set(name, template);
    return template;
  }
  
  async send(options) {
    const mailOptions = {
      from: options.from || this.from,
      to: options.to,
      subject: options.subject,
      cc: options.cc,
      bcc: options.bcc,
      attachments: options.attachments,
    };
    
    if (options.template) {
      const template = await this.loadTemplate(options.template);
      mailOptions.html = template(options.data || {});
    } else {
      mailOptions.html = options.html;
      mailOptions.text = options.text;
    }
    
    return this.transporter.sendMail(mailOptions);
  }
  
  async sendWelcome(user) {
    return this.send({
      to: user.email,
      subject: 'Welcome!',
      template: 'welcome',
      data: {
        name: user.name,
        verifyUrl: `https://myapp.com/verify?token=${user.verificationToken}`,
      },
    });
  }
  
  async sendPasswordReset(user, resetToken) {
    return this.send({
      to: user.email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl: `https://myapp.com/reset-password?token=${resetToken}`,
        expiresIn: '1 hour',
      },
    });
  }
  
  async sendOrderConfirmation(order) {
    return this.send({
      to: order.customer.email,
      subject: `Order Confirmation #${order.id}`,
      template: 'order-confirmation',
      data: {
        orderNumber: order.id,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress,
      },
    });
  }
  
  async verify() {
    return this.transporter.verify();
  }
}

// Usage
const emailService = new EmailService({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: '"My App" <noreply@myapp.com>',
  templatesDir: path.join(__dirname, 'email-templates'),
});

// Verify connection
await emailService.verify();

// Send emails
await emailService.sendWelcome(user);
await emailService.sendPasswordReset(user, resetToken);
```

## Testing Emails

### Using Ethereal (Fake SMTP)

```javascript
async function createTestTransporter() {
  const testAccount = await nodemailer.createTestAccount();
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  return transporter;
}

// Usage
const transporter = await createTestTransporter();
const info = await transporter.sendMail({
  from: '"Test" <test@example.com>',
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Test email</p>',
});

// Preview URL
console.log('Preview:', nodemailer.getTestMessageUrl(info));
```

### Using MailHog (Local SMTP)

```yaml
# docker-compose.yml
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"   # SMTP
      - "8025:8025"   # Web UI
```

```javascript
const transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
});
```

## Summary

| Library | Use Case |
|---------|----------|
| Nodemailer | Direct SMTP, versatile |
| @sendgrid/mail | SendGrid API |
| @aws-sdk/client-ses | AWS SES |
| mailgun.js | Mailgun API |

| Feature | Implementation |
|---------|----------------|
| Templates | Handlebars/EJS |
| Queue | Bull + Redis |
| Attachments | Buffer/Stream/Path |
| Testing | Ethereal/MailHog |

| Best Practice | Description |
|---------------|-------------|
| Use queue | Async sending, retry |
| Template emails | Reusable, maintainable |
| Verify sender | Avoid spam folders |
| Handle bounces | Monitor delivery |
