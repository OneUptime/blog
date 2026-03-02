# How to Configure Postfix with SendGrid on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, SendGrid, SMTP

Description: Configure Postfix on Ubuntu to relay outgoing email through SendGrid, including API key authentication, TLS configuration, and deliverability best practices.

---

SendGrid is a popular transactional email service that handles deliverability, reputation management, and analytics. Routing your server's outbound email through SendGrid lets you take advantage of their infrastructure rather than managing your own IP reputation. The integration with Postfix is straightforward: Postfix handles local email submission and routes everything outbound through SendGrid's SMTP servers.

## Creating a SendGrid API Key

Rather than using your SendGrid account password, you should create a dedicated API key for SMTP authentication:

1. Log into your SendGrid account at `app.sendgrid.com`
2. Go to Settings > API Keys
3. Click "Create API Key"
4. Name it something descriptive like "postfix-relay"
5. Select "Restricted Access"
6. Under "Mail Send", grant "Mail Send" access
7. Click "Create & View" and copy the API key immediately (it is only shown once)

The API key looks like: `SG.abcdefghijklmnop.qrstuvwxyz1234567890`

## Installing Postfix

```bash
# Install Postfix and SASL libraries
sudo apt update
sudo apt install -y postfix libsasl2-modules mailutils

# During the configuration dialog:
# Choose "Internet Site"
# Set the system mail name to your domain

# Verify installation
postconf mail_version
sudo systemctl status postfix
```

## Configuring Postfix for SendGrid

SendGrid's SMTP relay accepts connections on port 587 with STARTTLS authentication:

```bash
sudo nano /etc/postfix/main.cf
```

```ini
# /etc/postfix/main.cf - SendGrid relay configuration

# Server identity - must match your sending domain
myhostname = mail.yourdomain.com
mydomain = yourdomain.com
myorigin = $mydomain

# Only accept mail submitted locally
inet_interfaces = loopback-only
mydestination = localhost

# Route all outbound mail through SendGrid
relayhost = [smtp.sendgrid.net]:587

# SASL authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous

# TLS - SendGrid requires encrypted connections
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache
smtp_tls_loglevel = 1

# Only use modern TLS versions
smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtp_tls_ciphers = high
```

## Authentication File

Create the SASL password file. SendGrid uses "apikey" as the username regardless of which API key you use:

```bash
sudo nano /etc/postfix/sasl_passwd
```

```
# SendGrid SMTP relay
# Username is always "apikey" - the actual key is the password
[smtp.sendgrid.net]:587    apikey:SG.your-actual-api-key-here
```

Secure and hash it:

```bash
# Set strict permissions
sudo chmod 600 /etc/postfix/sasl_passwd

# Generate the hash database
sudo postmap /etc/postfix/sasl_passwd

# Verify both files exist
ls -la /etc/postfix/sasl_passwd*
```

## Applying the Configuration

```bash
# Check for syntax errors
sudo postfix check

# Reload Postfix
sudo systemctl reload postfix

# Send a test email
echo "Test from $(hostname)" | \
  mail -s "Postfix/SendGrid test $(date)" your-address@example.com

# Watch the mail log
sudo tail -f /var/log/mail.log
```

A successful delivery in the log:

```
postfix/smtp[1234]: to=<recipient@example.com>,
  relay=smtp.sendgrid.net[167.89.x.x]:587,
  status=sent (250 Ok: queued as ...)
```

## Setting Up Sender Verification in SendGrid

SendGrid requires you to verify the domain or email address you send from. Without this, your mail may be rejected or marked as spam.

**Domain Authentication (recommended):**

