# How to Set Up Postfix with Gmail SMTP Relay on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, Gmail, SMTP

Description: Configure Postfix on Ubuntu to relay email through Gmail's SMTP servers using an App Password, with TLS encryption and proper authentication setup.

---

Gmail's SMTP servers are a convenient relay option for small setups - personal projects, development servers, or low-volume applications. Google provides solid deliverability and handles the spam reputation management for you. The main requirement is that you use an App Password rather than your regular Google account password, since Google blocks regular password authentication for third-party apps.

## Prerequisites

Before starting, you need:

1. A Google account (personal Gmail or Google Workspace)
2. Two-factor authentication enabled on the account (required to create App Passwords)
3. An App Password generated for Postfix

## Generating a Google App Password

Regular Gmail passwords do not work for SMTP authentication. You need an App Password:

1. Go to your Google Account settings: `myaccount.google.com`
2. Navigate to Security
3. Under "How you sign in to Google", click "2-Step Verification"
4. Scroll to the bottom and click "App passwords"
5. Select "Mail" for the app type
6. Click "Generate"
7. Copy the 16-character password shown (you will not see it again)

The App Password looks like: `abcd efgh ijkl mnop` (with spaces - you can include or remove them when using it in configuration files).

## Installing Postfix

```bash
# Install Postfix and the SASL authentication library
sudo apt update
sudo apt install -y postfix libsasl2-modules mailutils

# If prompted during install, choose "Internet Site"
# Set the system mail name to your domain or hostname

# Verify Postfix is running
sudo systemctl status postfix
```

## Configuring Postfix for Gmail

Edit the main Postfix configuration:

```bash
sudo nano /etc/postfix/main.cf
```

Replace or update the file with this Gmail-specific configuration:

```ini
# /etc/postfix/main.cf - Gmail SMTP relay configuration

# Server identity
myhostname = yourserver.example.com
mydomain = example.com
myorigin = $mydomain

# Accept mail from local processes only
inet_interfaces = loopback-only
mydestination = localhost

# Relay through Gmail
relayhost = [smtp.gmail.com]:587

# SASL authentication
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous

# TLS settings - Gmail requires TLS
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

# Required for Gmail - modern TLS only
smtp_tls_protocols = !SSLv2, !SSLv3
smtp_tls_ciphers = high
smtp_tls_loglevel = 1
```

## Setting Up Authentication

Create the password file:

```bash
sudo nano /etc/postfix/sasl_passwd
```

Add your Gmail credentials. Replace with your actual Gmail address and the App Password you generated:

```text
# Gmail SMTP relay authentication
[smtp.gmail.com]:587    youraccount@gmail.com:your-app-password-here
```

If your App Password has spaces (like `abcd efgh ijkl mnop`), you can remove the spaces when entering it here: `abcdefghijklmnop`.

Secure the file and generate the hash database:

```bash
# Set strict permissions - this file contains a password
sudo chmod 600 /etc/postfix/sasl_passwd

# Generate the hash database that Postfix actually reads
sudo postmap /etc/postfix/sasl_passwd

# Verify both files exist
ls -la /etc/postfix/sasl_passwd*
# Should see: sasl_passwd and sasl_passwd.db
```

## Applying and Testing

```bash
# Check for configuration errors
sudo postfix check

# Reload Postfix
sudo systemctl reload postfix

# Send a test email
echo "This is a test email from $(hostname) at $(date)" | \
  mail -s "Test from Postfix/Gmail relay" your-test-address@example.com

# Watch the log to see what happens
sudo tail -f /var/log/mail.log
```

A successful relay looks like this in the log:

```text
postfix/smtp[1234]: to=<recipient@example.com>, relay=smtp.gmail.com[74.125.x.x]:587,
  delay=1.5, delays=0.1/0.01/0.8/0.6, dsn=2.0.0, status=sent (250 2.0.0 OK ...)
```

## Troubleshooting Gmail Authentication Issues

**"SASL authentication failed" error:**

```bash
# Check the log for the specific error
sudo grep "SASL" /var/log/mail.log | tail -20

# Common causes:
# 1. App Password not entered correctly
# 2. 2FA not enabled on the account
# 3. Regular password used instead of App Password
# 4. App Password revoked by Google

# Fix: regenerate App Password and update sasl_passwd
sudo nano /etc/postfix/sasl_passwd
# Update the password
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl reload postfix
```

**"Connection timed out" or "Connection refused":**

```bash
# Check if port 587 is accessible from your server
nc -z -v smtp.gmail.com 587

# If blocked by your hosting provider, try port 465 instead
# (SSL/TLS from the start, not STARTTLS)
# Change relayhost to: [smtp.gmail.com]:465
# Add: smtp_tls_wrappermode = yes
```

**Gmail blocking the connection:**

Google sometimes blocks connections from IPs with poor reputation. If you see "Authentication was valid, but not registered as a Google account", the IP may be on a blocklist. Use a different relay service or check Google's Postmaster Tools.

**"Less secure app" errors:**

Google deprecated "less secure app" access. You must use App Passwords. If the account does not have 2FA enabled, you cannot create App Passwords. Enable 2FA on the Google account first.

## Sender Address Configuration

Gmail requires that the sender address matches the authenticated account, or it will rewrite or reject the message. Configure Postfix to use the Gmail address:

```ini
# In main.cf - rewrite sender to match Gmail account
sender_canonical_maps = hash:/etc/postfix/sender_canonical
```

```bash
sudo nano /etc/postfix/sender_canonical
```

```text
# Map any local sender to the Gmail account
root            youraccount@gmail.com
www-data        youraccount@gmail.com
youruser        youraccount@gmail.com
```

```bash
sudo postmap /etc/postfix/sender_canonical
sudo systemctl reload postfix
```

## Volume and Rate Limits

Gmail SMTP relay has limits:
- Personal Gmail: 500 messages per day to external recipients
- Google Workspace: 2000 messages per day (varies by plan)

For high-volume applications, use a dedicated transactional email service (SendGrid, Mailgun, Amazon SES) instead of Gmail.

Monitor your sending volume:

```bash
# Count messages sent through the relay today
sudo grep "status=sent" /var/log/mail.log | grep "smtp.gmail.com" | wc -l

# See hourly sending rate
sudo grep "status=sent" /var/log/mail.log | \
  grep "smtp.gmail.com" | \
  awk '{print $1, $2}' | \
  cut -d: -f1 | \
  sort | uniq -c
```

## Using Google Workspace Instead of Personal Gmail

If you have Google Workspace, the configuration is the same but use your Workspace email address. Workspace accounts can also set up domain-wide SMTP relay in the admin console, which allows sending without per-account App Passwords - useful for organizations.

For Google Workspace SMTP relay:
- Relay host: `[smtp-relay.gmail.com]:587`
- Authenticate with your Workspace email and App Password
- Or configure IP-based authentication in the Workspace admin console

Gmail as a relay is practical for low-volume needs where deliverability matters but managing a dedicated mail infrastructure is not justified. For anything beyond a few hundred messages per day, a purpose-built transactional email service provides better scalability and analytics.
