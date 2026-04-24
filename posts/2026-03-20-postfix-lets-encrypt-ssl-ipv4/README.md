# How to Set Up Postfix with Let's Encrypt SSL on an IPv4 Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, Let's Encrypt, SSL, TLS, IPv4, Email, Certbot, Security

Description: Learn how to configure Postfix to use a free Let's Encrypt TLS certificate on an IPv4 mail server for encrypted SMTP connections.

---

Using a Let's Encrypt certificate with Postfix provides trusted TLS encryption for your mail server without the "certificate not trusted" warnings associated with self-signed certs.

## Prerequisites

- A domain (`mail.example.com`) pointing to your server's IPv4 address.
- Port 80 open for the ACME HTTP-01 challenge.

## Obtaining the Certificate

```bash
# Install Certbot

apt install certbot -y  # Debian/Ubuntu

# Obtain a certificate for the mail hostname
# Use standalone mode (Certbot runs its own web server on port 80)
certbot certonly --standalone -d mail.example.com

# Or if you already have a web server running on port 80, use webroot mode:
# certbot certonly --webroot -w /var/www/html -d mail.example.com
```

Certificates are stored in `/etc/letsencrypt/live/mail.example.com/`.

## Configuring Postfix to Use the Certificate

```ini
# /etc/postfix/main.cf

# --- IPv4 only ---
inet_protocols = ipv4

# --- TLS: use Let's Encrypt certificate ---
# For incoming connections (clients connecting to your server)
smtpd_tls_cert_file = /etc/postfix/ssl/fullchain.pem
smtpd_tls_key_file  = /etc/postfix/ssl/privkey.pem
smtpd_tls_security_level = may       # Offer TLS; don't require it for port 25
smtpd_tls_protocols = >=TLSv1.2, <=TLSv1.3
smtpd_tls_loglevel = 1

# --- TLS: for outgoing connections (Postfix → other mail servers) ---
smtp_tls_CAfile    = /etc/ssl/certs/ca-certificates.crt
smtp_tls_security_level = may        # Use TLS when available
smtp_tls_protocols = >=TLSv1.2, <=TLSv1.3
smtp_tls_loglevel = 1

# TLS session cache (improves performance)
smtpd_tls_session_cache_database = btree:${data_directory}/smtpd_scache
smtp_tls_session_cache_database  = btree:${data_directory}/smtp_scache
```

## Granting Postfix Access to Let's Encrypt Files

Let's Encrypt private keys should remain readable only by root. A deploy hook can copy the current certificate and key into a fixed path for Postfix after issuance or renewal.

```bash
# Create a fixed location for Postfix TLS files
install -d -m 755 /etc/postfix/ssl

# Use a deploy hook to copy certs into place after issuance/renewal
cat > /etc/letsencrypt/renewal-hooks/deploy/postfix.sh << 'EOF'
#!/bin/bash
install -m 644 -o root -g root /etc/letsencrypt/live/mail.example.com/fullchain.pem /etc/postfix/ssl/fullchain.pem
install -m 600 -o root -g root /etc/letsencrypt/live/mail.example.com/privkey.pem   /etc/postfix/ssl/privkey.pem
systemctl reload postfix
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/postfix.sh

# Copy the current certificate and key into place now
/etc/letsencrypt/renewal-hooks/deploy/postfix.sh
```

## Testing TLS

```bash
# Check Postfix config
postfix check

# Restart Postfix (required after changing inet_protocols)
systemctl restart postfix

# Test TLS handshake on port 25
openssl s_client -starttls smtp -connect mail.example.com:25 -servername mail.example.com

# Verify certificate details
openssl s_client -starttls smtp -connect mail.example.com:25 -servername mail.example.com 2>&1 | grep -E "subject|issuer|CN"
```

## Automatic Certificate Renewal

```bash
# Test renewal
certbot renew --dry-run

# If you want to test the deploy hook too:
# certbot renew --dry-run --run-deploy-hooks

# The deploy hook will automatically reload Postfix after a successful renewal
```

## Key Takeaways

- Use `smtpd_tls_cert_file` and `smtpd_tls_key_file` to configure the certificate Postfix presents for incoming SMTP TLS.
- Use `smtp_tls_security_level = may` to enable opportunistic TLS for outgoing delivery; `smtp_tls_cert_file` and `smtp_tls_key_file` are only needed if a remote server requires a client certificate.
- Use a deploy hook to copy certificates to a Postfix-readable location after renewal.
- `smtpd_tls_security_level = may` offers TLS on port 25 without requiring it (interoperability).
- Set `smtpd_tls_security_level = encrypt` on the submission service (port 587) to require TLS for client submissions.
