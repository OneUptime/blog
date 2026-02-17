# How to Set Up Cloud Functions to Send Email Notifications Using SendGrid When Alerts Fire

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, SendGrid, Email, Notifications

Description: Build a Cloud Function that sends email notifications through SendGrid when monitoring alerts fire, with support for templates, throttling, and multiple recipients.

---

When a monitoring alert fires - a server is down, error rates spike, or a database is running out of space - you need to notify your team immediately. While tools like PagerDuty and Slack are popular for alerts, email remains essential for many teams, compliance requirements, and stakeholders who do not use chat tools.

SendGrid is the most straightforward way to send transactional emails from a Cloud Function. Google Cloud does not allow direct SMTP connections from Cloud Functions, but SendGrid's HTTP API works perfectly. Here is how to wire it all together.

## Prerequisites

1. A SendGrid account (the free tier gives you 100 emails/day)
2. A verified sender identity in SendGrid
3. A SendGrid API key

Create the SendGrid API key and store it in Secret Manager:

```bash
# Store the SendGrid API key in Secret Manager
echo -n "SG.your-api-key-here" | \
  gcloud secrets create sendgrid-api-key \
  --data-file=- \
  --replication-policy=automatic
```

## The Email Notification Function

Here is a complete Cloud Function that receives alert data via Pub/Sub and sends formatted email notifications:

