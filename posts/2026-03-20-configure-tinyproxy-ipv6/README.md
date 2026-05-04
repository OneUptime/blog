# How to Configure tinyproxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Tinyproxy, Proxy, IPv6, HTTP, Lightweight, Filtering, Access Control

Description: Configure tinyproxy lightweight HTTP proxy to listen on IPv6 addresses, allow IPv6 clients, and use upstream IPv6 proxy connections.

## Introduction

tinyproxy is a minimal HTTP/HTTPS proxy designed for low-resource environments. It supports IPv6 for both inbound client connections and upstream forwarding.

## Installation

```bash
apt-get install -y tinyproxy
```

## Step 1: tinyproxy.conf for IPv6

```nginx
# /etc/tinyproxy/tinyproxy.conf

# Listen on all IPv6 interfaces

Listen ::

# Port
Port 8888

# Or listen on a specific IPv6 address
# Listen 2001:db8::1

# User and group
User tinyproxy
Group tinyproxy

# Timeout
Timeout 600

# Logging
LogLevel Info
LogFile "/var/log/tinyproxy/tinyproxy.log"

# PID file
PidFile "/run/tinyproxy/tinyproxy.pid"
```

## Step 2: Access Control for IPv6

```nginx
# /etc/tinyproxy/tinyproxy.conf

# Allow IPv6 loopback
Allow ::1

# Allow internal IPv6 subnet
Allow 2001:db8::/32

# Allow link-local (for local network access)
Allow fe80::/10

# Block all others (default is to allow all if no Allow lines)
# DisableViaHeader Yes
```

## Step 3: Upstream Proxy

```nginx
# /etc/tinyproxy/tinyproxy.conf

# Upstream HTTP proxy over IPv6 (IPv6 hosts must be in brackets)
Upstream http [2001:db8::1]:3128

# Upstream for specific domains
Upstream http [2001:db8::2]:8080 ".internal.example.com"

# No upstream for a specific domain
# Upstream none ".example.com"
```

## Step 4: Anonymous Headers

```nginx
# /etc/tinyproxy/tinyproxy.conf

# Remove forwarded headers for privacy
DisableViaHeader Yes

# Anonymous headers (remove identifying info)
Anonymous "Authorization"
Anonymous "Host"
Anonymous "Accept"
```

## Step 5: Start and Test

```bash
# Start tinyproxy
systemctl enable --now tinyproxy

# Verify listening
ss -lntp | grep :8888

# Test with IPv6 client
curl -6 -x http://[::1]:8888 http://example.com/
curl -6 -x http://[2001:db8::1]:8888 https://ipv6.google.com/

# Check logs
tail -f /var/log/tinyproxy/tinyproxy.log
```

## Conclusion

tinyproxy supports IPv6 via the `Listen` directive in the configuration file. The `Allow` directive accepts IPv6 CIDR notation for access control, and IPv6 hosts in `Upstream` must be enclosed in square brackets. It is ideal for containers and resource-constrained environments where Squid is too heavy. Monitor tinyproxy with OneUptime's HTTP connectivity checks.
