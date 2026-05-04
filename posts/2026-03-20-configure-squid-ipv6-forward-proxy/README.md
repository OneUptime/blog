# How to Configure Squid as an IPv6 Forward Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Squid, Forward Proxy, HTTP Proxy, Networking

Description: Configure Squid as an IPv6 forward proxy that accepts connections from IPv6 clients and forwards requests to IPv6 destinations, with ACLs and caching.

## Introduction

A forward proxy accepts client requests and forwards them to origin servers. Configuring Squid as an IPv6 forward proxy allows IPv6 clients to route web traffic through the proxy, providing caching, filtering, and access control. This differs from a general Squid setup that also handles IPv4.

## IPv6-Focused squid.conf

```squid
# /etc/squid/squid.conf - IPv6 Forward Proxy

# Listen on IPv6 only (port 3128)

http_port [::]:3128

# Listen on both IPv4 and IPv6 (dual-stack)
# http_port 3128      # IPv4
# http_port [::]:3128 # IPv6

# Prefer IPv6 for outbound connections to origin servers
dns_v4_first off

# Upstream DNS via IPv6
dns_nameservers 2001:4860:4860::8888 2606:4700:4700::1111

# ACL: define IPv6 internal networks that are allowed to use this proxy
acl internal_ipv6_clients src 2001:db8:1::/48
acl internal_ipv6_clients src fd00::/8
acl localhost src ::1/128

# Access rules
http_access allow localhost
http_access allow internal_ipv6_clients
http_access deny all

# Cache settings
cache_dir ufs /var/spool/squid 10000 16 256
maximum_object_size 10 MB
cache_mem 256 MB

# Logging - logs client IPv6 addresses
access_log /var/log/squid/access.log squid
```

## Filtering IPv6 Destinations

```squid
# Block access to certain IPv6 ranges from the proxy
acl blocked_ipv6 dst 2001:db8:dead::/48
acl blocked_ipv6 dst fc00::/7   # Don't proxy to ULA addresses

# Block local IPv6 (prevent SSRF via proxy)
acl local_ipv6 dst ::1/128
acl local_ipv6 dst fe80::/10
acl local_ipv6 dst fd00::/8

http_access deny blocked_ipv6
http_access deny local_ipv6
```

## Client Configuration for IPv6 Proxy

```bash
# Configure curl to use IPv6 proxy
curl --proxy http://[2001:db8::1]:3128 https://example.com

# Environment variable approach
export http_proxy="http://[2001:db8::1]:3128"
export https_proxy="http://[2001:db8::1]:3128"
curl https://example.com

# Browser: set proxy in browser network settings
# Proxy: [2001:db8::1]
# Port: 3128

# Python requests via IPv6 proxy
import requests
proxies = {
    "http": "http://[2001:db8::1]:3128",
    "https": "http://[2001:db8::1]:3128",
}
response = requests.get("https://example.com", proxies=proxies)
```

## SSL Bumping (HTTPS Inspection) with IPv6

```squid
# Enable SSL bumping for IPv6 CONNECT requests
# First, generate a CA certificate
# openssl genrsa -out /etc/squid/ssl_ca.key 4096
# openssl req -x509 -new -nodes -key ssl_ca.key -out /etc/squid/ssl_ca.crt

# SSL bump config
https_port [::]:3129 ssl-bump \
  cert=/etc/squid/ssl_ca.crt \
  key=/etc/squid/ssl_ca.key \
  generate-host-certificates=on

ssl_bump stare all
ssl_bump bump all

# ACL for SSL inspection
acl CONNECT method CONNECT
http_access allow CONNECT internal_ipv6_clients
```

## Monitoring Proxy Usage

```bash
# Real-time access log monitoring
tail -f /var/log/squid/access.log | \
  grep --line-buffered "2001:db8:" | \
  awk '{print $3, $7}'
# Shows IPv6 client addresses and URLs

# Count requests by IPv6 /64 subnet
awk '{print $3}' /var/log/squid/access.log | \
  grep "2001:db8:" | \
  awk -F: '{print $1":"$2":"$3":"$4}' | \
  sort | uniq -c | sort -rn | head -20

# Check cache hit ratio
squidclient -h ::1 mgr:info | grep "Requests"
```

## Conclusion

Squid as an IPv6 forward proxy requires `http_port [::]:3128` for IPv6 listening, `dns_v4_first off` to prefer IPv6 DNS and connections, and IPv6-specific ACLs using CIDR notation. Block SSRF vectors (loopback, ULA, link-local) from being proxied. Monitor proxy access logs for IPv6 client traffic patterns with OneUptime.