```javascript
// index.js - SendGrid email notification Cloud Function
const functions = require('@google-cloud/functions-framework');
const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with the API key from environment/secrets
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Configuration
const FROM_EMAIL = process.env.FROM_EMAIL || 'alerts@example.com';
const FROM_NAME = process.env.FROM_NAME || 'System Alerts';
const DEFAULT_RECIPIENTS = (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean);

functions.cloudEvent('sendAlertEmail', async (cloudEvent) => {
  const message = cloudEvent.data.message;
  const alertData = JSON.parse(
    Buffer.from(message.data, 'base64').toString('utf-8')
  );
  const attributes = message.attributes || {};

  console.log('Received alert:', {
    type: alertData.type,
    severity: attributes.severity,
    source: alertData.source
  });

  // Determine recipients based on alert severity
  const recipients = getRecipients(attributes.severity, alertData);

  // Build the email
  const email = buildAlertEmail(alertData, attributes);

  // Send to all recipients
  try {
    await sgMail.send({
      to: recipients,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: email.subject,
      html: email.htmlBody,
      text: email.textBody,
      categories: ['alert-notification', attributes.severity || 'unknown'],
      customArgs: {
        alertId: alertData.alertId || message.messageId,
        severity: attributes.severity || 'unknown'
      }
    });

    console.log(`Alert email sent to ${recipients.length} recipients`);
  } catch (error) {
    console.error('SendGrid error:', error.response?.body || error.message);
    throw error; // Trigger retry
  }
});

function getRecipients(severity, alertData) {
  // Route alerts to different recipients based on severity
  const criticalRecipients = (process.env.CRITICAL_RECIPIENTS || '').split(',').filter(Boolean);
  const recipients = [...DEFAULT_RECIPIENTS];

  if (severity === 'critical' || severity === 'error') {
    recipients.push(...criticalRecipients);
  }

  // Add any alert-specific recipients
  if (alertData.additionalRecipients) {
    recipients.push(...alertData.additionalRecipients);
  }

  // Deduplicate
  return [...new Set(recipients)];
}

function buildAlertEmail(alertData, attributes) {
  const severity = (attributes.severity || 'info').toUpperCase();
  const severityColor = {
    CRITICAL: '#FF0000',
    ERROR: '#FF4444',
    WARNING: '#FFA500',
    INFO: '#36A2EB'
  }[severity] || '#808080';

  const timestamp = alertData.timestamp
    ? new Date(alertData.timestamp).toLocaleString('en-US', { timeZone: 'UTC' })
    : new Date().toLocaleString('en-US', { timeZone: 'UTC' });

  const subject = `[${severity}] ${alertData.title || alertData.summary || 'System Alert'}`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${severityColor}; color: white; padding: 16px; border-radius: 4px 4px 0 0;">
        <h2 style="margin: 0;">${severity} Alert</h2>
      </div>
      <div style="border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 4px 4px;">
        <h3 style="margin-top: 0;">${alertData.title || 'System Alert'}</h3>
        <p>${alertData.message || alertData.description || 'No description provided.'}</p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 120px;">Severity</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${severity}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Source</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${alertData.source || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Time (UTC)</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${timestamp}</td>
          </tr>
          ${alertData.metric ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Metric</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${alertData.metric}: ${alertData.metricValue}</td>
          </tr>
          ` : ''}
          ${alertData.threshold ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Threshold</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${alertData.threshold}</td>
          </tr>
          ` : ''}
        </table>

        ${alertData.details ? `
        <div style="background: #f5f5f5; padding: 12px; border-radius: 4px; margin-top: 16px;">
          <strong>Additional Details:</strong>
          <pre style="white-space: pre-wrap; word-break: break-word; margin: 8px 0 0 0;">${
            typeof alertData.details === 'string'
              ? alertData.details
              : JSON.stringify(alertData.details, null, 2)
          }</pre>
        </div>
        ` : ''}

        ${alertData.dashboardUrl ? `
        <p style="margin-top: 20px;">
          <a href="${alertData.dashboardUrl}"
             style="background: ${severityColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Dashboard
          </a>
        </p>
        ` : ''}

        <p style="color: #999; font-size: 12px; margin-top: 24px;">
          Alert ID: ${alertData.alertId || 'N/A'} | Sent at ${new Date().toISOString()}
        </p>
      </div>
    </div>
  `;

  const textBody = `
${severity} ALERT: ${alertData.title || 'System Alert'}

${alertData.message || alertData.description || 'No description provided.'}

Severity: ${severity}
Source: ${alertData.source || 'Unknown'}
Time (UTC): ${timestamp}
${alertData.metric ? `Metric: ${alertData.metric}: ${alertData.metricValue}` : ''}
${alertData.threshold ? `Threshold: ${alertData.threshold}` : ''}

${alertData.details ? `Details:\n${JSON.stringify(alertData.details, null, 2)}` : ''}
${alertData.dashboardUrl ? `Dashboard: ${alertData.dashboardUrl}` : ''}

Alert ID: ${alertData.alertId || 'N/A'}
  `.trim();

  return { subject, htmlBody, textBody };
}
```

Package.json:

```json
{
  "name": "sendgrid-alert-emailer",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/functions-framework": "^3.0.0",
    "@sendgrid/mail": "^8.1.0"
  }
}
```

## Deploying the Function

```bash
# Deploy with SendGrid API key from Secret Manager
gcloud functions deploy send-alert-email \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=sendAlertEmail \
  --trigger-topic=alert-notifications \
  --memory=256Mi \
  --timeout=30s \
  --set-env-vars="FROM_EMAIL=alerts@example.com,FROM_NAME=System Alerts,ALERT_RECIPIENTS=team@example.com,CRITICAL_RECIPIENTS=oncall@example.com" \
  --set-secrets="SENDGRID_API_KEY=sendgrid-api-key:latest"
```

## Using SendGrid Templates

Instead of building HTML in code, use SendGrid's dynamic templates for easier management and design:

```javascript
// Send using a SendGrid dynamic template
async function sendTemplatedAlert(recipients, alertData, attributes) {
  const templateId = process.env.SENDGRID_TEMPLATE_ID;

  await sgMail.send({
    to: recipients,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    templateId: templateId,
    dynamicTemplateData: {
      severity: (attributes.severity || 'info').toUpperCase(),
      title: alertData.title,
      message: alertData.message,
      source: alertData.source,
      timestamp: alertData.timestamp,
      metric: alertData.metric,
      metricValue: alertData.metricValue,
      threshold: alertData.threshold,
      dashboardUrl: alertData.dashboardUrl,
      details: alertData.details
    }
  });
}
```

## Alert Throttling

Prevent email floods when alerts fire rapidly by implementing throttling:

```javascript
// Simple in-memory throttle (resets when the instance is recycled)
const recentAlerts = new Map();
const THROTTLE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ALERTS_PER_KEY = 3;

