# How to Handle IPv6 Migration for Third-Party Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Migration, Third-Party Services, SaaS, Vendor Management

Description: Strategies for handling third-party SaaS services and APIs that lack IPv6 support during IPv6 migration, including vendor engagement, proxying, and NAT64 approaches.

## Introduction

Third-party services - payment gateways, analytics APIs, CDNs, monitoring SaaS, and data providers - are often the last to adopt IPv6. Your migration plan must account for dependencies that cannot be modified. This guide covers how to identify, categorize, and handle third-party IPv6 gaps.

## Step 1: Inventory Third-Party IPv6 Status

```python
#!/usr/bin/env python3
# check_third_party_ipv6.py

import dns.exception
import dns.resolver
import socket
from dataclasses import dataclass

@dataclass
class ThirdPartyStatus:
    name: str
    hostname: str
    has_aaaa: bool
    tcp_443_reachable_via_ipv6: bool
    notes: str = ""

THIRD_PARTY_SERVICES = [
    ("Stripe API", "api.stripe.com"),
    ("Twilio API", "api.twilio.com"),
    ("SendGrid", "api.sendgrid.com"),
    ("Datadog", "app.datadoghq.com"),
    ("PagerDuty", "api.pagerduty.com"),
    ("GitHub", "api.github.com"),
    ("AWS S3", "s3.amazonaws.com"),
    ("Slack API", "slack.com"),
    ("Your CRM API", "api.your-crm.com"),
]

def has_ipv6_tcp_443(hostname: str, timeout: float = 5.0) -> bool:
    try:
        addresses = socket.getaddrinfo(
            hostname,
            443,
            family=socket.AF_INET6,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror:
        return False

    for family, socktype, proto, _, sockaddr in addresses:
        try:
            with socket.socket(family, socktype, proto) as sock:
                sock.settimeout(timeout)
                sock.connect(sockaddr)
            return True
        except OSError:
            continue

    return False

results = []
for name, hostname in THIRD_PARTY_SERVICES:
    # Check AAAA record
    has_aaaa = False
    try:
        dns.resolver.resolve(hostname, "AAAA")
        has_aaaa = True
    except dns.exception.DNSException:
        has_aaaa = False

    # Test TCP/443 reachability over IPv6
    ipv6_reachable = has_ipv6_tcp_443(hostname) if has_aaaa else False

    results.append(ThirdPartyStatus(name, hostname, has_aaaa, ipv6_reachable))

print(f"{'Service':<25} {'AAAA':>6} {'IPv6 TCP/443':>14} Status")
print("-" * 55)
for r in results:
    status = "OK" if r.tcp_443_reachable_via_ipv6 else ("AAAA-only" if r.has_aaaa else "NO IPv6")
    print(f"{r.name:<25} {'Yes' if r.has_aaaa else 'No':>6} {'Yes' if r.tcp_443_reachable_via_ipv6 else 'No':>14}  {status}")
```

## Step 2: Categorize and Plan

| IPv6 Status | Category | Strategy |
|-------------|----------|---------|
| Full IPv6 support | Ready | No action needed |
| AAAA records exist | Partial | Test connectivity, update client config |
| No AAAA, roadmap exists | Planned | Set deadline; escalate if needed |
| No AAAA, no roadmap | Blocked | Use proxy or NAT64 |
| No AAAA, vendor unresponsive | Critical | Find alternative vendor or proxy |

## Strategy A: Direct IPv6 (Best Case)

If a third-party service already has AAAA records, many dual-stack client stacks will reach it over IPv6 automatically. If you need to verify the IPv6 path specifically, bind the client to an IPv6 source address:

```python
import httpx

# Force an IPv6 source address for the API call
transport = httpx.HTTPTransport(
    local_address="2001:db8::10"  # Replace with an IPv6 address on your host
)

with httpx.Client(transport=transport) as client:
    response = client.get("https://api.example-with-ipv6.com/v1/data")
    response.raise_for_status()
```

## Strategy B: Outbound Proxy for IPv4-Only APIs

When your application (IPv6-addressed) needs to call IPv4-only external APIs through an explicit proxy, place a small IPv6-facing relay in front of your existing IPv4 egress proxy:

```haproxy
# HAProxy as an IPv6-facing TCP relay to an existing IPv4 egress proxy
# /etc/haproxy/haproxy-outbound.cfg

frontend outbound_proxy
    bind [::]:3128          # Accept IPv6 connections from app
    mode tcp
    default_backend ipv4_egress

backend ipv4_egress
    mode tcp
    server egress1 203.0.113.1:3128  # IPv4 egress proxy
```

## Strategy C: NAT64 for Systematic IPv4 Egress

```bash
# If running IPv6-only internally and needing IPv4 egress for DNS-named services:

# Option 1: Jool NAT64 (kernel module)
apt-get install jool-dkms jool-tools

# On the NAT64 gateway
sysctl -w net.ipv4.conf.all.forwarding=1
sysctl -w net.ipv6.conf.all.forwarding=1
modprobe jool
jool instance add "default" --netfilter --pool6 64:ff9b::/96

# On IPv6-only clients, route the NAT64 prefix to the translator
ip -6 route add 64:ff9b::/96 via 2001:db8::1

# Configure DNS64
# Named or unbound: synthesize AAAA from A records when no real AAAA exists
# IPv4-only names then resolve under the NAT64 prefix; for example,
# 203.0.113.5 becomes 64:ff9b::cb00:7105 when using 64:ff9b::/96
```

## Strategy D: Vendor Engagement Template

```markdown
# Subject: IPv6 Support Request for [Service Name]

Dear [Vendor] Technical Team,

We are migrating our infrastructure to IPv6 dual-stack by Q3 2026 and
require IPv6 support from our critical vendors.

**Request:**
1. Does [Service Name] currently support IPv6? (AAAA records, IPv6 API endpoints)
2. If not, what is your IPv6 roadmap timeline?
3. Is there an interim IPv6 API endpoint we can test against?

**Impact:**
Our applications will transition to IPv6-only networking in Q4 2026.
Services without IPv6 support will require us to implement workarounds
(proxies, NAT64) which add latency and operational complexity.

We are evaluating alternatives if IPv6 support is not available by Q4 2026.

Please respond by [DATE] to help us plan accordingly.
```

## Tracking Third-Party IPv6 Gaps

```markdown
# Third-Party IPv6 Gap Tracker

| Service | Status | Workaround | Resolution | Owner |
|---------|--------|------------|------------|-------|
| Payment gateway | Blocked | Outbound proxy | Q3 2026 | Platform team |
| Analytics API | Partial | None needed | Ready | N/A |
| Email API | Blocked | NAT64 | Vendor Q4 2026 | Platform team |
| CDN | Ready | N/A | Done | N/A |
```

## Conclusion

Third-party services without IPv6 support require proxying or NAT64 - both are viable but add operational complexity. Inventory all third-party dependencies early (Phase 1 of migration) and engage vendors with IPv6 gaps immediately. The vendor engagement template provides a professional basis for escalation. For services without a credible IPv6 roadmap, NAT64 provides transparent translation for DNS-based outbound calls and is often easier to operate than indefinitely maintaining a patchwork of individual outbound proxies.
