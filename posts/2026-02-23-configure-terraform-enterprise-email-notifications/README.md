# How to Configure Terraform Enterprise Email Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Email, Notifications, SMTP, DevOps

Description: Learn how to configure email notifications in Terraform Enterprise, including SMTP setup, notification triggers, workspace-level notifications, and troubleshooting delivery issues.

---

Terraform Enterprise can send email notifications for run events - plan completion, apply requests, policy failures, and errors. These notifications keep teams informed about infrastructure changes without requiring everyone to watch the TFE dashboard. When configured properly, email notifications serve as an early warning system for failed applies, pending approvals, and policy violations.

This guide covers the full setup from SMTP configuration to workspace-level notification rules.

## Configuring SMTP

Before TFE can send any emails, you need to configure an SMTP server. This is a site-wide setting managed by administrators.

### Via Environment Variables

```bash
# SMTP configuration for TFE
# Add these to your TFE environment variables or docker-compose.yml

# SMTP server address
TFE_SMTP_HOST=smtp.example.com

# SMTP port (25, 465, or 587)
TFE_SMTP_PORT=587

# Authentication credentials
TFE_SMTP_USERNAME=tfe-notifications@example.com
TFE_SMTP_PASSWORD=your-smtp-password

# Encryption method: starttls, ssl, or none
TFE_SMTP_AUTH=login
TFE_SMTP_STARTTLS=true

# Sender address - this is what recipients see
TFE_SMTP_SENDER=tfe@example.com
```

### Docker Compose Configuration

```yaml
# docker-compose.yml - SMTP section
version: "3.9"
services:
  tfe:
    image: images.releases.hashicorp.com/hashicorp/terraform-enterprise:latest
    environment:
      TFE_HOSTNAME: tfe.example.com
      # SMTP configuration
      TFE_SMTP_HOST: smtp.example.com
      TFE_SMTP_PORT: "587"
      TFE_SMTP_USERNAME: tfe-notifications@example.com
      TFE_SMTP_PASSWORD: "${SMTP_PASSWORD}"
      TFE_SMTP_STARTTLS: "true"
      TFE_SMTP_AUTH: login
      TFE_SMTP_SENDER: "Terraform Enterprise <tfe@example.com>"
      # ... other TFE environment variables
```

### Using Cloud Email Services

#### Amazon SES

```bash
# Amazon SES SMTP configuration
TFE_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
TFE_SMTP_PORT=587
TFE_SMTP_USERNAME=AKIA...your-ses-smtp-username
TFE_SMTP_PASSWORD=your-ses-smtp-password
TFE_SMTP_STARTTLS=true
TFE_SMTP_AUTH=login
TFE_SMTP_SENDER=tfe@example.com
```

Before using SES, verify the sender email or domain:

```bash
# Verify a sender domain in SES
aws ses verify-domain-identity --domain example.com

# Or verify a single email address
aws ses verify-email-identity --email-address tfe@example.com

# Create SMTP credentials
aws iam create-user --user-name tfe-ses-smtp
aws iam attach-user-policy \
  --user-name tfe-ses-smtp \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
```

#### SendGrid

```bash
# SendGrid SMTP configuration
TFE_SMTP_HOST=smtp.sendgrid.net
TFE_SMTP_PORT=587
TFE_SMTP_USERNAME=apikey
TFE_SMTP_PASSWORD=SG.your-sendgrid-api-key
TFE_SMTP_STARTTLS=true
TFE_SMTP_AUTH=login
TFE_SMTP_SENDER=tfe@example.com
```

## Testing SMTP Configuration

After configuring SMTP, verify it works:

```bash
# Send a test email through TFE admin settings
curl -s \
  --header "Authorization: Bearer ${TFE_ADMIN_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/admin/smtp-settings/test" \
  --data '{
    "data": {
      "type": "smtp-tests",
      "attributes": {
        "test-email-address": "admin@example.com"
      }
    }
  }'

# Check TFE logs for SMTP errors
docker logs tfe 2>&1 | grep -i smtp
```

If TFE does not have a test endpoint, send a test from the command line to verify SMTP connectivity:

```bash
# Test SMTP from the TFE host directly
# Install swaks if not present
apt-get install -y swaks

swaks \
  --to admin@example.com \
  --from tfe@example.com \
  --server smtp.example.com \
  --port 587 \
  --auth LOGIN \
  --auth-user tfe-notifications@example.com \
  --auth-password "${SMTP_PASSWORD}" \
  --tls \
  --header "Subject: TFE SMTP Test" \
  --body "This is a test email from Terraform Enterprise."
```

## Configuring Workspace Notifications

Once SMTP is working, set up notifications at the workspace level.

### Via the UI

