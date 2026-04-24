# How to Set Up Postfix SMTP TLS Encryption for IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, TLS, SMTP, IPv4, Email Security, Certificate

Description: Configure Postfix TLS encryption for both inbound SMTP connections and outbound delivery over IPv4, protecting email in transit.

## Introduction

Postfix supports TLS for both inbound (smtpd) and outbound (smtp) connections. Opportunistic TLS encrypts connections when both sides support it; enforced TLS can require encryption globally or for specific destinations.

## Generating TLS Certificates

```bash
# Use Let's Encrypt for trusted certificates

sudo certbot certonly --standalone -d mail.example.com

# Or generate self-signed for testing
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/postfix.key \
  -out /etc/ssl/certs/postfix.crt \
  -subj "/CN=mail.example.com"
```

## Inbound TLS (smtpd)

```bash
# /etc/postfix/main.cf

# TLS certificate and key files
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem
smtpd_tls_key_file  = /etc/letsencrypt/live/mail.example.com/privkey.pem

# Inbound TLS security level
smtpd_tls_security_level = may   # Opportunistic: use TLS if client supports it
# smtpd_tls_security_level = encrypt  # Require TLS from all clients

# Optional TLS session cache for older Postfix setups
# Postfix >= 2.11 generally prefers TLS session tickets instead
# smtpd_tls_session_cache_database = btree:${data_directory}/smtpd_scache
# smtpd_tls_session_cache_timeout = 3600s

# Log TLS connections
smtpd_tls_loglevel = 1

# Supported protocols and ciphers
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
```

## Outbound TLS (smtp)

```bash
# /etc/postfix/main.cf

# Outbound TLS security level
smtp_tls_security_level = may   # Try TLS, fall back to plaintext
# smtp_tls_security_level = encrypt  # Require TLS (delivery is deferred if remote doesn't support it)

# CA bundle for verifying remote certificates
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt

# Outbound session cache
smtp_tls_session_cache_database = btree:${data_directory}/smtp_scache

# Log TLS connections
smtp_tls_loglevel = 1

# Use IPv4 only
inet_protocols = ipv4

# Optional: bind outbound SMTP to a specific local IPv4 address
smtp_bind_address = 203.0.113.10
```

## STARTTLS Submission Port

Enable authenticated submission on port 587:

```bash
# /etc/postfix/master.cf

# Submission port with TLS required
submission inet n - y - - smtpd
    -o syslog_name=postfix/submission
    -o smtpd_tls_security_level=encrypt
    -o smtpd_sasl_auth_enable=yes
    -o smtpd_client_restrictions=permit_sasl_authenticated,reject
    -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
```

## Verifying TLS

```bash
# Test inbound TLS
openssl s_client -starttls smtp -connect 203.0.113.10:25

# Check TLS in mail log
sudo tail -f /var/log/mail.log | grep TLS
# Should see: "TLS connection established"

# Test submission port
swaks --to user@example.com \
  --server 203.0.113.10 --port 587 \
  --tls --auth --auth-user user@example.com

# Inspect the submission service configuration
postconf -Mf submission/inet
```

## Conclusion

Postfix TLS requires `smtpd_tls_cert_file`, `smtpd_tls_key_file`, and `smtpd_tls_security_level = may` for opportunistic inbound encryption. For outbound, set `smtp_tls_security_level = may` with a CA bundle. Use `encrypt` level for submission port (587) to require TLS from mail clients. Always use modern protocols by excluding SSLv2/SSLv3/TLSv1.0/TLSv1.1.
