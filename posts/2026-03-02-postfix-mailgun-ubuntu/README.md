# How to Configure Postfix with Mailgun on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Mailgun, SMTP

Description: Set up Postfix to relay email through Mailgun on Ubuntu, including domain verification, SMTP credentials, and monitoring sent mail with the Mailgun API.

---

Mailgun is a transactional email service designed specifically for developers, with a straightforward API and good SMTP relay capabilities. It is particularly well-suited for applications that need both programmatic email sending and reliable infrastructure - many teams use the API for application emails and SMTP relay for system notifications.

## Setting Up Mailgun

Before configuring Postfix, set up your Mailgun account and domain:

### Add and Verify Your Domain

1. Log into Mailgun at `app.mailgun.com`
2. Go to Sending > Domains
3. Click "Add New Domain"
4. Enter your domain (e.g., `mg.yourdomain.com` or `yourdomain.com`)
5. Add the DNS records Mailgun provides:
   - TXT record for domain verification
   - TXT record for SPF
   - Two CNAME records for DKIM
   - CNAME record for tracking (optional)
6. Wait for DNS propagation and click "Verify DNS Settings"

Using a subdomain (`mg.yourdomain.com`) is common practice - it isolates Mailgun's sending reputation from your main domain.

### Get SMTP Credentials

1. In Mailgun, go to Sending > Domain Settings for your domain
2. Click "SMTP credentials" tab
3. The default SMTP user is `postmaster@mg.yourdomain.com`
4. Click the password field to set a password (or Reset Password to get a new one)
5. Note your regional SMTP endpoint:
   - US: `smtp.mailgun.org`
   - EU: `smtp.eu.mailgun.org`

## Installing Postfix

```bash
# Install Postfix and SASL libraries
sudo apt update
sudo apt install -y postfix libsasl2-modules mailutils

# Choose "Internet Site" during installation dialog
# Set system mail name to your domain

# Verify installation
sudo systemctl status postfix
postconf mail_version
```

## Postfix Configuration for Mailgun

```bash
sudo nano /etc/postfix/main.cf
```

```ini
# /etc/postfix/main.cf - Mailgun SMTP relay configuration

# Server identity
myhostname = server.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain

# Accept local mail submissions only
inet_interfaces = loopback-only
mydestination = localhost

# Route all outbound mail through Mailgun
# Use EU endpoint if your account is registered in the EU region
relayhost = [smtp.mailgun.org]:587

# Authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous

# TLS encryption - Mailgun requires this
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache
smtp_tls_loglevel = 1

# Disable old protocols
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
```

## SASL Authentication Setup

```bash
sudo nano /etc/postfix/sasl_passwd
```

```
# Mailgun SMTP credentials
# Replace with your actual SMTP username and password
[smtp.mailgun.org]:587    postmaster@mg.yourdomain.com:your-mailgun-smtp-password
```

Secure and hash:

```bash
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd

# Verify both files exist with correct timestamps
ls -la /etc/postfix/sasl_passwd*
```

## Sender Address Mapping

Mailgun only accepts email from addresses at your verified domain:

```bash
sudo nano /etc/postfix/main.cf
```

Add:

```ini
sender_canonical_maps = hash:/etc/postfix/sender_canonical
```

```bash
sudo nano /etc/postfix/sender_canonical
```

```
# Map system users to verified Mailgun sender addresses
root            noreply@yourdomain.com
www-data        app@yourdomain.com
ubuntu          admin@yourdomain.com
cron            monitoring@yourdomain.com
```

```bash
sudo postmap /etc/postfix/sender_canonical
```

## Applying and Testing

```bash
# Check configuration
sudo postfix check

# Reload Postfix
sudo systemctl reload postfix

# Send test email
echo "Test relay via Mailgun from $(hostname)" | \
  mail -s "Postfix/Mailgun test $(date +%Y-%m-%d)" \
  your-address@example.com

# Watch logs
sudo tail -f /var/log/mail.log
```

A successful relay shows:

```
postfix/smtp[1234]: to=<recipient@example.com>,
  relay=smtp.mailgun.org[x.x.x.x]:587,
  status=sent (250 Queued. Thank you.)
```

## Verifying in the Mailgun Dashboard

1. Go to Sending > Logs in Mailgun
2. Find your test message
3. Check the status and delivery details
4. Mailgun shows detailed event information: delivered, failed, bounced, etc.

This is one of Mailgun's strengths over direct SMTP delivery - complete visibility into what happened to each message.

