# How to Configure PTR Records for IPv6 SMTP Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PTR, IPv6, DNS, SMTP, Email, Reverse DNS, Mail Deliverability

Description: Configure reverse DNS PTR records for IPv6 mail server addresses to ensure proper mail deliverability and pass receiving server checks.

## Introduction

PTR (pointer) records provide reverse DNS lookup - mapping an IP address back to a hostname. Most receiving mail servers check that your sending IP has a valid PTR record and that the resulting hostname has an A or AAAA record pointing back to the same IP (forward-confirmed reverse DNS, FCrDNS). This is especially important for IPv6 mail servers.

## How IPv6 Reverse DNS Works

IPv6 PTR records live in the `ip6.arpa` zone. An IPv6 address is reversed nibble-by-nibble to form the lookup key.

For example, the address `2001:db8::10` becomes:

```text
0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa
```

## Generating the ip6.arpa Reverse Zone Name

A utility to convert IPv6 to its reverse DNS name:

```bash
# Python helper to generate the reverse DNS name

python3 -c "
import ipaddress
addr = ipaddress.ip_address('2001:db8::10')
print(addr.reverse_pointer)
"
# Output: 0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa

# Or using dig
dig -x 2001:db8::10
```

## Requesting PTR Records from Your ISP/Hosting Provider

Most hosting providers allow PTR records through a control panel or API. Use the provider's IPv6 reverse DNS workflow:

```bash
# Hetzner Cloud: change reverse DNS for an IPv6 Primary IP
curl -X POST "https://api.hetzner.cloud/v1/primary_ips/<id>/actions/change_dns_ptr" \
    -H "Authorization: Bearer $HETZNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"ip":"2001:db8::10","dns_ptr":"mail.example.com"}'
```

## Configuring PTR Records on Your Own Zone (ARIN/RIPE Delegated)

If you have control of your own IPv6 allocation, add the PTR record to your reverse zone:

```dns
; Reverse zone for 2001:db8::/32 (RIPE example)
; File: db.2001.db8.ip6.arpa

; PTR record for 2001:db8::10 (mail server)
0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0  IN  PTR  mail.example.com.
```

## Verifying PTR Records

After setting the PTR record, verify forward and reverse lookups match:

```bash
# Reverse lookup for the IPv6 address
dig -x 2001:db8::10 +short
# Expected: mail.example.com.

# Forward lookup to confirm FCrDNS
dig AAAA mail.example.com +short
# Expected: 2001:db8::10

# Combined FCrDNS check using getent
getent hosts mail.example.com
getent hosts 2001:db8::10
```

## Testing Public DNS Visibility and SMTP Service

```bash
# Query a public resolver to confirm the PTR is visible outside your network
dig @1.1.1.1 -x 2001:db8::10 +short
# Expected: mail.example.com.

# Test the SMTP greeting on the IPv6 listener
openssl s_client -connect [2001:db8::10]:25 -starttls smtp 2>/dev/null | head -5
```

## Postfix Configuration to Use the Correct Hostname

Ensure Postfix identifies itself with the hostname matching the PTR record:

```bash
# Set Postfix hostname to match PTR
sudo postconf -e 'myhostname = mail.example.com'
sudo postconf -e 'smtp_helo_name = $myhostname'
sudo systemctl reload postfix

# Verify the configured hostnames Postfix will use
postconf myhostname smtp_helo_name
```

## Common Issues

**PTR set but FCrDNS fails**: The PTR points to `mail.example.com` but `mail.example.com` has no AAAA record or points to a different IP. Fix the forward AAAA record.

**PTR propagation delay**: Allow up to 48 hours for reverse DNS delegation changes to propagate.

**Hosting provider doesn't support IPv6 PTR**: Some providers only support IPv4 PTR records. In this case, consider using a different provider or ISP for your IPv6 mail server.

## Conclusion

Valid PTR records for IPv6 SMTP servers are non-negotiable for good mail deliverability. The PTR must resolve to your mail server's hostname, and that hostname must have an AAAA record pointing back to the same IPv6 address, forming forward-confirmed reverse DNS.
