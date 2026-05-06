# How to Configure DNS Round-Robin for Simple Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DNS, Round-Robin, Load Balancing, Linux, BIND, Configuration

Description: Configure DNS round-robin load balancing by creating multiple A records for the same hostname, with considerations for session persistence and health checking.

## Introduction

DNS round-robin distributes traffic across multiple servers by returning different IP addresses in rotating order for the same hostname. It requires no special load balancer hardware and works with any application. However, it has important limitations: no health checking, session stickiness is unreliable, and load distribution depends on client caching behavior. Understanding when DNS round-robin is appropriate guides its use.

## Configure Round-Robin in BIND

```bash
# Multiple A records for the same name = round-robin:

cat >> /etc/bind/zones/db.example.com << 'EOF'
; Round-robin across 3 web servers:
www     60  IN  A  10.20.0.10
www     60  IN  A  10.20.0.11
www     60  IN  A  10.20.0.12
; TTL=60: shorter TTL encourages more frequent re-queries
; (distribution is still affected by caching resolvers)
EOF

# Reload BIND:
rndc reload example.com

# Verify round-robin:
dig @127.0.0.1 www.example.com +short
# Returns all 3 IPs; order may vary

dig @127.0.0.1 www.example.com +short
# Second query may show a different order
```

## Configure BIND's RRset Ordering

```bash
# BIND has a rrset-order directive to control answer ordering:
# /etc/bind/named.conf.options:
options {
    # Explicit round-robin rotation:
    rrset-order { order cyclic; };

    # If you leave rrset-order unset, BIND uses its version-specific default.
};
```

## Configure with dnsmasq

```bash
# dnsmasq can return multiple A records for the same name:
cat >> /etc/dnsmasq.d/lb.conf << 'EOF'
# Round-robin across 3 servers:
host-record=api.example.com,10.20.0.10,60
host-record=api.example.com,10.20.0.11,60
host-record=api.example.com,10.20.0.12,60

# dnsmasq permutes A/AAAA answers by default unless no-round-robin is set
EOF
```

## TTL Considerations

```bash
# TTL determines how long a resolver may cache the RRset:
# TTL=3600: a client or recursive resolver may keep returning the same cached RRset
#           → Fewer fresh DNS lookups, so distribution changes more slowly
# TTL=60:   encourages more frequent re-queries → better distribution across fresh lookups
# TTL=0:    disables caching beyond the current transaction
#           → Higher DNS query load, usually not recommended

# Common starting point: TTL 30-60 for simple round-robin load balancing
# This balances re-query frequency against DNS server load

# Check effective TTL:
dig www.example.com | grep -A1 "ANSWER" | tail -1 | awk '{print "TTL:", $2}'
```

## Limitations of DNS Round-Robin

```bash
# 1. No health checking
# If a server goes down, DNS still returns its IP
# Clients can get connection failures until they re-query and pick a healthy IP

# 2. Unequal distribution
# Clients cache differently; some may cache longer than TTL
# Some clients (DNS forwarders) serve many clients, amplifying one IP

# 3. Session persistence unreliable
# Subsequent queries may return different IPs
# Multi-request protocols (HTTP keep-alive is fine; HTTP/1.0 per-request may break)

# 4. Thundering herd
# When TTL expires simultaneously for many clients, many may re-query at once
# Clients behind the same caching resolver often see the same cached RRset until it expires

# When to use DNS round-robin:
# - Stateless services (each request independent)
# - Batch jobs where session persistence doesn't matter
# - Simple distribution across multiple equivalent servers
# - Simple redundancy (acceptable that unhealthy server gets traffic briefly)
```

## Health-Checked Alternative

```bash
# For health checking on a dynamically updatable zone: use nsupdate
# The zone must allow updates from this client or TSIG key.
# Simple health check + nsupdate script:

#!/bin/bash
SERVER_IP="10.20.0.12"
DOMAIN="www.example.com"
DNS_SERVER="10.20.0.1"

if ! curl -sf "http://$SERVER_IP/health" > /dev/null 2>&1; then
    echo "Server $SERVER_IP unhealthy, removing from DNS"
    nsupdate << EOF
server $DNS_SERVER
zone example.com
update delete $DOMAIN A $SERVER_IP
send
EOF
fi
```

## Conclusion

DNS round-robin is the simplest load balancing mechanism requiring no infrastructure beyond your existing DNS. Configure multiple A records with a short TTL (30-60 seconds) for reasonable distribution. Use BIND's `rrset-order cyclic` if you want explicit rotation. Understand the limitations: no health checking, no true session persistence, and uneven distribution due to client-side caching. For production load balancing with health checks, DNS round-robin is a reasonable first step before investing in a proper load balancer, or as a complement to load balancers for geographic distribution.
