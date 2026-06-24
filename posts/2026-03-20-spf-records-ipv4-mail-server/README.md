# How to Configure SPF Records for IPv4 Mail Server Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SPF, IPv4, DNS, Email Security, Postfix, Anti-Spam

Description: Create SPF DNS records that authorize specific IPv4 addresses and ranges to send email on behalf of your domain, preventing spoofing and improving deliverability.

## Introduction

SPF (Sender Policy Framework) is an email authentication mechanism published in DNS TXT records that lists the IPv4 (and IPv6) addresses authorized to send mail for your domain. Receiving mail servers check SPF against the SMTP `MAIL FROM` or `HELO` identity to verify that incoming mail comes from an authorized source.

## Basic SPF Record Syntax

```dns
; Domain TXT record format:
; "v=spf1 [mechanisms] [qualifier]all"

; Allow a specific IPv4 address
example.com. IN TXT "v=spf1 ip4:203.0.113.10 ~all"

; Allow an IPv4 CIDR range
example.com. IN TXT "v=spf1 ip4:203.0.113.0/24 ~all"

; Allow hosts listed in your MX records
example.com. IN TXT "v=spf1 mx ~all"

; Allow the A record of your domain
example.com. IN TXT "v=spf1 a ~all"

; Allow specific IP, your MX, and include a relay service
example.com. IN TXT "v=spf1 ip4:203.0.113.10 mx include:sendgrid.net ~all"
```

## SPF Qualifiers

| Qualifier | Meaning | Typical receiver handling |
|---|---|---|
| `+` (default) | Pass | Authorized; continue normal filtering |
| `-` | Fail (hard) | Not authorized; may reject or mark according to local policy |
| `~` | SoftFail | Not authorized but transitional; usually accept and tag |
| `?` | Neutral | No assertion |

## Typical Multi-Server SPF Record

```dns
; Production mail server
example.com. IN TXT (
    "v=spf1 "
    "ip4:203.0.113.10 "
    "ip4:203.0.113.11 "
    "ip4:198.51.100.0/26 "
    "include:_spf.google.com "
    "include:sendgrid.net "
    "~all"
)
```

## Verifying Your SPF Record

```bash
# Query your SPF record

dig TXT example.com | grep spf

# Test SPF for a specific sending IP
# Using pyspf
python -m pip install pyspf
python -c "
import spf
result, text = spf.check2('203.0.113.10', 'user@example.com', 'mail.example.com')
print(f'Result: {result}, Text: {text}')
"

# Online tools:
# https://mxtoolbox.com/spf.aspx
# https://www.spf-record.com/spf-lookup

# Check from the sending server
swaks --to check@receiver-test.net \
  --from user@example.com \
  --local-interface 203.0.113.10
```

## SPF for Subdomains

Each sending subdomain needs its own SPF record; SPF is looked up on the exact `MAIL FROM` or `HELO` domain and is not inherited from the parent:

```dns
; Different sending IPs per subdomain
mail.example.com.          IN TXT "v=spf1 ip4:203.0.113.10 ~all"
newsletter.example.com.    IN TXT "v=spf1 include:servers.mcsv.net ~all"
transactional.example.com. IN TXT "v=spf1 include:sendgrid.net ~all"

; Default policy for otherwise undefined subdomains (wildcards do not override existing DNS names)
*.example.com.             IN TXT "v=spf1 -all"
```

## SPF with Postfix: Checking Inbound Mail

```bash
# Install postfix-policyd-spf-python to check SPF on inbound mail
sudo apt install postfix-policyd-spf-python

# /etc/postfix/master.cf
policyd-spf  unix  -       n       n       -       0       spawn
    user=policyd-spf argv=/usr/bin/policyd-spf

# /etc/postfix/main.cf
policyd-spf_time_limit = 3600
smtpd_recipient_restrictions =
    permit_mynetworks
    permit_sasl_authenticated
    reject_unauth_destination
    check_policy_service unix:private/policyd-spf
```

## Conclusion

SPF records authorize IPv4 addresses to use your domain in SMTP `MAIL FROM` or `HELO` identities using DNS TXT records. Start with `ip4:` mechanisms for explicit IPs, add `include:` for third-party senders (SendGrid, Google Workspace), and end with `~all` (soft fail) rather than `-all` (hard fail) while testing. Use `dig TXT example.com` to verify your record, and monitor SPF check results in mail logs to identify unauthorized senders.
