# How to Set Up Postfix Relay Host Over IPv4 with SMTP Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, Relay Host, IPv4, SMTP Authentication, Email, Configuration

Description: Configure Postfix to relay all outbound mail through a specific IPv4 SMTP relay server with SASL authentication credentials.

## Introduction

Relaying through a smarthost or SaaS email provider (SendGrid, Amazon SES, Mailgun) is common for transactional email. Postfix forwards all outbound mail to the relay over IPv4, using either a bracketed IPv4 literal or a hostname that resolves over IPv4, with SMTP AUTH credentials.

## Basic Relay Host Configuration

```bash
# /etc/postfix/main.cf

# Relay all mail through this IPv4 address (brackets = skip MX lookup)

relayhost = [203.0.113.100]:587

# Or relay through a hostname that resolves over IPv4
relayhost = [smtp.sendgrid.net]:587

# Enable SASL for authentication with the relay
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd

# TLS for the relay connection
smtp_tls_security_level = encrypt
smtp_sasl_tls_security_options = noanonymous
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt   # Example CA bundle path on Debian/Ubuntu

# Force Postfix to use IPv4
inet_protocols = ipv4
smtp_bind_address = 203.0.113.10   # Local IPv4 address to bind for outbound SMTP
```

## Setting Up SASL Credentials

```bash
# /etc/postfix/sasl_passwd
# Format: [host]:port  username:password
[203.0.113.100]:587    myuser:mypassword

# For named relay services:
[smtp.sendgrid.net]:587    apikey:SG.xxxxxxxxxxxx
[email-smtp.us-east-1.amazonaws.com]:587    AKIAIOSFODNN7EXAMPLE:secret
```

```bash
# Hash the credentials file
sudo postmap /etc/postfix/sasl_passwd

# Secure the credentials files
sudo chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
sudo chown root:root /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db

# Reload Postfix
sudo postfix reload
```

## Relay with Specific Source IP

If your relay provider uses source-IP allowlisting, ensure this address is permitted:

```bash
# /etc/postfix/main.cf

# Relay host
relayhost = [smtp.relay.example.com]:587

# Use a specific local IPv4 address as the SMTP client source
smtp_bind_address = 203.0.113.10

# TLS settings
smtp_tls_security_level = encrypt
smtp_tls_loglevel = 1   # Log TLS activity for debugging
```

## Testing the Relay Configuration

```bash
# Check configuration
sudo postconf relayhost
sudo postfix check

# Send test email
printf 'Subject: Relay Test\n\nTest relay\n' | /usr/sbin/sendmail -v recipient@example.com

# Watch mail log for relay connection
sudo tail -f /var/log/mail.log   # Debian/Ubuntu default path

# Look for successful relay:
# postfix/smtp[...]: ... relay=smtp.relay.example.com[203.0.113.100]:587, ... status=sent (250 2.0.0 OK: queued as ...)

# If auth fails:
sudo grep -E "SASL|auth|relay" /var/log/mail.log
```

## Relay Only Specific Domains

```bash
# /etc/postfix/main.cf

# Default: deliver direct
relayhost =

# Use transport map for specific domains
transport_maps = hash:/etc/postfix/transport
```

```bash
# /etc/postfix/transport
# Relay outbound mail for these domains through the smarthost
example.com   smtp:[203.0.113.100]:587
partner.com   smtp:[203.0.113.100]:587
```

```bash
sudo postmap /etc/postfix/transport
sudo postfix reload
```

## Conclusion

Postfix relay configuration requires five core elements: `relayhost` with brackets around the IPv4 address or mailhub hostname (to skip MX lookup), `smtp_sasl_auth_enable = yes`, `smtp_sasl_password_maps` pointing to the credentials hash file, `smtp_sasl_tls_security_options = noanonymous` so common AUTH mechanisms can be used over TLS, and `smtp_tls_security_level = encrypt` for secure authentication. Secure `sasl_passwd` with `chmod 600` since it contains plaintext credentials.
