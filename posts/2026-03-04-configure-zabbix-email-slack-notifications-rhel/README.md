# How to Configure Zabbix Email and Slack Notifications on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Zabbix, Notifications, Email, Slack, Alerting, Linux

Description: Set up Zabbix alert notifications via email and Slack on RHEL so your team gets immediate alerts when monitoring triggers fire.

---

Timely alerts are critical for incident response. Zabbix supports multiple notification channels including email and Slack. This guide covers configuring both on RHEL.

## Configure Email Notifications

### Set Up the Mail Server

```bash
# Install postfix for sending emails
sudo dnf install -y postfix mailx

# Configure postfix as a relay (using an SMTP relay like Gmail or your mail server)
sudo tee -a /etc/postfix/main.cf << 'CONF'
# Relay through an external SMTP server
relayhost = [smtp.gmail.com]:587
smtp_use_tls = yes
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_CAfile = /etc/pki/tls/certs/ca-bundle.crt
CONF

# Create the SASL password file
sudo tee /etc/postfix/sasl_passwd << 'AUTH'
[smtp.gmail.com]:587 alerts@example.com:YourAppPassword
AUTH

sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd*

# Start postfix
sudo systemctl enable --now postfix

# Test email sending
echo "Test from Zabbix server" | mail -s "Test Email" admin@example.com
```

### Configure Email in Zabbix

1. Go to Alerts > Media types > Email
2. Configure the settings:

```text
SMTP server: localhost
SMTP port: 25
SMTP helo: zabbix.example.com
SMTP email: zabbix@example.com
Connection security: None (local postfix handles TLS)
```

3. Test by clicking "Test" and entering a recipient address

### Assign Email Media to Users

1. Go to Users > Admin (or your user)
2. Click the Media tab
3. Add media:
   - Type: Email
   - Send to: admin@example.com
   - Severity: Select which severities to receive

## Configure Slack Notifications

### Create a Slack Webhook

1. Go to https://api.slack.com/apps and create a new app
2. Enable Incoming Webhooks
3. Add a new webhook to a channel (e.g., #monitoring-alerts)
4. Copy the webhook URL

### Configure Slack Media Type in Zabbix

Zabbix 7.0 includes a built-in Slack media type:

1. Go to Alerts > Media types
2. Find "Slack" in the list (or import it from Zabbix integrations)
3. Set the parameters:

```text
bot_token: xoxb-your-bot-token
channel: #monitoring-alerts
```

Alternatively, use a webhook-based approach:

```bash
# Create a custom alert script on the Zabbix server
sudo tee /usr/lib/zabbix/alertscripts/slack.sh << 'SCRIPT'
#!/bin/bash
# Slack webhook notification script
# Arguments: $1 = webhook URL, $2 = subject, $3 = message

WEBHOOK_URL="$1"
SUBJECT="$2"
MESSAGE="$3"

# Send to Slack
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"*${SUBJECT}*\n${MESSAGE}\",
    \"username\": \"Zabbix\",
    \"icon_emoji\": \":warning:\"
  }"
SCRIPT

sudo chmod +x /usr/lib/zabbix/alertscripts/slack.sh
sudo chown zabbix:zabbix /usr/lib/zabbix/alertscripts/slack.sh
```

### Create the Slack Media Type

1. Go to Alerts > Media types > Create media type
2. Settings:

```text
Name: Slack Webhook
Type: Script
Script name: slack.sh
Script parameters:
  {ALERT.SENDTO}     (the webhook URL)
  {ALERT.SUBJECT}
  {ALERT.MESSAGE}
```

### Assign Slack Media to Users

1. Go to Users > Admin > Media tab
2. Add media:
   - Type: Slack Webhook
   - Send to: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
   - Severity: Select appropriate levels

## Create Trigger Actions

1. Go to Alerts > Actions > Trigger actions > Create action
2. Set conditions (e.g., trigger severity >= High)
3. Under Operations, add:
   - Send to users: Admin
   - Send only to: Email, Slack Webhook
4. Set recovery and update operations similarly

## Test the Notifications

Trigger a test alert:

```bash
# Temporarily stop a monitored service to trigger an alert
sudo systemctl stop nginx
# Wait for the trigger to fire (check interval + alert delay)

# Restart to clear the alert
sudo systemctl start nginx
```

Check your email inbox and Slack channel for the notifications.