1. Go to the workspace > **Settings** > **Notifications**
2. Click **Create a Notification**
3. Select **Email** as the destination
4. Choose which events trigger notifications:
   - Run created
   - Needs attention (plan complete, waiting for approval)
   - Run completed (applied successfully)
   - Run errored
5. Add recipient email addresses

### Via the API

```bash
# Create an email notification for a workspace
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/notification-configurations" \
  --data '{
    "data": {
      "type": "notification-configurations",
      "attributes": {
        "name": "Team Notifications",
        "destination-type": "email",
        "enabled": true,
        "triggers": [
          "run:needs_attention",
          "run:completed",
          "run:errored"
        ],
        "email-addresses": [
          "platform-team@example.com",
          "oncall@example.com"
        ]
      }
    }
  }'
```

### Notification Triggers Explained

| Trigger | Description | Use Case |
|---|---|---|
| run:created | A new run starts | High-activity awareness |
| run:planning | Plan phase begins | Detailed tracking |
| run:needs_attention | Run needs manual approval or has policy issues | Approval workflows |
| run:completed | Run applied successfully | Completion tracking |
| run:errored | Run failed | Error alerting |

### Webhook Notifications

In addition to email, TFE supports webhook notifications for more flexibility:

```bash
# Create a webhook notification (e.g., to Slack)
curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  --header "Content-Type: application/vnd.api+json" \
  --request POST \
  "${TFE_URL}/api/v2/workspaces/${WS_ID}/notification-configurations" \
  --data '{
    "data": {
      "type": "notification-configurations",
      "attributes": {
        "name": "Slack Notifications",
        "destination-type": "generic",
        "enabled": true,
        "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        "triggers": [
          "run:needs_attention",
          "run:errored"
        ]
      }
    }
  }'
```

## Bulk Notification Setup

For organizations with many workspaces, set up notifications programmatically:

```bash
#!/bin/bash
# setup-notifications.sh
# Add email notifications to all production workspaces

NOTIFICATION_EMAILS="platform-team@example.com,infra-oncall@example.com"

# Get all production workspaces
WORKSPACES=$(curl -s \
  --header "Authorization: Bearer ${TFE_TOKEN}" \
  "${TFE_URL}/api/v2/organizations/my-org/workspaces?search[tags]=production&page[size]=100" | \
  jq -r '.data[] | .id')

for WS_ID in ${WORKSPACES}; do
  WS_NAME=$(curl -s \
    --header "Authorization: Bearer ${TFE_TOKEN}" \
    "${TFE_URL}/api/v2/workspaces/${WS_ID}" | jq -r '.data.attributes.name')

  echo "Setting up notifications for ${WS_NAME}..."

  curl -s \
    --header "Authorization: Bearer ${TFE_TOKEN}" \
    --header "Content-Type: application/vnd.api+json" \
    --request POST \
    "${TFE_URL}/api/v2/workspaces/${WS_ID}/notification-configurations" \
    --data '{
      "data": {
        "type": "notification-configurations",
        "attributes": {
          "name": "Production Alerts",
          "destination-type": "email",
          "enabled": true,
          "triggers": ["run:needs_attention", "run:errored"],
          "email-addresses": ["'"${NOTIFICATION_EMAILS}"'"]
        }
      }
    }' > /dev/null

  # Avoid rate limiting
  sleep 0.5
done

echo "Notifications configured for all production workspaces."
```

## Troubleshooting Email Issues

**Emails not being sent**: Check the TFE logs for SMTP errors. The most common cause is wrong SMTP credentials or firewall rules blocking outbound connections on port 587.

```bash
# Check TFE logs for SMTP-related errors
docker logs tfe 2>&1 | grep -i -E "smtp|mail|email" | tail -20
```

**Emails going to spam**: Configure SPF, DKIM, and DMARC records for your sender domain. Without these, many email providers will flag TFE notifications as spam.

```bash
# Check your DNS records for email authentication
dig TXT example.com | grep -i spf
dig TXT _dmarc.example.com
```

**Delivery delays**: If emails are slow, check your SMTP server's queue. Cloud email services like SES and SendGrid rarely have this issue, but on-premises SMTP servers can get backed up.

**Connection timeout**: Verify the TFE host can reach the SMTP server on the configured port:

```bash
# Test SMTP port connectivity from TFE
nc -zv smtp.example.com 587
```

## Summary

Email notifications in Terraform Enterprise keep teams informed about infrastructure changes, pending approvals, and failures without requiring constant dashboard watching. The setup has two parts: configure SMTP at the admin level, then set up notification rules on individual workspaces. For production environments, focus notifications on events that require action - pending approvals and errors - rather than every run event. Combine email with webhook notifications for Slack or other chat tools to build a notification strategy that reaches the right people at the right time.
