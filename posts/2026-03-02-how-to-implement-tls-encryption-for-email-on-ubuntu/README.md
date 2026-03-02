# How to Implement TLS Encryption for Email on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TLS, Email, Postfix, SSL

Description: Configure TLS encryption for Postfix on Ubuntu to secure email in transit, including certificate management, opportunistic and mandatory TLS settings, and cipher configuration.

---

Email without TLS travels in plaintext across the internet, visible to anyone who can intercept the traffic. TLS encrypts the SMTP connection between mail servers and between clients and servers, preventing eavesdropping on messages in transit. This guide covers configuring Postfix on Ubuntu to use TLS for both incoming and outgoing connections.

## Understanding TLS in Email

There are two main models for TLS in email:

- **STARTTLS**: The connection starts unencrypted on the standard SMTP port (25 or 587), then upgrades to TLS via the STARTTLS command. Most server-to-server email uses this.
- **SMTPS (Implicit TLS)**: The connection starts encrypted from the beginning on port 465. Modern email clients should use this for submissions.

There is also a distinction between **opportunistic TLS** (try TLS, fall back to plaintext if the remote doesn't support it) and **mandatory TLS** (refuse to communicate if TLS isn't available). For most server-to-server mail, opportunistic TLS is standard because not all mail servers support TLS.

## Prerequisites

```bash
# Verify Postfix is installed
postfix -v

# Check that OpenSSL is available
openssl version
```

## Obtaining a TLS Certificate

You have two options: a self-signed certificate (quick, not trusted by clients) or a certificate from Let's Encrypt (trusted, free, requires a domain).

### Option A: Let's Encrypt Certificate

```bash
# Install Certbot
sudo apt update
sudo apt install -y certbot

# Obtain a certificate for your mail server's hostname
# Stop any service using port 80 temporarily, or use the DNS challenge
sudo certbot certonly --standalone -d mail.example.com

# Certificates are stored in /etc/letsencrypt/live/mail.example.com/
ls -la /etc/letsencrypt/live/mail.example.com/

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Postfix needs to reload after cert renewal
# Add a deploy hook:
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-postfix.sh > /dev/null <<'EOF'
#!/bin/bash
systemctl reload postfix
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-postfix.sh
```

### Option B: Self-Signed Certificate

```bash
# Generate a self-signed certificate (for testing or internal use)
sudo openssl req -new -x509 -days 3650 -nodes \
    -out /etc/ssl/certs/mail.example.com.pem \
    -keyout /etc/ssl/private/mail.example.com.key \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=mail.example.com"

sudo chmod 600 /etc/ssl/private/mail.example.com.key
```

## Configuring Postfix for TLS

### Incoming TLS (smtpd)

```bash
# Configure TLS for incoming SMTP connections (smtpd = server mode)

# Certificate and key paths (using Let's Encrypt)
sudo postconf -e "smtpd_tls_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem"
sudo postconf -e "smtpd_tls_key_file = /etc/letsencrypt/live/mail.example.com/privkey.pem"

# Enable opportunistic TLS (offer TLS but don't require it for port 25)
sudo postconf -e "smtpd_tls_security_level = may"

# Log TLS connection details for auditing
sudo postconf -e "smtpd_tls_loglevel = 1"

# Enable session caching for performance
sudo postconf -e "smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache"
sudo postconf -e "smtpd_tls_session_cache_timeout = 3600s"

# Request but don't require client certificates (for mutual TLS scenarios)
# sudo postconf -e "smtpd_tls_ask_ccert = yes"

# Enable TLS authentication info in Received headers
sudo postconf -e "smtpd_tls_received_header = yes"

# Set minimum TLS protocol version (TLS 1.2 minimum is strongly recommended)
sudo postconf -e "smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1"
sudo postconf -e "smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1"
```

### Outgoing TLS (smtp)

```bash
# Configure TLS for outgoing SMTP connections (smtp = client mode)

# Use opportunistic TLS when sending to other servers
sudo postconf -e "smtp_tls_security_level = may"

# Log TLS details for outgoing connections
sudo postconf -e "smtp_tls_loglevel = 1"

# Cache outgoing TLS sessions
sudo postconf -e "smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache"
sudo postconf -e "smtp_tls_session_cache_timeout = 3600s"

# Exclude weak protocols
sudo postconf -e "smtp_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1"
sudo postconf -e "smtp_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1"

# Use a proper CA certificate bundle for verifying remote servers
sudo postconf -e "smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt"
```

## Enabling SMTPS and SMTP Submission Ports

Edit `/etc/postfix/master.cf` to enable port 465 (SMTPS) and port 587 (submission):