function shouldThrottle(alertKey) {
  const now = Date.now();
  const history = recentAlerts.get(alertKey) || [];

  // Remove entries outside the throttle window
  const recent = history.filter(t => now - t < THROTTLE_WINDOW_MS);

  if (recent.length >= MAX_ALERTS_PER_KEY) {
    console.log(`Throttling alert ${alertKey}: ${recent.length} alerts in the last 5 minutes`);
    return true;
  }

  recent.push(now);
  recentAlerts.set(alertKey, recent);
  return false;
}

// Use in the main handler
functions.cloudEvent('sendAlertEmail', async (cloudEvent) => {
  // ... parse alert data ...

  const throttleKey = `${alertData.source}-${alertData.type}`;
  if (shouldThrottle(throttleKey)) {
    console.log('Alert throttled, skipping email send');
    return;
  }

  // Continue with email sending...
});
```

## Publishing Alert Messages

From your application or monitoring system:

```javascript
// Publish an alert that triggers an email notification
const { PubSub } = require('@google-cloud/pubsub');
const pubsub = new PubSub();

async function sendAlert(alert) {
  const topic = pubsub.topic('alert-notifications');

  await topic.publishMessage({
    data: Buffer.from(JSON.stringify({
      title: alert.title,
      message: alert.message,
      source: alert.source,
      timestamp: new Date().toISOString(),
      metric: alert.metric,
      metricValue: alert.value,
      threshold: alert.threshold,
      dashboardUrl: `https://console.cloud.google.com/monitoring/dashboards/${alert.dashboardId}`,
      alertId: `alert-${Date.now()}`
    })),
    attributes: {
      severity: alert.severity,
      source: alert.source
    }
  });
}

// Example: send an error rate alert
await sendAlert({
  title: 'Error Rate Spike on API Server',
  message: 'The error rate on /api/users exceeded the 5% threshold for more than 5 minutes.',
  source: 'api-server-prod',
  severity: 'error',
  metric: 'error_rate',
  value: '8.3%',
  threshold: '> 5%',
  dashboardId: 'api-health'
});
```

## Python Version

```python
# main.py - SendGrid email notification in Python
import functions_framework
import base64
import json
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

sg = SendGridAPIClient(os.environ.get('SENDGRID_API_KEY'))

@functions_framework.cloud_event
def send_alert_email(cloud_event):
    """Send email notification when an alert fires."""
    message_data = base64.b64decode(
        cloud_event.data["message"]["data"]
    ).decode("utf-8")

    alert = json.loads(message_data)
    attributes = cloud_event.data["message"].get("attributes", {})
    severity = attributes.get("severity", "info").upper()

    # Build the email
    mail = Mail(
        from_email=Email(os.environ.get('FROM_EMAIL', 'alerts@example.com')),
        to_emails=[To(r) for r in os.environ.get('ALERT_RECIPIENTS', '').split(',')],
        subject=f'[{severity}] {alert.get("title", "System Alert")}',
        html_content=build_html(alert, severity)
    )

    response = sg.send(mail)
    print(f"Email sent, status: {response.status_code}")
```

## Monitoring

Monitor your email notification pipeline with OneUptime to ensure alerts actually reach your team. Track email delivery rates, SendGrid API response times, and any throttled alerts. The worst outcome is having an alerting system that silently fails - you think you are being notified but emails are not going out. Regular monitoring of the notification pipeline itself is essential for maintaining confidence that your team will hear about problems when they happen.

SendGrid and Cloud Functions make a reliable email notification system that scales from a few alerts per day to thousands without any infrastructure management. The key is building in proper throttling, template management, and monitoring so the system stays trustworthy.
