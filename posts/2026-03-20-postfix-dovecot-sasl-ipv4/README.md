# How to Configure Postfix with Dovecot SASL Authentication Over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, Dovecot, SASL, IPv4, Authentication, Email, SMTP

Description: Configure Postfix to use Dovecot as the SASL authentication backend for SMTP submission, enabling users to authenticate with their mailbox credentials.

## Introduction

Postfix delegates SASL authentication to Dovecot via a Unix socket, allowing users to authenticate to the SMTP server using the same credentials as their IMAP/POP3 accounts. Dovecot acts as the authentication provider.

## Dovecot SASL Configuration

```bash
# /etc/dovecot/conf.d/10-master.conf

service auth {
    unix_listener /var/spool/postfix/private/auth {
        mode = 0660
        user = postfix
        group = postfix
    }
}
```

```bash
# /etc/dovecot/conf.d/10-auth.conf

# Enable PLAIN and LOGIN mechanisms for SMTP clients

auth_mechanisms = plain login
```

Restart Dovecot:

```bash
sudo systemctl restart dovecot
ls -la /var/spool/postfix/private/auth  # Socket must exist
```

## Postfix Configuration

```bash
# /etc/postfix/main.cf

# Use Dovecot for SASL authentication
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth    # Relative to /var/spool/postfix/

# Enable SASL authentication for SMTP
smtpd_sasl_auth_enable = yes

# Don't allow anonymous authentication
smtpd_sasl_security_options = noanonymous

# Offer TLS and require it before advertising AUTH
smtpd_tls_security_level = may
smtpd_tls_auth_only = yes
smtpd_tls_cert_file = /etc/letsencrypt/live/mail.example.com/fullchain.pem
smtpd_tls_key_file  = /etc/letsencrypt/live/mail.example.com/privkey.pem

# Allow relay for authenticated users
smtpd_relay_restrictions =
    permit_mynetworks
    permit_sasl_authenticated
    reject_unauth_destination

# IPv4 only
inet_protocols = ipv4
inet_interfaces = 203.0.113.10
```

## Submission Port (587) with Mandatory Auth

```bash
# /etc/postfix/master.cf

submission inet n - y - - smtpd
    -o syslog_name=postfix/submission
    -o smtpd_tls_security_level=encrypt
    -o smtpd_sasl_auth_enable=yes
    -o smtpd_sasl_type=dovecot
    -o smtpd_sasl_path=private/auth
    -o smtpd_client_restrictions=permit_sasl_authenticated,reject
    -o smtpd_relay_restrictions=permit_sasl_authenticated,reject
    -o milter_macro_daemon_name=ORIGINATING
```

Restart Postfix:

```bash
sudo systemctl restart postfix
```

## Testing SASL Authentication

```bash
# Test using swaks (Swiss Army Knife for SMTP)
sudo apt install swaks

swaks --to user@external.com \
  --server 203.0.113.10 --port 587 \
  --tls \
  --auth PLAIN \
  --auth-user user@example.com \
  --auth-password "userpassword"

# Check mail log for auth events
sudo tail -f /var/log/mail.log | grep "SASL\|auth"
# Look for SASL authentication success/failure entries

# Test from command line
echo -ne '\0user@example.com\0password' | base64
# Use that base64 string in SMTP AUTH PLAIN
```

## Troubleshooting SASL

```bash
# Common errors and fixes:

# "SASL authentication failed: authentication failure"
# → Dovecot auth mechanism mismatch; check 10-auth.conf

# "Cannot connect to auth server"
# → Auth socket doesn't exist or wrong permissions
ls -la /var/spool/postfix/private/auth

# Fix the Dovecot unix_listener user/group/mode in 10-master.conf, then restart Dovecot
sudo systemctl restart dovecot

# Check Dovecot auth log
sudo journalctl -u dovecot | grep auth
```

## Conclusion

Postfix + Dovecot SASL integration uses a Unix socket at `private/auth` for credential verification. Configure Dovecot to expose the auth socket with Postfix ownership, set `smtpd_sasl_type = dovecot` in Postfix, and enable `permit_sasl_authenticated` in relay restrictions. Always require TLS (`smtpd_tls_security_level = encrypt` on port 587) before SASL to prevent credential interception.
