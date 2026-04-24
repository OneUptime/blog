# How to Configure Postfix as a Send-Only SMTP Server on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, SMTP, IPv4, Email, Linux, Configuration, Send-Only

Description: Learn how to configure Postfix as a send-only SMTP relay on an IPv4 server for applications that need to send outbound email without accepting incoming mail.

---

A send-only Postfix configuration is ideal for servers that generate automated emails (alerts, notifications, password resets) but don't need to receive incoming mail. The configuration is simpler and has a smaller attack surface than a full mail server.

## Installing Postfix

```bash
# Debian/Ubuntu

apt install postfix -y
# Choose "Internet Site" during setup

# RHEL/Rocky
dnf install postfix -y
systemctl enable --now postfix
```

## Core Configuration

```ini
# /etc/postfix/main.cf

# --- Identity ---
# The hostname that Postfix uses in SMTP greetings (FQDN)
myhostname = mail.example.com

# The domain used in From: addresses by default
myorigin = example.com

# --- Network: bind to IPv4 only ---
inet_protocols = ipv4          # Only use IPv4 (not ipv6)
inet_interfaces = loopback-only   # Only accept connections from localhost

# --- Relay: send-only; no local delivery ---
# Don't act as a final destination for any domains
mydestination =
local_transport = error:local delivery disabled

# --- Relay host (optional): use an upstream SMTP relay ---
# relayhost = [smtp.sendgrid.net]:587

# --- Outgoing IP ---
# Force Postfix to send from a specific IPv4 address
smtp_bind_address = 203.0.113.10

# --- Limits ---
# Maximum message size (10 MB)
message_size_limit = 10240000
```

## Accepting Relay from Applications Only

```ini
# /etc/postfix/main.cf

# Accept relay requests only from localhost (IPv4)
mynetworks = 127.0.0.0/8

# Reject relay from anything outside mynetworks
smtpd_relay_restrictions = permit_mynetworks, reject
```

## Testing Send-Only Mail

```bash
# Reload Postfix after config changes
postfix check && systemctl reload postfix

# Send a test email from the command line
printf 'To: recipient@example.com\nFrom: noreply@example.com\nSubject: Test Email\n\nTest from Postfix send-only\n' | sendmail -t

# Monitor the mail queue
mailq

# Watch the mail log for delivery status
tail -f /var/log/mail.log   # Debian/Ubuntu; use /var/log/maillog on RHEL/Rocky
```

## Sending via a Smart Host (Relay)

To route all outbound mail through an external SMTP relay (e.g., SendGrid, Mailgun):

```ini
# /etc/postfix/main.cf

# Use SendGrid as the relay host
relayhost = [smtp.sendgrid.net]:587

# SASL authentication for the relay
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_tls_security_options = noanonymous
smtp_tls_security_level = encrypt
```

```bash
# /etc/postfix/sasl_passwd
[smtp.sendgrid.net]:587  apikey:YOUR_API_KEY
```

```bash
# Hash the password file and reload
postmap hash:/etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
systemctl reload postfix
```

## Key Takeaways

- Set `inet_protocols = ipv4` to prevent Postfix from using IPv6.
- Set `inet_interfaces = loopback-only` so Postfix only accepts connections from localhost.
- Set `mydestination =` and `local_transport = error:...` to disable local mail delivery.
- Use `smtp_bind_address` to control which IPv4 source address Postfix uses for outbound connections.
