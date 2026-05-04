# How to Configure Privoxy for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Privoxy, Proxy, IPv6, Privacy, Ad Blocking, HTTP, Filtering

Description: Configure Privoxy privacy-enhancing proxy to listen on IPv6, filter content for IPv6 clients, and forward requests through an upstream IPv6 proxy chain.

## Introduction

Privoxy is a non-caching web proxy with advanced filtering capabilities for privacy enhancement and ad blocking. It supports IPv6 for both incoming connections and upstream proxy forwarding.

## Installation

```bash
apt-get install -y privoxy
```

## Step 1: IPv6 Listen Address

```nginx
# /etc/privoxy/config

# Listen on all IPv6 interfaces

listen-address [::]:8118

# Listen on IPv6 loopback only
# listen-address [::1]:8118

# Or bind to specific IPv6 address
# listen-address [2001:db8::1]:8118

# Also listen on IPv4
listen-address 0.0.0.0:8118
```

## Step 2: IPv6 Access Control

```nginx
# /etc/privoxy/config

# Allow IPv6 clients from internal network
permit-access 2001:db8::/32
permit-access ::1/128

# Block external IPv6 clients
deny-access ::/0

# Or allow all (if behind a firewall)
# permit-access ::/0
```

## Step 3: Upstream Proxy over IPv6

```nginx
# /etc/privoxy/config

# Forward all traffic through an upstream SOCKS5 proxy on IPv6
forward-socks5t / [2001:db8::1]:1080 .

# Forward specific domains through IPv6 proxy
forward-socks5t .onion [::1]:9050 .

# Direct connection (no parent proxy) for internal hosts
forward .internal/ .
```

## Step 4: Filtering Rules for IPv6

```nginx
# /etc/privoxy/config

# Enable default action files (filtering works regardless of IP version)
actionsfile default.action
actionsfile user.action

filterfile default.filter
filterfile user.filter
```

```nginx
# /etc/privoxy/user.action

# Block tracking pixels (works for both IPv4 and IPv6 clients)
{+block{Tracking pixels}}
doubleclick.net
googletagmanager.com
```

## Step 5: Start and Test

```bash
# Validate configuration
privoxy --no-daemon /etc/privoxy/config &

# Or as service
systemctl enable --now privoxy

# Check listening
ss -lntp | grep :8118

# Test from IPv6 client
curl -6 -x http://[::1]:8118 http://example.com/
curl -6 -x http://[2001:db8::1]:8118 https://privacy-test.example.com/

# Check logs for IPv6 client addresses
tail -f /var/log/privoxy/logfile
```

## Conclusion

Privoxy's IPv6 support is enabled by setting `listen-address [::]:8118`. Use `permit-access` with IPv6 CIDR notation to control client access. Upstream proxy forwarding via `forward-socks5t` works with IPv6 SOCKS5 proxies. Content filtering rules apply identically to IPv4 and IPv6 clients. Monitor Privoxy availability with OneUptime's HTTP proxy checks.