1. In SendGrid, go to Settings > Sender Authentication
2. Click "Authenticate Your Domain"
3. Follow the instructions to add DNS records (CNAME records for SendGrid's servers)
4. Once DNS propagates, SendGrid verifies the domain

This allows you to send from any address at your verified domain.

**Single Sender Verification (simpler):**

1. Go to Settings > Sender Authentication > Single Sender Verification
2. Click "Create New Sender"
3. Fill in the From Name, From Email, Reply To, etc.
4. Click "Create" and then verify via the email SendGrid sends you

You can only send from verified sender addresses with this method.

## Configuring Postfix Sender Address

Postfix needs to send from a verified SendGrid sender address:

```bash
sudo nano /etc/postfix/main.cf
```

Add or modify:

```ini
# Rewrite sender addresses to use a verified sender
sender_canonical_maps = hash:/etc/postfix/sender_canonical
```

```bash
sudo nano /etc/postfix/sender_canonical
```

```
# Map local senders to the verified SendGrid sender address
root                    notifications@yourdomain.com
www-data                app@yourdomain.com
yourapp                 app@yourdomain.com
```

```bash
sudo postmap /etc/postfix/sender_canonical
sudo systemctl reload postfix
```

## SendGrid Activity and Deliverability

One advantage of SendGrid over direct delivery is the visibility into what happens to your email:

1. Log into SendGrid and go to Activity
2. Search for your test email to see if it was delivered, bounced, or spam-filtered
3. Check the Suppressions section for bounced or spam-complained addresses

From the command line, you can also monitor via the SendGrid API:

```bash
# Check recent activity via API (requires API key with stats permissions)
curl -s \
  -H "Authorization: Bearer SG.your-api-key" \
  "https://api.sendgrid.com/v3/stats?start_date=$(date +%Y-%m-%d)&aggregated_by=day" | \
  python3 -m json.tool
```

## Handling Bounces and Suppressions

SendGrid automatically suppresses sending to addresses that have bounced hard. If an address is suppressed and you have verified it is a real address:

```bash
# Remove from suppression list via API
curl -s -X DELETE \
  -H "Authorization: Bearer SG.your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"emails": ["problematic@example.com"]}' \
  "https://api.sendgrid.com/v3/suppressions/bounces"
```

## Using Port 465 (SSL)

Some environments block port 587. SendGrid also supports port 465 with SSL:

```ini
# In main.cf, use port 465
relayhost = [smtp.sendgrid.net]:465

# Enable SSL wrapper mode instead of STARTTLS
smtp_tls_wrappermode = yes
smtp_tls_security_level = encrypt
```

## Monitoring and Rate Limits

SendGrid has sending limits based on your plan:

```bash
# Count messages sent today
sudo grep "smtp.sendgrid.net" /var/log/mail.log | \
  grep "status=sent" | wc -l

# Messages per hour trend
sudo grep "smtp.sendgrid.net" /var/log/mail.log | \
  grep "status=sent" | \
  awk '{print $1, $2}' | \
  cut -d: -f1 | \
  sort | uniq -c | \
  tail -24
```

If you approach SendGrid's sending limits, they will throttle connections and queue messages. Monitor your Postfix queue alongside SendGrid stats:

```bash
# Check current queue depth
mailq | grep -c "^[0-9A-F]"

# Messages in deferred queue
mailq | grep "Deferred" | wc -l
```

## Troubleshooting Common Issues

**Authentication failures:**

```bash
# Check the sasl_passwd file has the right format
cat /etc/postfix/sasl_passwd
# Should be: [smtp.sendgrid.net]:587    apikey:SG.xxxxx

# Verify the .db file is current
ls -la /etc/postfix/sasl_passwd*
# sasl_passwd.db should be newer than sasl_passwd

# Regenerate if needed
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl reload postfix
```

**550 "From address doesn't match a verified Sender Identity":**

```bash
# Check what sender address Postfix is using
sudo grep "from=" /var/log/mail.log | tail -10

# The from address must be in SendGrid's verified senders or verified domain
# Add sender_canonical_maps to rewrite to a verified address
```

**Messages delivered but going to spam:**

This is usually a sender authentication issue. Verify that your domain's DNS has:
- SPF record: `v=spf1 include:sendgrid.net ~all`
- DKIM records: provided by SendGrid's domain authentication setup
- DMARC record for enforcement

SendGrid's dashboard shows authentication status for recent messages.
