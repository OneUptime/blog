# How to Set Up Email Notifications with Postfix on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Postfix, Email, SMTP, Notifications, Tutorial

Description: Configure Postfix on Ubuntu to send email notifications for system alerts, monitoring, and application events.

---

Postfix is a powerful mail transfer agent (MTA) that can send email notifications from your server. This guide focuses on configuring Postfix as a send-only mail server for system alerts, cron job notifications, and application emails.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- Valid domain name (recommended)
- Access to DNS settings (for SPF/DKIM)

## Installation

```bash
# Update package lists
sudo apt update

# Install Postfix and mail utilities
sudo apt install postfix mailutils -y
```

During installation, select:
- **General type of mail configuration**: Internet Site
- **System mail name**: Your domain (e.g., example.com)

## Basic Configuration

### Main Configuration File

```bash
# Edit Postfix main configuration
sudo nano /etc/postfix/main.cf
```

Send-only configuration:

```
# Basic settings
smtpd_banner = $myhostname ESMTP
biff = no
append_dot_mydomain = no

# TLS parameters
smtpd_tls_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file=/etc/ssl/private/ssl-cert-snakeoil.key
smtpd_tls_security_level=may
smtp_tls_security_level=may
smtp_tls_CApath=/etc/ssl/certs

# Network settings
myhostname = server.example.com
mydomain = example.com
myorigin = $mydomain
mydestination = $myhostname, localhost.$mydomain, localhost
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
inet_interfaces = loopback-only
inet_protocols = ipv4

# Disable local delivery (send-only)
default_transport = smtp
relay_transport = smtp

# Queue settings
mailbox_size_limit = 0
recipient_delimiter = +

# Aliases
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
```

### Apply Configuration

```bash
# Restart Postfix
sudo systemctl restart postfix

# Check status
sudo systemctl status postfix

# Test configuration
sudo postfix check
```

## Testing Email Delivery

### Send Test Email

```bash
# Send test email using mail command
echo "This is a test email from $(hostname)" | mail -s "Test Email" your@email.com

# Or using sendmail
echo -e "Subject: Test Email\n\nThis is a test from Postfix on $(hostname)" | sendmail your@email.com
```

### Check Mail Queue

```bash
# View mail queue
mailq

# Flush queue (attempt delivery)
sudo postqueue -f

# Delete all queued mail
sudo postsuper -d ALL
```

### View Mail Logs

```bash
# Check mail logs
sudo tail -f /var/log/mail.log

# Search for specific recipient
sudo grep "your@email.com" /var/log/mail.log
```

## Using External SMTP Relay

For better deliverability, relay through an external SMTP provider.

### Gmail SMTP Relay

```bash
sudo nano /etc/postfix/main.cf
```

Add:

```
# Gmail SMTP relay
relayhost = [smtp.gmail.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
```

Create password file:

```bash
sudo nano /etc/postfix/sasl_passwd
```

```
[smtp.gmail.com]:587 your-email@gmail.com:your-app-password
```

**Note:** Use an App Password, not your regular Gmail password.

```bash
# Create hash database and secure file
sudo postmap /etc/postfix/sasl_passwd
sudo chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db

# Restart Postfix
sudo systemctl restart postfix
```

### SendGrid SMTP Relay

```
relayhost = [smtp.sendgrid.net]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
```

Password file:
```
[smtp.sendgrid.net]:587 apikey:your-sendgrid-api-key
```

### Amazon SES SMTP Relay

```
relayhost = [email-smtp.us-east-1.amazonaws.com]:587
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_security_level = encrypt
```

## Configure Sender Address

### Set Default From Address

```bash
# Create sender canonical map
sudo nano /etc/postfix/sender_canonical
```

```
# Map local users to email addresses
root    admin@example.com
www-data noreply@example.com
@server.example.com @example.com
```

```bash
# Add to main.cf
echo "sender_canonical_maps = hash:/etc/postfix/sender_canonical" | sudo tee -a /etc/postfix/main.cf

# Create hash and reload
sudo postmap /etc/postfix/sender_canonical
sudo systemctl reload postfix
```

### Set Generic Sender Rewriting

```bash
sudo nano /etc/postfix/generic
```

```
# Rewrite all local addresses
root@server.example.com notifications@example.com
@server.example.com @example.com
```

```bash
# Add to main.cf
echo "smtp_generic_maps = hash:/etc/postfix/generic" | sudo tee -a /etc/postfix/main.cf

# Create hash and reload
sudo postmap /etc/postfix/generic
sudo systemctl reload postfix
```

## Configure Mail Aliases

```bash
# Edit aliases file
sudo nano /etc/aliases
```

```
# Required aliases
postmaster: root
mailer-daemon: postmaster

# Redirect root mail to admin
root: admin@example.com

# Application aliases
monitoring: alerts@example.com
cron: admin@example.com
www-data: webmaster@example.com
```

