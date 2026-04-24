# How to Set Up Postfix Submission Service (Port 587) on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, SMTP, IPv4, Port 587, Submission, TLS, Email, Security

Description: Learn how to configure Postfix to offer an authenticated SMTP submission service on port 587 with TLS and SASL authentication for IPv4 mail clients.

---

Port 587 (SMTP Submission) is the standard port for mail clients to submit outbound email. Unlike port 25 (which is primarily for server-to-server relay), port 587 normally requires authentication or other authorization, preventing unauthorized relaying.

## Understanding the Ports

| Port | Service | Purpose |
|------|----------|---------|
| 25 | SMTP | Server-to-server relay; auth not normally required |
| 465 | Submissions | Client-to-server submission over implicit TLS |
| 587 | Submission | Client-to-server; STARTTLS + auth/authorization |

## Enabling Port 587 in master.cf

Postfix's `master.cf` controls which services run. Uncomment or add the submission service.

```ini
# /etc/postfix/master.cf

# Uncomment the submission line (port 587)

submission inet n       -       n       -       -       smtpd
  -o syslog_name=postfix/submission
  # Require STARTTLS
  -o smtpd_tls_security_level=encrypt
  # Enable SASL authentication via Dovecot
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_sasl_type=dovecot
  -o smtpd_sasl_path=private/auth
  # Allow only authenticated clients on the submission service
  -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING
```

If you use Dovecot for SASL, make sure it exposes the auth socket at `/var/spool/postfix/private/auth`; `private/auth` is relative to Postfix's queue directory.

## Configuring TLS in main.cf

```ini
# /etc/postfix/main.cf

# --- Bind to IPv4 only ---
inet_protocols = ipv4

# --- TLS certificate (from Let's Encrypt or self-signed) ---
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem
smtpd_tls_key_file  = /etc/letsencrypt/live/mail.example.com/privkey.pem

# Minimum TLS version for incoming connections
smtpd_tls_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1
smtpd_tls_mandatory_protocols = !SSLv2, !SSLv3, !TLSv1, !TLSv1.1

# TLS log level (1 = handshake summary, 2 = verbose)
smtpd_tls_loglevel = 1

# --- SASL authentication ---
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname

# --- Relay: allow authenticated users to relay ---
smtpd_relay_restrictions =
    permit_mynetworks,
    permit_sasl_authenticated,
    reject_unauth_destination
```

## Opening the Firewall

```bash
# Allow port 587 through the firewall
ufw allow 587/tcp
# or
firewall-cmd --add-port=587/tcp --permanent && firewall-cmd --reload
```

## Testing the Submission Service

```bash
# Verify the STARTTLS handshake on the submission service using openssl
openssl s_client -starttls smtp -connect mail.example.com:587

# Or use swaks (Swiss Army Knife for SMTP)
swaks --to recipient@example.com \
      --from sender@example.com \
      --server mail.example.com \
      --port 587 \
      --auth LOGIN \
      --auth-user sender@example.com \
      --auth-password yourpassword \
      --tls
```

## Verifying Port 587 is Listening

```bash
# Check Postfix is listening on port 587 over IPv4
ss -4 -tlnp | grep :587
```

## Key Takeaways

- Enable the `submission` service in `master.cf` and set `smtpd_tls_security_level=encrypt` to require STARTTLS.
- Use `smtpd_relay_restrictions=permit_sasl_authenticated,reject` on the `submission` service to allow only authenticated clients to submit mail.
- Set `inet_protocols = ipv4` in `main.cf` to prevent Postfix from binding to IPv6.
- Test with `openssl s_client -starttls smtp` to verify TLS, and with `swaks` to verify TLS plus authentication.
