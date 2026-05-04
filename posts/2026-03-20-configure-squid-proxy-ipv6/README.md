# How to Configure Squid Proxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Proxy, IPv6, HTTP, Forward Proxy, Caching, ACL

Description: Configure Squid proxy server to listen on IPv6 addresses, allow IPv6 clients, and forward requests to IPv6 and IPv4 origins in a dual-stack environment.

## Introduction

Squid is a widely used caching HTTP proxy. Enabling IPv6 allows Squid to accept connections from IPv6 clients and forward requests to IPv6 origin servers. Configuration requires setting IPv6 listening ports and ACLs for IPv6 client networks.

## Installation

```bash
apt-get install -y squid
```

## Step 1: squid.conf for IPv6

```nginx
# /etc/squid/squid.conf

# Listen on all IPv6 interfaces on port 3128

http_port [::]:3128

# Also listen on IPv4
http_port 3128

# Or listen on specific IPv6 address
# http_port [2001:db8::1]:3128

# Transparent proxy on IPv6 (requires ip6tables REDIRECT)
# http_port [::]:3129 intercept
```

## Step 2: Access Control for IPv6 Clients

```nginx
# /etc/squid/squid.conf

# Define IPv6 client networks
acl internal_ipv6 src 2001:db8::/32
acl loopback_ipv6 src ::1/128
acl linklocal_ipv6 src fe80::/10

# Allow IPv6 internal clients
http_access allow internal_ipv6
http_access allow loopback_ipv6

# Allow safe ports (includes connections to IPv6 origins)
acl safe_ports port 80 443 8080

# Deny all other access
http_access deny all
```

## Step 3: Outbound via IPv6 or IPv4

```nginx
# /etc/squid/squid.conf

# Prefer IPv6 for outbound connections
dns_v4_first off

# Or force IPv4 for outbound (if origin servers are IPv4 only)
# dns_v4_first on

# Bind outbound connections to specific IPv6 address
# tcp_outgoing_address 2001:db8::1

# DNS servers (prefer IPv6 resolvers)
dns_nameservers 2606:4700:4700::1111 2606:4700:4700::1001 8.8.8.8
```

## Step 4: SSL Bump for IPv6 HTTPS

```nginx
# /etc/squid/squid.conf (for HTTPS interception)

# CA certificate for SSL bumping
http_port [::]:3129 ssl-bump \
    generate-host-certificates=on \
    cert=/etc/squid/ssl/ca.crt \
    key=/etc/squid/ssl/ca.key

ssl_bump server-first all
```

## Step 5: Logging IPv6 Client Addresses

```nginx
# /etc/squid/squid.conf

# Log format includes %>a (client IP - IPv6 addresses logged natively)
logformat combined %{%Y-%m-%dT%H:%M:%S}tl.%03tu %6tr %>a %Ss/%03>Hs %<st %rm %ru

access_log /var/log/squid/access.log combined
```

## Step 6: Start and Test

```bash
# Validate configuration
squid -k parse

# Start Squid
systemctl enable --now squid

# Verify listening on IPv6
ss -lntp | grep :3128

# Test with IPv6 client
curl -6 -x http://[2001:db8::1]:3128 http://example.com/
curl -6 -x http://[::1]:3128 http://ipv6.google.com/

# Test HTTPS via IPv6 proxy
curl -6 --proxy http://[::1]:3128 https://ipv6.google.com/ -k
```

## Conclusion

Squid listens on IPv6 by adding `http_port [::]:3128` alongside the IPv4 port. ACLs for IPv6 subnets use CIDR notation like `2001:db8::/32`. Set `dns_v4_first off` to prefer IPv6 for outbound connections. Access logs record IPv6 client addresses natively. Monitor Squid proxy availability and cache hit rates with OneUptime.
