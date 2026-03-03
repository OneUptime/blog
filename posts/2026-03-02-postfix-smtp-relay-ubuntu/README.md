# How to Configure Postfix as an SMTP Relay on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Email, Postfix, SMTP, Server Administration

Description: Configure Postfix as an SMTP relay on Ubuntu to route outgoing email through a relay host, with authentication, TLS, and sender restrictions.

---

An SMTP relay server accepts email from your servers and applications and forwards it to its final destination. Rather than having every server try to deliver mail directly (which often gets blocked by spam filters), you configure them to send through a central relay that has the proper SPF, DKIM, and reputation setup.

Postfix is the go-to MTA (Mail Transfer Agent) on Ubuntu for this purpose. It is battle-tested, well-documented, and flexible enough for everything from simple forwarding to complex routing setups.

## Installing Postfix

```bash
# Install Postfix and mail utilities
sudo apt update
sudo apt install -y postfix mailutils

# During installation, you will see a configuration dialog
# Choose "Internet Site" for a standard mail server
# Or "Satellite system" if this server only relays through another host

# After install, check the service is running
sudo systemctl status postfix
```

## Basic SMTP Relay Configuration

The main Postfix configuration file is `/etc/postfix/main.cf`. Here is a minimal relay configuration that accepts mail from localhost and relays it through a central mail server:

```bash
# Edit main.cf
sudo nano /etc/postfix/main.cf
```

```ini
# /etc/postfix/main.cf - Basic relay configuration

# System identity
myhostname = mail.example.com
mydomain = example.com
myorigin = $mydomain

# What to relay - accept mail from local machine only
inet_interfaces = loopback-only
mydestination = localhost

# Relay all outbound mail through this host
relayhost = [smtp.example.com]:587

# SASL authentication for the relay
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous

# TLS for connections to the relay
smtp_tls_security_level = encrypt
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_loglevel = 1

# Log level
debug_peer_level = 2
```

The square brackets around the relay hostname (`[smtp.example.com]`) tell Postfix not to do MX lookup - connect directly to that host.

## Setting Up SASL Authentication

Create the password file for authenticating to the relay:

```bash
# Create the SASL password file
sudo nano /etc/postfix/sasl_passwd
```

```text
# Format: [relay_host]:port  username:password
[smtp.example.com]:587  relayuser@example.com:yourpassword
```

Secure and hash it:

```bash
# Restrict permissions
sudo chmod 600 /etc/postfix/sasl_passwd

# Create the hash database
sudo postmap /etc/postfix/sasl_passwd

# Verify the .db file was created
ls -la /etc/postfix/sasl_passwd*
```

## Applying Configuration Changes

After any change to Postfix configuration files:

```bash
# Validate configuration syntax
sudo postfix check

# Reload configuration (no service interruption)
sudo systemctl reload postfix

# Or restart completely if needed
sudo systemctl restart postfix
```

## Testing the Relay

```bash
# Send a test email from the command line
echo "Test email body" | mail -s "Test from $(hostname)" admin@example.com

# Watch the mail log to see what happens
sudo tail -f /var/log/mail.log

# Check the mail queue
mailq

# If mail is stuck in queue, force delivery attempt
sudo postqueue -f
```

Look for lines in the log that show:
```text
postfix/smtp[...]: relay=smtp.example.com[x.x.x.x]:587, status=sent (250 OK)
```

That indicates successful relay.

## Restricting Who Can Relay

By default with `inet_interfaces = loopback-only`, only processes on the local machine can submit mail. If you need to accept relay requests from other internal servers:

```ini
# Accept connections from internal network
inet_interfaces = all

# Allow relay from these networks (localhost + internal network)
mynetworks = 127.0.0.0/8, 10.0.0.0/8, 192.168.0.0/16

# More restrictive - specify exact subnets
mynetworks = 127.0.0.0/8, 10.0.1.0/24
```

Only add IP ranges you trust. Open relays will be exploited by spammers within hours.

## Configuring Sender Rewriting

When multiple servers relay through a central Postfix instance, you may want to rewrite the sender address to ensure replies go somewhere useful:

```ini
# Rewrite From addresses to use the domain
sender_canonical_maps = hash:/etc/postfix/sender_canonical
```

```bash
# Create the canonical maps file
sudo nano /etc/postfix/sender_canonical
```

```text
# Map server-local addresses to real addresses
root@app1.internal    admin@example.com
www-data@app1.internal  noreply@example.com
```

```bash
# Hash the file
sudo postmap /etc/postfix/sender_canonical
sudo systemctl reload postfix
```

## Handling the Mail Queue

```bash
# View the current queue
mailq
# or
sudo postqueue -p

# Delete all messages in the queue (use carefully)
sudo postsuper -d ALL

# Delete deferred messages only
sudo postsuper -d ALL deferred

# Delete a specific message by ID
sudo postsuper -d MESSAGEID

# Force immediate delivery attempt of all queued messages
sudo postqueue -f

# Check why a specific message is deferred
sudo postcat -q MESSAGEID
```

## Log Analysis

Mail logs are in `/var/log/mail.log`:

```bash
# Watch live mail activity
sudo tail -f /var/log/mail.log

# Look for errors
sudo grep -i error /var/log/mail.log | tail -50

# Count messages by status
sudo grep "status=" /var/log/mail.log | grep -o "status=[^ ]*" | sort | uniq -c

# Find messages from a specific address
sudo grep "from=<user@example.com>" /var/log/mail.log

# Track a specific message ID through the log
MSGID="ABCDEF1234"
sudo grep "$MSGID" /var/log/mail.log
```

## TLS Configuration

For modern security, ensure TLS is properly configured:

```ini
# Outbound TLS (when sending to relay)
smtp_tls_security_level = encrypt    # require TLS
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
smtp_tls_loglevel = 1               # log TLS connection info

# Inbound TLS (when accepting mail from internal servers)
smtpd_tls_cert_file = /etc/ssl/certs/postfix.pem
smtpd_tls_key_file = /etc/ssl/private/postfix.key
smtpd_tls_security_level = may      # offer but don't require TLS from clients
smtpd_tls_loglevel = 1
```

## Header Cleanup

For relayed mail, cleaning up headers prevents internal hostnames from leaking:

```ini
# Clean up headers on outbound mail
smtp_header_checks = regexp:/etc/postfix/header_checks
```

```bash
sudo nano /etc/postfix/header_checks
```

```text
# Remove internal headers that reveal infrastructure
/^Received: from internal\.hostname/ IGNORE
/^X-Mailer:.*internal/ IGNORE
```

## Monitoring Postfix

Set up monitoring to catch relay issues before they cause application problems:

```bash
# Check queue depth (alert if too large)
mailq | grep -c "^[A-F0-9]"

# Check postfix is actually accepting connections
nc -z -w3 localhost 25 && echo "Postfix accepting connections"

# Parse recent stats
pflogsumm /var/log/mail.log | head -50

# Install pflogsumm if not present
sudo apt install -y pflogsumm
```

Set up a daily pflogsumm email report for mail statistics:

```bash
sudo crontab -e
# Add:
# 0 6 * * * pflogsumm /var/log/mail.log | mail -s "Mail stats $(date +%Y-%m-%d)" admin@example.com
```

A properly configured SMTP relay centralizes your email flow, making it easier to manage reputation, authentication settings, and troubleshooting across many servers. Rather than debugging mail delivery on ten different application servers, you debug one relay.
