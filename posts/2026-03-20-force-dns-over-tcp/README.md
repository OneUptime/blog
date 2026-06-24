# How to Force DNS Queries Over TCP Instead of UDP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, TCP, UDP, Linux, Networking, Configuration, Troubleshooting

Description: Configure DNS clients to use TCP instead of UDP for all queries, useful when UDP is blocked, to verify TCP DNS works, or to bypass UDP packet size limitations.

## Introduction

DNS defaults to UDP for efficiency but falls back to TCP when responses are truncated or too large for UDP. In some environments, UDP port 53 is blocked while TCP port 53 is allowed, requiring explicit TCP configuration. Forcing TCP is also useful for debugging: if DNS works over TCP but not UDP, you likely have a UDP filtering, fragmentation, or path issue. This guide covers forcing TCP at the query, application, and system resolver levels.

## Force TCP with dig

```bash
# Force TCP for a single query:

dig example.com +tcp

# Verify TCP is used:
tcpdump -i eth0 -n 'tcp port 53' -c 5 &
dig example.com +tcp
# Should see TCP 3-way handshake followed by DNS query

# Test TCP connectivity without DNS:
nc -z 8.8.8.8 53 && echo "TCP 53 reachable" || echo "TCP 53 blocked"

# Test UDP DNS with a real query:
dig @8.8.8.8 example.com

# Common use case: test from behind a firewall or problematic network path:
dig @8.8.8.8 example.com +tcp
# If this works but plain UDP queries do not, UDP transport is being filtered or failing on the path
```

## Force TCP in systemd-resolved

```bash
# Enable DNS over TLS for upstream queries (which uses TCP with TLS):
# /etc/systemd/resolved.conf.d/force-dot.conf:
mkdir -p /etc/systemd/resolved.conf.d
cat > /etc/systemd/resolved.conf.d/force-dot.conf << 'EOF'
[Resolve]
DNS=8.8.8.8#dns.google
DNSOverTLS=yes
EOF

systemctl restart systemd-resolved

# Verify DoT is enabled:
resolvectl status | grep -i 'DNSOverTLS'

# For plain TCP (not TLS), systemd-resolved doesn't have a direct TCP-only option
# Use Unbound or direct application configuration instead
```

## Force TCP in Unbound

```bash
# Configure Unbound to use TCP for upstream queries:
cat >> /etc/unbound/unbound.conf << 'EOF'
server:
    # Force TCP for all upstream queries:
    tcp-upstream: yes
EOF

unbound-checkconf && systemctl restart unbound

# Verify Unbound is using TCP:
tcpdump -i eth0 -n 'tcp port 53' &
dig @127.0.0.1 google.com
# Should see TCP connections from Unbound to upstream resolver
```

## Application-Level TCP DNS

```python
#!/usr/bin/env python3
# Force TCP in Python DNS query (using dnspython):
# pip install dnspython

import dns.resolver
import dns.query
import dns.message

# Method 1: Use dnspython's TCP-aware functions
def query_dns_tcp(domain, record_type='A', server='8.8.8.8'):
    q = dns.message.make_query(domain, record_type)

    # Force TCP:
    response = dns.query.tcp(q, server, port=53, timeout=5)
    return response

response = query_dns_tcp('example.com')
for rr in response.answer:
    print(rr)

# Method 2: Resolver with TCP flag:
resolver = dns.resolver.Resolver()
resolver.nameservers = ['8.8.8.8']
answer = resolver.resolve('example.com', 'A', tcp=True)
for rr in answer:
    print(rr)
```

## Configure Resolver for TCP (BIND9)

```bash
# BIND already retries over TCP when needed after a truncated UDP response.
# There is no general "tcp-only" option for recursive upstream queries.

# If you want to force a TCP-based transport, BIND 9.20+ can
# forward to a DNS-over-TLS resolver:
tls GOOGLE {
    remote-hostname "dns.google";
};

options {
    forward only;
    forwarders port 853 tls GOOGLE {
        8.8.8.8;
    };
};
```

## Verify TCP DNS is Working

```bash
# Comprehensive test: verify TCP 53 works and UDP 53 works:
echo "=== UDP DNS Test ==="
dig @8.8.8.8 google.com | grep "Query time"

echo "=== TCP DNS Test ==="
dig @8.8.8.8 google.com +tcp | grep "Query time"

# Test specific port:
# DNS over TLS (port 853):
dig @8.8.8.8 google.com +tls +tls-ca +tls-hostname=dns.google

# Capture to verify transport:
tcpdump -i eth0 -n '(tcp or udp) and port 53' -c 10 &
dig @8.8.8.8 google.com        # UDP
dig @8.8.8.8 google.com +tcp   # TCP
wait
```

## Conclusion

Force TCP for DNS with `dig +tcp` for single queries. When UDP is blocked, TCP DNS provides a reliable fallback - verify TCP port 53 with `nc -z` and verify UDP with a real DNS query. For production environments where UDP is blocked, configure `systemd-resolved` with `DNSOverTLS=yes` and a resolver hostname for encrypted TCP, or configure Unbound with `tcp-upstream: yes` for unencrypted TCP. DNS over TCP may add latency when a new connection is opened, though connection reuse can reduce that overhead.
