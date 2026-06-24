# How to Configure CoreDNS for IPv6 Standalone Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CoreDNS, DNS, IPv6, Corefile, Kubernetes, Authoritative, Forwarding

Description: Configure CoreDNS as a standalone DNS server with IPv6 support, serving zones and forwarding queries over IPv6 transport using the Corefile syntax.

## Introduction

CoreDNS is a flexible, plugin-based DNS server written in Go. Widely used with Kubernetes, it works equally well as a standalone DNS server. A server block such as `.:53` binds to the wildcard host by default, and the `bind` plugin can restrict it to a specific IPv6 address. It supports forwarding, caching, zone files, and DNSSEC signing for authoritative data.

## Installation

```bash
# Download binary

curl -LO https://github.com/coredns/coredns/releases/download/v1.14.2/coredns_1.14.2_linux_amd64.tgz
tar -xzf coredns_1.14.2_linux_amd64.tgz
sudo mv coredns /usr/local/bin/

# Or via package manager (varies by distro)
# Container image
docker pull coredns/coredns:latest
```

## Step 1: Basic Corefile

```corefile
# /etc/coredns/Corefile

# Listen on all IPv6 and IPv4 interfaces on port 53
.:53 {
    # Enable logging
    log

    # Forward to upstream resolvers, including IPv6 upstreams
    forward . 2606:4700:4700::1111 2606:4700:4700::1001 8.8.8.8 {
        prefer_udp
        health_check 5s
    }

    # Caching
    cache 300

    # Health endpoint
    health [::1]:8080

    # Prometheus metrics
    prometheus [::1]:9153

    # Error logging
    errors
}
```

## Step 2: Serve an Authoritative Zone

```corefile
# /etc/coredns/Corefile

# Authoritative zone
example.com.:53 {
    file /etc/coredns/zones/example.com.zone
    log
    errors
}

# Catch-all forwarding
.:53 {
    forward . 2606:4700:4700::1111 8.8.8.8
    cache 300
    log
    errors
}
```

```dns-zone
; /etc/coredns/zones/example.com.zone
$TTL 3600
@   IN  SOA ns1.example.com. admin.example.com. (
            2026031901 3600 900 604800 300 )

@   IN  NS  ns1.example.com.
ns1 IN  AAAA 2001:db8::1
ns1 IN  A    203.0.113.1

@   IN  AAAA 2001:db8::10
@   IN  A    203.0.113.10
www IN  AAAA 2001:db8::10
www IN  A    203.0.113.10
```

## Step 3: Listen on Specific IPv6 Address

```corefile
# Listen only on IPv6 loopback
.:53 {
    bind ::1
    forward . 2606:4700:4700::1111
    cache 300
    log
}

# Listen on specific public IPv6
example.com.:53 {
    bind 2001:db8::53
    file /etc/coredns/zones/example.com.zone
    log
}
```

## Step 4: Split Horizon (Different Answers for Internal/External)

```corefile
# Internal view - serve local AAAA records
example.com.:53 {
    view internal {
        expr incidr(client_ip(), '2001:db8::/32')
    }
    file /etc/coredns/zones/example.com.internal.zone
    log
}

# External view (default)
example.com.:53 {
    file /etc/coredns/zones/example.com.external.zone
    log
}
```

## Step 5: Run as a Service

```ini
# /etc/systemd/system/coredns.service
[Unit]
Description=CoreDNS DNS server
After=network.target

[Service]
User=coredns
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
ExecStart=/usr/local/bin/coredns -conf /etc/coredns/Corefile
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now coredns

# Test
dig AAAA www.example.com @::1
dig AAAA google.com @::1

# Check metrics
curl -s http://[::1]:9153/metrics | grep coredns_dns_requests_total
```

## Conclusion

CoreDNS can listen on IPv6 without a special flag when it is bound to the wildcard host or an explicit IPv6 address. The plugin system makes it easy to combine authoritative zones, forwarding, caching, and DNSSEC signing for authoritative data in one binary. Use the Prometheus plugin and OneUptime to monitor DNS query counts, error rates, and latency.