```bash
# View the current master.cf
grep -E "^smtps|^submission" /etc/postfix/master.cf

# If not present, add them
sudo tee -a /etc/postfix/master.cf > /dev/null <<'EOF'

# Submission port 587 - STARTTLS for email clients
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_sasl_type=dovecot
  -o smtpd_sasl_path=private/auth
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject

# SMTPS port 465 - Implicit TLS for email clients
smtps     inet  n       -       y       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_sasl_type=dovecot
  -o smtpd_sasl_path=private/auth
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
EOF
```

## Configuring Cipher Suites

Choosing strong cipher suites is important. Exclude export ciphers, null ciphers, and weak algorithms:

```bash
# Set cipher preferences for incoming connections
sudo postconf -e "smtpd_tls_ciphers = high"
sudo postconf -e "smtpd_tls_mandatory_ciphers = high"

# Exclude specific weak ciphers
sudo postconf -e "tls_high_cipherlist = ECDHE+AESGCM:ECDHE+AES256:DHE+AESGCM:DHE+AES256:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!3DES:!MD5:!PSK"

# Use the server's cipher preference order (not the client's)
sudo postconf -e "tls_preempt_cipherlist = yes"

# Generate Diffie-Hellman parameters for forward secrecy
# This takes a few minutes on first run
sudo openssl dhparam -out /etc/postfix/dh2048.pem 2048

# Tell Postfix to use the DH params
sudo postconf -e "smtpd_tls_dh1024_param_file = /etc/postfix/dh2048.pem"
```

## Enforcing TLS for Specific Destinations

You can require TLS when sending to specific domains, rather than just opportunistic:

```bash
# Create a TLS policy table
sudo tee /etc/postfix/tls_policy > /dev/null <<'EOF'
# Format: domain  policy
# encrypt = require TLS but accept any certificate
# verify  = require TLS and verify certificate
# secure  = require TLS, verified cert, and DANE if available

# Require TLS for Gmail
gmail.com               encrypt
# Require verified TLS for your business partner
partner-company.com     verify
EOF

sudo postmap /etc/postfix/tls_policy

# Tell Postfix to use the policy table
sudo postconf -e "smtp_tls_policy_maps = hash:/etc/postfix/tls_policy"
```

## DANE (DNS-Based Authentication of Named Entities)

DANE uses TLSA DNS records to publish certificate fingerprints, enabling verification without relying on CAs:

```bash
# Enable DANE verification for outgoing mail
# Requires DNSSEC on the remote domain's DNS
sudo postconf -e "smtp_tls_security_level = dane"
sudo postconf -e "smtp_dns_support_level = dnssec"
```

## Applying Changes and Reloading

```bash
# Reload Postfix to apply configuration changes
sudo systemctl reload postfix

# Or for changes that require a full restart
sudo systemctl restart postfix

# Verify the configuration syntax first
sudo postfix check
```

## Testing TLS Configuration

```bash
# Test STARTTLS on port 25
openssl s_client -starttls smtp -connect mail.example.com:25 -crlf

# Test SMTPS (implicit TLS) on port 465
openssl s_client -connect mail.example.com:465 -crlf

# Test SMTP submission with STARTTLS on port 587
openssl s_client -starttls smtp -connect mail.example.com:587 -crlf

# After connecting, check the cipher and protocol negotiated
# Look for: Protocol: TLSv1.3, Cipher: TLS_AES_256_GCM_SHA384

# Check Postfix TLS session log
sudo tail -f /var/log/mail.log | grep TLS

# Use online testing tools
# mxtoolbox.com -> TLS check
# checktls.com for detailed TLS verification
```

## Monitoring TLS in Mail Logs

```bash
# Count TLS vs non-TLS connections
grep "TLS" /var/log/mail.log | grep -c "Untrusted"
grep "TLS" /var/log/mail.log | grep -c "Verified"

# Find connections that fell back to plaintext
grep "PLAINTEXT" /var/log/mail.log | tail -20

# Check what TLS version and ciphers remote servers are negotiating
grep "TLSv1\|TLSv1.2\|TLSv1.3" /var/log/mail.log | tail -20
```

## Troubleshooting TLS Issues

```bash
# If clients report certificate errors:
# Verify the certificate chain is complete
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt \
    /etc/letsencrypt/live/mail.example.com/fullchain.pem

# Check certificate expiry
openssl x509 -in /etc/letsencrypt/live/mail.example.com/cert.pem -noout -dates

# If Postfix can't read the certificate:
# Check that postfix user has read access
sudo -u postfix cat /etc/letsencrypt/live/mail.example.com/fullchain.pem

# Fix permissions if needed (Let's Encrypt certs need group read at minimum)
sudo chmod 640 /etc/letsencrypt/live/mail.example.com/privkey.pem
sudo chgrp postfix /etc/letsencrypt/live/mail.example.com/privkey.pem
```

Properly configured TLS protects your users' email from passive eavesdropping and contributes to your domain's trust reputation with major mail providers like Google and Microsoft.
