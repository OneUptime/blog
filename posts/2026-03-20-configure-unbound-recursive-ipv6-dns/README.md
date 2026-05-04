# How to Configure Unbound as a Recursive IPv6 DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Unbound, DNS, IPv6, Recursive, Resolver, DNSSEC, Privacy

Description: Configure Unbound as a validating, recursive, caching DNS resolver with full IPv6 support including dual-stack listening and outbound IPv6 queries.

## Introduction

Unbound is a lightweight, security-focused recursive DNS resolver developed by NLnet Labs. It supports IPv6 natively and is commonly used as a local resolver on servers and as a privacy-preserving alternative to ISP resolvers.

## Installation

```bash
# Ubuntu/Debian

apt-get install -y unbound

# RHEL/CentOS
dnf install -y unbound

# Verify
unbound -V
```

## Step 1: Basic IPv6 Configuration

```yaml
# /etc/unbound/unbound.conf

server:
    # Listen on all interfaces (IPv4 and IPv6)
    interface: 0.0.0.0
    interface: ::0

    # Or listen on specific addresses
    # interface: ::1
    # interface: 2001:db8::53

    port: 53

    # Allow queries from these networks
    access-control: ::1/128 allow
    access-control: fe80::/10 allow
    access-control: 2001:db8::/32 allow
    access-control: 127.0.0.0/8 allow
    access-control: 192.168.0.0/16 allow
    access-control: 0.0.0.0/0 refuse
    access-control: ::/0 refuse

    # Prefer IPv6 for outbound queries
    prefer-ip6: yes

    # DNSSEC validation
    auto-trust-anchor-file: "/var/lib/unbound/root.key"

    # Harden against DNS poisoning
    harden-glue: yes
    harden-dnssec-stripped: yes

    # Privacy: minimize query information sent upstream
    qname-minimisation: yes
```

## Step 2: Performance Tuning

```yaml
server:
    # Thread and cache configuration
    num-threads: 4
    msg-cache-size: 64m
    rrset-cache-size: 128m
    cache-min-ttl: 60
    cache-max-ttl: 86400

    # Prefetch popular records before they expire
    prefetch: yes
    prefetch-key: yes

    # Outbound connections
    outgoing-range: 8192
    num-queries-per-thread: 4096

    # Use IPv6 source port randomization
    outgoing-port-permit: 1024-65535
```

## Step 3: Forward to Upstream (Optional)

```yaml
# Forward zone for specific domain
forward-zone:
    name: "example.internal."
    forward-addr: 2001:db8:1::53        # Internal DNS over IPv6
    forward-addr: 192.168.1.53          # Fallback IPv4

# Forward all queries to upstream resolvers over DNS-over-TLS.
# forward-tls-upstream applies to every forward-addr in this zone, so
# all addresses must support DoT and be reached on port 853 with the
# correct TLS authentication name for certificate validation.
server:
    tls-cert-bundle: "/etc/ssl/certs/ca-certificates.crt"

forward-zone:
    name: "."
    forward-tls-upstream: yes
    forward-addr: 2606:4700:4700::1111@853#one.one.one.one  # Cloudflare IPv6
    forward-addr: 2606:4700:4700::1001@853#one.one.one.one
    forward-addr: 8.8.8.8@853#dns.google                    # Google DoT
```

## Step 4: Root Hints

```bash
# Download current root hints
curl -o /etc/unbound/root.hints \
    https://www.internic.net/domain/named.root
```

```yaml
server:
    root-hints: "/etc/unbound/root.hints"
```

## Step 5: Validate and Start

```bash
# Check configuration
unbound-checkconf /etc/unbound/unbound.conf

# Initialize DNSSEC trust anchor
unbound-anchor -a /var/lib/unbound/root.key

# Start Unbound
systemctl enable --now unbound
systemctl status unbound

# Verify listening on IPv6
ss -lnpu | grep unbound
```

## Testing

```bash
# Test AAAA resolution via IPv6
dig AAAA google.com @::1

# Test DNSSEC validation
dig +dnssec AAAA cloudflare.com @::1
# Check for AD (Authenticated Data) flag

# Test that refused networks are blocked
dig A example.com @::1 -b 2001:db8:99::1
# REFUSED

# Check statistics
unbound-control stats_noreset | grep num.queries
```

## Conclusion

Unbound's IPv6 support is enabled by binding to `::0` and setting `prefer-ip6: yes` for outbound queries. DNSSEC validation and qname minimisation provide both security and privacy. Use OneUptime to monitor Unbound availability and response time from multiple IPv6 vantage points.
