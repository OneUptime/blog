# How to Restrict SMTP Relay Access by IPv4 Address in Postfix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postfix, IPv4, SMTP Relay, Access Control, Security, Mynetworks

Description: Restrict Postfix SMTP relay access to specific IPv4 addresses and subnets using mynetworks, smtpd_client_restrictions, and cidr map files.

## Introduction

An unrestricted SMTP relay will be exploited by spammers within hours of being exposed. Postfix provides multiple layers for restricting relay access by IPv4 address: `mynetworks` and `smtpd_relay_restrictions` for relay authorization, plus `smtpd_client_restrictions` and CIDR map files for additional client filtering.

## Layer 1: mynetworks (Primary Control)

```bash
# /etc/postfix/main.cf

# Explicit trusted relay clients (more secure than mynetworks_style)

mynetworks = 127.0.0.0/8, 10.0.0.5, 10.0.0.6, 192.168.1.0/24

# The relay restriction uses mynetworks
smtpd_relay_restrictions =
    permit_mynetworks
    permit_sasl_authenticated
    reject_unauth_destination
```

## Layer 2: smtpd_client_restrictions

```bash
# /etc/postfix/main.cf

smtpd_client_restrictions =
    permit_mynetworks
    check_client_access cidr:/etc/postfix/client_access
    reject_rbl_client zen.spamhaus.org
    permit
```

```bash
# /etc/postfix/client_access (CIDR map)
# IP/CIDR  action
10.0.0.0/8    OK           # Allow internal network
192.168.1.0/24 OK          # Allow management subnet
203.0.113.0/24 OK          # Allow specific external range
198.51.100.0/24 REJECT     # Block this range
0.0.0.0/0      DUNNO       # Unknown: let other restrictions decide
```

```bash
sudo postfix reload
```

## Layer 3: Per-Sender IP Restrictions

```bash
# /etc/postfix/main.cf

# Postfix 3.0+: apply different rules based on the MAIL FROM domain's IP
smtpd_sender_restrictions =
    check_sender_a_access cidr:/etc/postfix/sender_ip_access
    permit_mynetworks
    permit_sasl_authenticated
```

```bash
# /etc/postfix/sender_ip_access (CIDR map)
# OK is not allowed with check_sender_a_access; use DUNNO to continue evaluation
198.51.100.0/24 REJECT     # Block sender domains that resolve into this range
0.0.0.0/0      DUNNO      # Anything else: let later restrictions decide
```

## Testing Relay Restrictions

```bash
# From a BLOCKED client host that is NOT in mynetworks: should be rejected
telnet YOUR_MAIL_SERVER_IP 25
EHLO test.example.com
MAIL FROM:<attacker@evil.com>
RCPT TO:<victim@gmail.com>
# Expected after RCPT TO: 554 5.7.1 Relay access denied

# From an ALLOWED client host in mynetworks (for example, 10.0.0.5):
telnet YOUR_MAIL_SERVER_IP 25
EHLO internal.example.com
MAIL FROM:<app@internal.example.com>
RCPT TO:<user@gmail.com>
# Expected after RCPT TO: 250 2.1.5 Ok
```

## Open Relay Test

```bash
# Test from external host that should NOT be in mynetworks
swaks --to external@gmail.com \
  --from spoofed@example.com \
  --server YOUR_MAIL_SERVER_IP

# Expected: rejection with "Relay access denied"
# If accepted: you have an open relay - fix immediately!
```

## Monitoring Relay Decisions

```bash
# Watch for relay attempts in mail log
sudo tail -f /var/log/mail.log | grep -E "relay|NOQUEUE|Reject"

# Count rejected relay attempts per IP
grep "Relay access denied" /var/log/mail.log | \
  sed -n 's/.*from [^[]*\[\([^]]*\)\].*/\1/p' | sort | uniq -c | sort -rn | head -10
```

## Conclusion

Postfix relay restriction is a defense-in-depth layered approach. Start with `mynetworks` for IP-based trusting, add `smtpd_relay_restrictions` with `reject_unauth_destination` as the final reject, and use CIDR map files via `check_client_access` for fine-grained control. Regularly test from external IPs to verify no unauthorized relay is possible.
