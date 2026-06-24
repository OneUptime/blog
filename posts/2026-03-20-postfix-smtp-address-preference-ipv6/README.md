# How to Configure Postfix smtp_address_preference for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, IPv6, SMTP, Email Delivery, Mail Configuration, Linux

Description: Configure Postfix smtp_address_preference to control whether outbound SMTP connections prefer IPv4 or IPv6 when both are available for a destination.

## Introduction

When `inet_protocols = all` is set in Postfix, both IPv4 and IPv6 may be available for connecting to a remote mail server. The `smtp_address_preference` parameter controls which address family is tried first when a destination has IPv4 and IPv6 addresses with equal MX preference, affecting delivery performance and fallback behavior.

## Understanding smtp_address_preference Values

| Value | Behavior |
|-------|----------|
| `any` | No explicit preference between IPv4 and IPv6 (default) |
| `ipv4` | Try IPv4 first when IPv4 and IPv6 addresses have equal MX preference |
| `ipv6` | Try IPv6 first when IPv4 and IPv6 addresses have equal MX preference |

## Viewing the Current Setting

```bash
# Check current preference setting

postconf smtp_address_preference

# Check along with related settings
postconf smtp_address_preference inet_protocols smtp_bind_address6
```

## Setting IPv6 Preference

To explicitly try IPv6 first for outbound delivery when a destination has equal-preference IPv4 and IPv6 addresses:

```bash
# Try IPv6 first for equal-preference outbound SMTP destinations
sudo postconf -e 'smtp_address_preference=ipv6'
sudo systemctl restart postfix
```

Postfix upstream documents this setting as unsafe on dual-stack systems because an IPv6 outage can delay all deliveries even when IPv4 is still working.

## Setting IPv4 Preference

To explicitly try IPv4 first for outbound delivery when a destination has equal-preference IPv4 and IPv6 addresses:

```bash
# Try IPv4 first for equal-preference outbound SMTP destinations
sudo postconf -e 'smtp_address_preference=ipv4'
sudo systemctl restart postfix
```

Postfix upstream documents this setting as unsafe for the same reason: an IPv4 outage can delay all deliveries even when IPv6 is still working.

## Using "any" for Balanced Delivery

The `any` setting is the default and the safe choice on dual-stack systems. On Postfix 3.3 and later, `smtp_balance_inet_protocols = yes` (the default) helps Postfix try both address families before it runs into `smtp_mx_address_limit`:

```bash
sudo postconf -e 'smtp_address_preference=any'
sudo systemctl restart postfix
```

## Verifying Delivery Protocol in Logs

After changing the preference, send a test message and check the delivery protocol:

```bash
# Send test email
echo "Protocol preference test" | sendmail -v test@gmail.com

# Watch the mail log
sudo tail -n 50 /var/log/mail.log | grep -E "relay=|Trusted TLS connection established to|connect to"

# Example showing IPv6 delivery:
# postfix/smtp[1234]: to=<test@gmail.com>, relay=gmail-smtp-in.l.google.com[2607:f8b0:4003:c08::1a]:25, delay=...
```

## Full Dual-Stack Configuration Example

A complete dual-stack Postfix configuration in `/etc/postfix/main.cf`:

```ini
# Protocol settings
inet_protocols = all

# Try IPv6 first for equal-preference outbound connections
smtp_address_preference = ipv6

# Bind outbound SMTP to specific IPv6 address
smtp_bind_address6 = 2001:db8::10

# Bind outbound SMTP to specific IPv4 address
smtp_bind_address = 203.0.113.10
```

## Handling Destination-Specific Preferences

For granular control, use Postfix transport maps with a dedicated transport to force specific domains over IPv4 or IPv6:

```bash
# /etc/postfix/transport
# Route example.com through an SMTP client that uses IPv4 only
example.com  smtp-ipv4:

# /etc/postfix/master.cf
smtp-ipv4 unix  -       -       n       -       -       smtp
  -o inet_protocols=ipv4

# Apply the transport map
sudo postconf -e 'transport_maps=hash:/etc/postfix/transport'
sudo postmap /etc/postfix/transport
sudo systemctl restart postfix
```

## Monitoring Protocol Usage

Use the mail log to build a picture of which protocol is being used most:

```bash
# Count IPv6 vs IPv4 deliveries in the last hour
sudo grep "$(date '+%b %e %H')" /var/log/mail.log | \
    grep 'relay=' | \
    grep -oE '\[[^]]+\]' | \
    while read addr; do
        if echo "$addr" | grep -q ':'; then echo "IPv6"; else echo "IPv4"; fi
    done | sort | uniq -c
```

## Conclusion

`smtp_address_preference` is a simple but impactful Postfix parameter. On dual-stack systems, Postfix documents `any` as the safe default. Use `ipv6` or `ipv4` only when you intentionally want one address family tried first for equal-preference destinations and understand the delivery-delay trade-off during an outage.
