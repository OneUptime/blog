# How to Deploy Mailtrap via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Mailtrap, Email Testing, Self-Hosted, Development

Description: Deploy a self-hosted Mailtrap-compatible SMTP testing server using Mailpit via Portainer for safe email testing in development and staging environments.

## Introduction

Mailtrap is a popular email testing service, but you can cover the same core SMTP testing workflow with Mailpit - a fast, open-source SMTP testing tool - running entirely on your own infrastructure. Deploying it via Portainer lets you manage it alongside your other containers with zero configuration drift.

Mailpit provides an SMTP server that captures all outgoing emails and displays them in a web UI, preventing accidental sends to real users during development.

## Prerequisites

- Portainer CE or BE installed and running
- Docker Engine (use a version supported by your Portainer release)
- An application (dev or staging) that sends email via SMTP

## Step 1: Create the Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and paste:

```yaml
services:
  # Mailpit - self-hosted SMTP email testing tool
  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit
    restart: unless-stopped
    ports:
      # SMTP port - configure your app to send mail here
      - "1025:1025"
      # Web UI port
      - "8025:8025"
    environment:
      # Optional: enable authentication for the web UI
      # MP_UI_AUTH: "admin:password"

      # Optional: enable STARTTLS for SMTP
      # MP_SMTP_TLS_CERT: /certs/cert.pem
      # MP_SMTP_TLS_KEY: /certs/key.pem

      # Limit stored messages (default 500)
      MP_MAX_MESSAGES: "500"

      # Store messages in the mounted volume
      MP_DATABASE: /data/mailpit.db

      # Optional: forward a copy of all emails to a real mailbox
      # MP_SMTP_FORWARD_TO: qa@example.com
      # MP_SMTP_FORWARD_HOST: smtp.sendgrid.net
      # MP_SMTP_FORWARD_PORT: "587"
    volumes:
      # Persist captured emails across restarts
      - mailpit_data:/data
    networks:
      - mailpit-net

volumes:
  mailpit_data:

networks:
  mailpit-net:
    name: mailpit-net
    driver: bridge
```

## Step 2: Deploy and Verify

1. Name the stack `mailpit`
2. Click **Deploy the stack**
3. Open the Mailpit Web UI at `http://your-host:8025`

## Step 3: Configure Your Application to Use Mailpit

### Node.js (Nodemailer)

```javascript
const nodemailer = require('nodemailer');

// Point to your Mailpit SMTP server
const transporter = nodemailer.createTransport({
  host: 'your-host',  // or 'mailpit' if your app is on the same Docker network
  port: 1025,
  secure: false,  // No TLS for dev
  ignoreTLS: true,
});

async function sendTestEmail() {
  const info = await transporter.sendMail({
    from: '"Test App" <noreply@example.com>',
    to: 'user@example.com',
    subject: 'Hello from Mailpit!',
    text: 'This email was captured by Mailpit.',
    html: '<b>This email was captured by Mailpit.</b>',
  });
  console.log('Message sent:', info.messageId);
}

sendTestEmail();
```

### Python (Django)

```python
# settings.py

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'your-host'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False
```

### PHP (Laravel)

```env
# .env file
MAIL_MAILER=smtp
MAIL_HOST=your-host
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_SCHEME=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"
```

### Docker-Compose Integration (Same Network)

If your application runs in Docker, put it on the same network as Mailpit:

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      SMTP_HOST: mailpit   # Service name on the shared network
      SMTP_PORT: "1025"
    networks:
      - mailpit-net

networks:
  mailpit-net:
    external: true
    name: mailpit-net   # Reference the existing Mailpit network
```

## Step 4: View Captured Emails

1. Open `http://your-host:8025`
2. All emails sent to your SMTP port appear in the inbox
3. Click any email to view HTML rendering, headers, raw source, and, if SpamAssassin integration is enabled, spam analysis

## Step 5: Use Mailpit's API

Mailpit provides a REST API for integration with CI/CD:

```bash
# List all messages
curl http://your-host:8025/api/v1/messages

# Delete all messages (useful in CI pipelines before test runs)
curl -X DELETE http://your-host:8025/api/v1/messages

# Get a specific message
curl http://your-host:8025/api/v1/message/{ID}
```

## Step 6: Enable Basic Auth for the UI

For staging environments accessible from the internet:

```yaml
environment:
  # Format: username:password (bcrypt hashed or plain)
  MP_UI_AUTH: "admin:$2y$10$yourbcrypthashhere"
```

## Conclusion

Mailpit deployed via Portainer gives your team a self-hosted email testing environment for the same core SMTP capture workflow as Mailtrap. Every email your application sends during development is captured and inspectable - no more accidentally emailing real users, and no cloud service dependency.
