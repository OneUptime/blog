# How to Configure Squid http_port to Listen on a Specific IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv4, Http_port, Proxy, Configuration, Networking

Description: Configure Squid's http_port directive to listen on a specific IPv4 address instead of all interfaces, controlling which network interface serves proxy traffic.

## Introduction

Squid's `http_port` directive defines where it accepts client connections. By default, Squid listens on `0.0.0.0:3128` (all interfaces). Binding to a specific IPv4 address restricts proxy access to a particular network interface.

## Basic http_port Configuration

```bash
# /etc/squid/squid.conf

# Default (all interfaces, port 3128)

# http_port 3128

# Bind to specific IPv4 address
# http_port 10.0.0.1:3128

# Multiple listen addresses
http_port 10.0.0.1:3128    # Internal network proxy
http_port 127.0.0.1:3128   # Localhost only
```

## Multiple Ports with Different Options

```bash
# /etc/squid/squid.conf

# Standard proxy on internal interface
http_port 10.0.0.1:3128

# Transparent proxy on DMZ interface
http_port 192.168.10.1:3129 intercept

# SSL bump-capable port (requires ssl_bump rules to decrypt traffic)
http_port 10.0.0.1:3130 ssl-bump \
    tls-cert=/etc/squid/ssl/squid.pem \
    generate-host-certificates=on \
    dynamic_cert_mem_cache_size=4MB
```

## Access Control for the Proxy Port

Define which clients can use the proxy:

```bash
# /etc/squid/squid.conf

http_port 10.0.0.1:3128

# ACL: allow only internal network
acl internal_net src 10.0.0.0/8
acl internal_net src 192.168.0.0/16

http_access allow internal_net
http_access deny all
```

## Verifying Squid Binds to Correct Address

```bash
# Check what Squid is listening on
sudo ss -tlnp | grep squid

# Expected:
# LISTEN 0 128 10.0.0.1:3128 0.0.0.0:*  users:(("squid",...))

# Test proxy connectivity from client
curl -x http://10.0.0.1:3128 http://httpbin.org/ip

# Check Squid config for errors
sudo squid -k parse

# Reload config without restart
sudo squid -k reconfigure
```

## Full squid.conf Example

```bash
# /etc/squid/squid.conf

# Listen on internal interface only
http_port 10.0.0.1:3128

# Access controls
acl localnet src 10.0.0.0/8
acl localnet src 192.168.0.0/16

acl SSL_ports port 443
acl Safe_ports port 80 443 21 70 210 1025-65535

http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localnet
http_access deny all

# Cache settings
cache_mem 256 MB
maximum_object_size 100 MB
cache_dir ufs /var/spool/squid 10000 16 256

# Logging
access_log daemon:/var/log/squid/access.log logformat=squid
cache_log /var/log/squid/cache.log
```

## Conclusion

Binding Squid's `http_port` to a specific IPv4 address is a single configuration line change. Use `http_port <IP>:<port>` to restrict which interface accepts proxy connections, combine with ACL rules to control which clients can use the proxy, and validate with `squid -k parse` before applying changes.