```bash
# Rebuild aliases database
sudo newaliases

# Reload Postfix
sudo systemctl reload postfix
```

## Email from Scripts

### Shell Script

```bash
#!/bin/bash
# Send alert email

RECIPIENT="admin@example.com"
SUBJECT="Alert: Disk Space Low"
BODY="Warning: Disk space is below 10% on $(hostname)"

echo "$BODY" | mail -s "$SUBJECT" "$RECIPIENT"
```

### Using sendmail

```bash
#!/bin/bash
# More control over headers

/usr/sbin/sendmail -t <<EOF
To: admin@example.com
From: monitoring@example.com
Subject: Server Alert

Disk space warning on $(hostname)
Current usage: $(df -h / | tail -1 | awk '{print $5}')
EOF
```

### Python Script

```python
#!/usr/bin/env python3
import smtplib
from email.mime.text import MIMEText

# Create message
msg = MIMEText("This is a test alert from the server")
msg['Subject'] = 'Server Alert'
msg['From'] = 'monitoring@example.com'
msg['To'] = 'admin@example.com'

# Send via local Postfix
with smtplib.SMTP('localhost') as server:
    server.send_message(msg)
```

## Configure Cron Email Notifications

### Set MAILTO in Crontab

```bash
crontab -e
```

```bash
# Send cron output to this address
MAILTO=admin@example.com

# Set sender address
MAILFROM=cron@example.com

# Cron jobs
0 * * * * /usr/local/bin/hourly-task.sh
0 2 * * * /usr/local/bin/nightly-backup.sh
```

### Suppress Successful Output

```bash
# Only email on errors
0 * * * * /usr/local/bin/task.sh > /dev/null 2>&1 || echo "Task failed" | mail -s "Cron Error" admin@example.com
```

## DNS Configuration

### SPF Record

Add to your domain's DNS:

```
v=spf1 a mx ip4:YOUR_SERVER_IP -all
```

Or for relay through Gmail:
```
v=spf1 include:_spf.google.com ~all
```

### PTR Record (Reverse DNS)

Contact your hosting provider to set PTR record for your IP to match your mail hostname.

## Security Hardening

### Restrict Relay

```bash
sudo nano /etc/postfix/main.cf
```

```
# Only accept mail from localhost
mynetworks = 127.0.0.0/8
inet_interfaces = loopback-only

# Disable open relay
smtpd_relay_restrictions = permit_mynetworks, reject_unauth_destination
```

### Rate Limiting

```
# Limit outgoing rate
smtp_destination_concurrency_limit = 2
smtp_destination_rate_delay = 1s
default_destination_rate_delay = 1s
```

### Enable TLS

```
# Outgoing TLS
smtp_tls_security_level = encrypt
smtp_tls_note_starttls_offer = yes
smtp_tls_CApath = /etc/ssl/certs
```

## Troubleshooting

### Email Not Sending

```bash
# Check Postfix is running
sudo systemctl status postfix

# Check mail queue
mailq

# View detailed logs
sudo tail -f /var/log/mail.log
```

### "Relay access denied"

```bash
# Check mynetworks setting
postconf mynetworks

# Ensure sender domain is correct
postconf mydomain
postconf myorigin
```

### "Connection timed out"

```bash
# Check firewall allows outgoing SMTP
sudo ufw status

# Test SMTP connectivity
telnet smtp.gmail.com 587
nc -zv smtp.gmail.com 587

# Check if port 25 is blocked (common with cloud providers)
telnet mail.example.com 25
```

### Authentication Failed (with relay)

```bash
# Verify password file
sudo cat /etc/postfix/sasl_passwd

# Regenerate hash
sudo postmap /etc/postfix/sasl_passwd

# Check SASL configuration
postconf smtp_sasl_auth_enable
```

### Emails Going to Spam

- Ensure SPF record is configured
- Set up DKIM signing (more complex)
- Use consistent From address
- Use external relay (Gmail, SendGrid) for better reputation

## Monitor Email Delivery

### Simple Log Monitoring

```bash
#!/bin/bash
# Count sent/bounced emails in last hour

SENT=$(grep "$(date '+%b %e %H')" /var/log/mail.log | grep "status=sent" | wc -l)
BOUNCED=$(grep "$(date '+%b %e %H')" /var/log/mail.log | grep "status=bounced" | wc -l)
DEFERRED=$(grep "$(date '+%b %e %H')" /var/log/mail.log | grep "status=deferred" | wc -l)

echo "Last hour: Sent=$SENT, Bounced=$BOUNCED, Deferred=$DEFERRED"
```

### Pflogsumm Reports

```bash
# Install log analyzer
sudo apt install pflogsumm -y

# Generate daily report
sudo pflogsumm /var/log/mail.log
```

---

Postfix configured as a send-only MTA is perfect for server notifications and application emails. For production email delivery, use an external SMTP relay like SendGrid or Amazon SES for better deliverability and reputation management. Always configure SPF records and consider DKIM for improved email authentication.
