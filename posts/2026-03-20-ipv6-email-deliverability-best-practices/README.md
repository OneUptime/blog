# How to Understand IPv6 Email Deliverability Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Email, Deliverability, SPF, DKIM, DMARC, Best Practice

Description: Understand the key best practices for achieving good email deliverability when sending from IPv6 addresses, covering reputation, authentication, and infrastructure setup.

## Introduction

Sending email from IPv6 addresses presents unique challenges. IPv6 address space is enormous, making traditional IP reputation databases less complete. Major providers like Google, Microsoft, and Yahoo publish sender requirements that make reverse DNS, authentication, and reputation hygiene especially important for IPv6 senders. This guide consolidates the essential best practices.

## Why IPv6 Deliverability Differs

```mermaid
graph TD
    A[IPv6 Sender] --> B{Has PTR Record?}
    B -- No --> C[Higher reject or defer risk]
    B -- Yes --> D{FCrDNS Matches?}
    D -- No --> C
    D -- Yes --> E{SPF or DKIM passes?}
    E -- No --> F[Likely filtered or rejected]
    E -- Yes --> G{DMARC aligned?}
    G -- No --> H[Delivered with higher spam risk]
    G -- Yes --> I[Best chance of inbox placement]
```

## 1. Infrastructure Requirements

### PTR Record and FCrDNS

The most critical requirement for IPv6 mail:

```bash
# Your sending IPv6 must have a PTR record

dig -x 2001:db8::10 +short
# → mail.example.com.

# And mail.example.com must have AAAA pointing back
dig AAAA mail.example.com +short
# → 2001:db8::10
```

### Stable IPv6 Address

Disable privacy extensions on mail server interfaces to maintain a stable sending IP:

```bash
# Disable temporary addresses on the mail interface
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=0
# Make permanent
echo "net.ipv6.conf.eth0.use_tempaddr=0" | sudo tee -a /etc/sysctl.d/99-mail.conf
```

## 2. Authentication Stack (Non-Negotiable)

For bulk or commercial sending, all three should be configured for reliable delivery to major providers:

```dns
; SPF example using ip6: mechanism
example.com.  300  IN  TXT  "v=spf1 ip4:203.0.113.10 ip6:2001:db8::10 -all"

; DKIM public key
mail._domainkey.example.com.  300  IN  TXT  "v=DKIM1; k=rsa; p=<public-key>"

; DMARC policy
_dmarc.example.com.  300  IN  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@example.com"
```

## 3. Warm Up New IPv6 Addresses

New IPv6 addresses have no sending reputation. Warm up gradually:

```text
Start with a low sending volume to engaged users.
Increase volume gradually over days or weeks.
Avoid sudden spikes or burst sending.
Monitor bounces, deferrals, spam rate, and reputation as you scale.
```

Use a dedicated IPv6 address per sending stream when possible (transactional vs. marketing).

## 4. Use a Dedicated IPv6 Range for Mail

Don't use addresses from a shared range:

```bash
# Request a dedicated /64 or /48 from your provider
# Assign a single stable address for SMTP
sudo ip -6 addr add 2001:db8:100::1/64 dev eth0

# Pin Postfix to this address
sudo postconf -e 'smtp_bind_address6 = 2001:db8:100::1'
```

## 5. Monitor Blacklists

IPv6 DNSBL support varies by provider. Monitor your IPs using the query format documented by the DNSBL you use:

```bash
# Example: Spamhaus DQS IPv6 lookup
# Replace <key> with your Spamhaus DQS key
python3 - << 'EOF'
import ipaddress
import subprocess

ip = "2001:db8::10"
dnsbl_zone = "<key>.zen.dq.spamhaus.net"

# Reverse the IPv6 address for DNSBL lookup
expanded = ipaddress.IPv6Address(ip).exploded.replace(":", "")
reversed_ip = ".".join(reversed(expanded))

query = f"{reversed_ip}.{dnsbl_zone}"
result = subprocess.run(["dig", "+short", query], capture_output=True, text=True)

if result.stdout.strip():
    print(f"LISTED in {dnsbl_zone}: {result.stdout.strip()}")
else:
    print(f"Not listed in {dnsbl_zone}")
EOF
```

## 6. Configure Postfix for Best IPv6 Practices

```ini
# /etc/postfix/main.cf - Recommended IPv6 settings
inet_protocols = all
smtp_address_preference = any
smtp_bind_address6 = 2001:db8::10
smtp_bind_address = 203.0.113.10
myhostname = mail.example.com
smtp_helo_name = $myhostname
```

## 7. Monitor Delivery Rates

```bash
# Count daily delivery success rates
sudo grep -oE 'status=(sent|deferred|bounced)' /var/log/mail.log | \
    sort | uniq -c

# Track IPv6 vs IPv4 delivery
sudo grep "status=sent" /var/log/mail.log | \
    grep -oE 'relay=[^ ]+\[[^]]+\]' | \
    awk '{if ($0 ~ /:/) print "IPv6"; else print "IPv4"}' | \
    sort | uniq -c
```

## 8. Register with Postmaster Tools

Register with the major provider tools that apply to your audience:

- **Google Postmaster Tools**: https://postmaster.google.com
- **Microsoft SNDS**: https://sendersupport.olc.protection.outlook.com/snds
- **Yahoo Complaint Feedback Loop / Sender Hub**: https://senders.yahooinc.com/complaint-feedback-loop/

These provide visibility into sender reputation, complaint data, or deliverability guidance depending on the provider.

## Summary Checklist

- [ ] PTR record configured for IPv6 sending address
- [ ] FCrDNS verified (PTR → hostname → AAAA matches)
- [ ] SPF record authorizes your IPv6 sending address
- [ ] DKIM signing configured and DNS record published
- [ ] DMARC record published (`p=none` is acceptable initially)
- [ ] Privacy extensions disabled on mail server interface
- [ ] Postfix bound to stable IPv6 address
- [ ] IPv6 not listed in the DNSBLs you monitor
- [ ] Registered with relevant Google/Microsoft/Yahoo sender tools

## Conclusion

IPv6 email deliverability requires the same authentication foundations as IPv4 (SPF, DKIM, DMARC) plus additional infrastructure work unique to IPv6: stable PTR/FCrDNS, disabled privacy extensions, address warmup, and monitoring on IPv6-capable DNSBLs and reputation services. Building these foundations correctly from the start saves significant troubleshooting time.
