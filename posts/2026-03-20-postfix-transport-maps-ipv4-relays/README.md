# How to Configure Postfix Transport Maps to Route Mail via IPv4 Relays

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, Transport Maps, IPv4, Email Routing, SMTP Relay, Configuration

Description: Learn how to configure Postfix transport maps to route outbound email for specific domains through designated IPv4 SMTP relay servers.

---

Postfix transport maps let you route outbound email for specific recipient domains through different SMTP relay servers. This is useful for sending partner domain mail through dedicated IPv4 relays, applying per-domain routing policies, or splitting traffic between on-premise and cloud relay services.

## How Transport Maps Work

Transport maps override Postfix's default routing. Each entry maps a recipient domain or address to a delivery mechanism (transport and optional relay host).

```text
Format: <pattern>  <transport>:<nexthop>
```

Common transports:
- `smtp` - Standard SMTP delivery
- `lmtp` - Local Mail Transport Protocol
- `error` - Reject delivery with an error

## Step 1: Create the Transport Map File

```bash
# /etc/postfix/transport

# Route mail for partner.com through a dedicated IPv4 relay

partner.com       smtp:[10.0.0.50]:25

# Route mail for subsidiary.org through a different relay
subsidiary.org    smtp:[10.0.1.20]:25

# Route all mail for a domain through a cloud relay on port 587
newsletter.com    smtp:[smtp.mailgun.org]:587

# Do not override routing for internal domain mail
internal.example.com  :

# Catch-all: route everything else through the primary relay
*                 smtp:[10.0.0.1]:25
```

> Wrapping the IP in square brackets (`[10.0.0.50]`) prevents Postfix from looking up MX records; it connects directly to that IP.

## Step 2: Hash the Transport Map

```bash
# Build the hash map that matches main.cf
postmap hash:/etc/postfix/transport

# Verify the DB was created
ls -la /etc/postfix/transport.db
```

## Step 3: Configure Postfix to Use the Map

```ini
# /etc/postfix/main.cf

# Reference the transport map
transport_maps = hash:/etc/postfix/transport

# IPv4 only
inet_protocols = ipv4
```

## Step 4: Restart Postfix

```bash
postfix check && systemctl restart postfix
```

## Authentication for Each Relay

If different relays require different credentials, use `smtp_sasl_password_maps`:

```bash
# /etc/postfix/sasl_passwd
[10.0.0.50]:25        user1:pass1
[10.0.1.20]:25        user2:pass2
[smtp.mailgun.org]:587 apikey:mgkey123
```

```bash
postmap hash:/etc/postfix/sasl_passwd
chmod 600 /etc/postfix/sasl_passwd /etc/postfix/sasl_passwd.db
```

```ini
# /etc/postfix/main.cf
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_tls_security_options = noanonymous
smtp_tls_security_level = encrypt
```

## Testing a Specific Route

```bash
# Test routing for a specific domain with sendmail
echo "Test routing" | sendmail -v test@partner.com

# Watch the mail log to see which relay is used
tail -f /var/log/mail.log | grep partner.com
```

## Key Takeaways

- Wrap relay IPs in brackets (`[10.0.0.50]`) to prevent MX lookups.
- Run `postmap` after every edit to the transport file to regenerate the DB.
- Use `*` as a catch-all entry to route unmatched domains to a default relay.
- Pair transport maps with `smtp_sasl_password_maps` for per-relay authentication.
