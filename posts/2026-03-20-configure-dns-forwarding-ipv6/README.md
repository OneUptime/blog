# How to Configure DNS Forwarding for IPv6 Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, DNS Forwarding, BIND, Unbound

Description: A guide to configuring DNS forwarders that accept and forward IPv6 DNS queries to upstream resolvers, including IPv6 forwarder addresses.

## DNS Forwarding Overview

DNS forwarding means your local resolver sends queries to a specific upstream resolver instead of performing full recursion. With IPv6, you can configure:
1. Forwarder addresses as IPv6 (use IPv6 to reach the upstream)
2. Accept IPv6 queries from clients and forward them (over either IPv4 or IPv6)

## BIND Forwarding Configuration

### Forward All Queries to IPv6 Upstreams

```named
// /etc/named.conf

options {
    listen-on-v6 { any; };   // Accept queries from IPv6 clients
    allow-query { any; };

    // Forward to both IPv4 and IPv6 upstream resolvers
    forwarders {
        8.8.8.8;                     // Google DNS IPv4
        8.8.4.4;                     // Google DNS IPv4
        1.1.1.1;                     // Cloudflare IPv4
        2001:4860:4860::8888;        // Google DNS IPv6
        2001:4860:4860::8844;        // Google DNS IPv6
        2606:4700:4700::1111;        // Cloudflare IPv6
    };

    // forward first: try forwarders, fall back to recursion if they fail
    // forward only: only use forwarders, return SERVFAIL if they fail
    forward first;
};
```

### Per-Domain Forwarding with IPv6

Forward specific domains to different resolvers (split DNS):

```named
// Forward internal domain to internal resolver
zone "internal.example.com" {
    type forward;
    forwarders {
        192.168.1.53;       // internal IPv4 DNS
        2001:db8::53;       // internal IPv6 DNS
    };
};

// Forward to a company's IPv6 DNS over a specific domain
zone "partner.example.com" {
    type forward;
    forwarders {
        2001:db8:100::53;
    };
    forward only;
};

// Negative forwarding: handle this zone locally, don't forward
zone "example.com" {
    type master;
    file "/var/named/example.com.zone";
};
```

## Unbound Forwarding Configuration

```yaml
# /etc/unbound/unbound.conf

server:
    interface: 0.0.0.0
    interface: ::0
    access-control: 192.168.0.0/16 allow
    access-control: 2001:db8::/32 allow
    do-ip6: yes

# Forward all queries to upstream resolvers

forward-zone:
    name: "."
    # IPv6 forwarders (preferred)
    forward-addr: 2001:4860:4860::8888
    forward-addr: 2001:4860:4860::8844
    forward-addr: 2606:4700:4700::1111
    # IPv4 fallback forwarders
    forward-addr: 8.8.8.8
    forward-addr: 1.1.1.1
    # Use plain DNS transport to upstreams
    forward-tls-upstream: no  # set yes for DNS-over-TLS
```

### Stub Zone for Internal Domains

```yaml
# Resolve internal zone via an internal authoritative server
stub-zone:
    name: "internal.example.com"
    stub-addr: 192.168.1.53      # internal authoritative DNS IPv4
    stub-addr: 2001:db8::53      # internal authoritative DNS IPv6
    stub-prime: no
```

## CoreDNS Forwarding Configuration

```corefile
# /etc/coredns/Corefile

# Forward everything to upstream resolvers
.:53 {
    # Accept queries from any client (including IPv6)
    # CoreDNS binds to wildcard addresses by default

    # Forward to upstream resolvers
    forward . 8.8.8.8 8.8.4.4 [2001:4860:4860::8888] [2001:4860:4860::8844] {
        prefer_udp
    }

    # Cache responses
    cache 300

    # Log queries
    log

    errors
}

# Split DNS: forward internal domain to internal resolver
internal.example.com:53 {
    forward . 192.168.1.53 [2001:db8::53]
}
```

## Testing Forwarding with IPv6

```bash
# Verify forwarding is working: query resolver, check response
dig AAAA google.com @::1

# Check if the resolver uses IPv6 for upstream queries
# On the resolver host, capture traffic to an IPv6 forwarder in another terminal
sudo tcpdump -ni any 'port 53 and host 2001:4860:4860::8888'

# Make a query through the local resolver for a name that is not already cached
dig AAAA ipv6.google.com @127.0.0.1

# For Unbound with remote control enabled: check verbosity output
sudo unbound-control verbosity 3
dig AAAA ipv6.google.com @127.0.0.1
# Look for outbound queries to the configured IPv6 forwarder addresses
```

## Verifying Forwarder Reachability

Before configuring a forwarder, verify it's reachable:

```bash
# Test DNS reachability over IPv6 to Google's IPv6 resolver
dig AAAA google.com @2001:4860:4860::8888

# Test Cloudflare's IPv6 resolver
dig AAAA google.com @2606:4700:4700::1111

# Test latency to IPv6 forwarders
for FWD in "2001:4860:4860::8888" "2606:4700:4700::1111" "2620:fe::fe"; do
    echo -n "$FWD: "
    ping -6 -c 3 "$FWD" 2>/dev/null | grep avg | awk -F'/' '{print $5 "ms"}'
done
```

## Summary

Configure DNS forwarding for IPv6 by listing IPv6 forwarder addresses alongside IPv4 fallbacks in BIND's `forwarders {}` block, Unbound's `forward-zone`, or CoreDNS's `forward` directive. Use both IPv4 and IPv6 forwarders for resilience. Test with `dig @::1` to verify client-facing IPv6 acceptance and use resolver logs or packet capture to confirm it uses IPv6 for upstream queries.