## Using Mailgun API for Better Control

Beyond SMTP relay, Mailgun's API gives you more features. Install the Python SDK for testing:

```bash
# Install Python and Mailgun client
sudo apt install -y python3-pip
pip3 install requests

# Test send via API (not through Postfix)
python3 << 'EOF'
import requests

def send_email():
    return requests.post(
        "https://api.mailgun.net/v3/mg.yourdomain.com/messages",
        auth=("api", "your-mailgun-api-key"),
        data={
            "from": "Sender <noreply@mg.yourdomain.com>",
            "to": ["recipient@example.com"],
            "subject": "Test via Mailgun API",
            "text": "This is a test email via the Mailgun API",
        }
    )

response = send_email()
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
EOF
```

## Mailgun's Sandbox Domain

Mailgun provides a sandbox domain for testing before you verify your own domain. Find it in Sending > Domains - it looks like `sandboxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.mailgun.org`.

With the sandbox, you can only send to "Authorized Recipients" (configured in Mailgun settings). This is useful for development and testing before production setup.

## Monitoring and Rate Limits

Check Mailgun sending statistics:

```bash
# Count messages relayed today
sudo grep "smtp.mailgun.org" /var/log/mail.log | \
  grep "status=sent" | wc -l

# Check for failed deliveries
sudo grep "smtp.mailgun.org" /var/log/mail.log | \
  grep "status=bounced\|status=deferred" | tail -20

# Monitor queue depth
mailq | grep -c "^[0-9A-F]" || echo "Queue empty"
```

Mailgun rate limits depend on your plan:
- Free: 100 emails per day
- Foundation and above: higher limits, varies by plan

For high-volume sending, you can request sending limit increases through Mailgun support.

## Email Validation Before Sending

Mailgun offers an email validation API to check addresses before sending:

```bash
# Validate an email address via Mailgun API
EMAIL="check-this@example.com"
curl -s \
  -G \
  -u "api:your-mailgun-api-key" \
  "https://api.mailgun.net/v4/address/validate" \
  --data-urlencode "address=$EMAIL" | \
  python3 -m json.tool
```

This reduces bounce rates by catching invalid addresses before they damage your sender reputation.

## Handling Mailgun Webhooks

Mailgun can notify your application about email events via HTTP webhooks:

1. Go to Sending > Webhooks in Mailgun
2. Click "Add Webhook"
3. Select event types: delivered, failed, bounced, complained, etc.
4. Enter your webhook URL

Implement a simple webhook receiver:

```python
# webhook_receiver.py - simple Flask webhook receiver
from flask import Flask, request
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

@app.route('/mailgun-webhook', methods=['POST'])
def mailgun_webhook():
    data = request.form.to_dict()
    event = data.get('event', 'unknown')
    recipient = data.get('recipient', 'unknown')

    logging.info(f"Mailgun event: {event} for {recipient}")

    # Handle specific events
    if event == 'bounced':
        # Remove from your mailing list
        logging.warning(f"Bounce for {recipient}: {data.get('description')}")
    elif event == 'complained':
        # Mark as spam complaint, stop sending to this address
        logging.warning(f"Spam complaint from {recipient}")

    return 'OK', 200

if __name__ == '__main__':
    app.run(port=5000)
```

## Troubleshooting

**Authentication failures:**

```bash
# Check the sasl_passwd file content
sudo cat /etc/postfix/sasl_passwd
# Should show: [smtp.mailgun.org]:587    postmaster@...:password

# Regenerate the db file if it might be stale
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl reload postfix

# Test authentication manually with swaks
sudo apt install -y swaks
swaks --to test@example.com \
  --from postmaster@mg.yourdomain.com \
  --server smtp.mailgun.org:587 \
  --tls \
  --auth-user postmaster@mg.yourdomain.com \
  --auth-password "your-password"
```

**"Domain not found" error:**

Verify the domain in Mailgun's dashboard is in "Active" state, not "Unverified". DNS propagation can take time - wait a few hours and try verification again.

**EU region setup:**

If your Mailgun account uses the EU region, update the relay host:

```ini
relayhost = [smtp.eu.mailgun.org]:587
```

And update sasl_passwd accordingly:

```
[smtp.eu.mailgun.org]:587    postmaster@mg.yourdomain.com:your-password
```

Mailgun's combination of simple SMTP relay, comprehensive logging, and API access makes it a solid choice for teams that want visibility into their email delivery alongside reliable infrastructure.
