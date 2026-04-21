# How to Set Up Squid as a Transparent HTTP Proxy on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, Transparent Proxy, IPv4, iptables, Interception, Networking

Description: Configure Squid as a transparent HTTP proxy on IPv4 using iptables to redirect traffic without requiring client browser configuration.

## Introduction

A transparent proxy intercepts HTTP traffic without clients needing proxy settings configured. Traffic is redirected at the network level using iptables, then Squid processes it. This is common in corporate networks, ISPs, and parental control setups.

## Prerequisites

- Linux router/gateway with iptables
- Squid proxy running on the gateway
- Client traffic routes through the gateway

## Squid Configuration for Transparent Proxy

```bash
# /etc/squid/squid.conf

# Transparent proxy port (intercept mode)

http_port 0.0.0.0:3129 intercept

# Standard proxy port (optional, for explicit proxy clients)
http_port 0.0.0.0:3128

# Access control: allow LAN clients
acl lan src 192.168.0.0/24
http_access allow lan
http_access deny all

# Cache settings
cache_mem 256 MB
cache_dir ufs /var/spool/squid 10000 16 256

# Logging
access_log daemon:/var/log/squid/access.log logformat=squid
```

## iptables Rules for Traffic Redirection

Redirect HTTP traffic from LAN clients to Squid:

```bash
# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Persist in sysctl
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf

# Redirect outbound HTTP (port 80) from LAN to Squid (port 3129)
# Replace 192.168.0.0/24 with your LAN subnet
# Replace eth1 with your LAN interface

# Don't redirect traffic from the proxy's own LAN IP
# Replace 192.168.0.1 with the gateway/proxy IP on eth1
iptables -t nat -A PREROUTING \
  -i eth1 \
  -s 192.168.0.1/32 \
  -p tcp \
  --dport 80 \
  -j RETURN

iptables -t nat -A PREROUTING \
  -i eth1 \
  -s 192.168.0.0/24 \
  -p tcp \
  --dport 80 \
  -j REDIRECT --to-ports 3129

# Save iptables rules
sudo iptables-save > /etc/iptables/rules.v4
```

## Verifying Transparent Proxy

```bash
# Test from a LAN client WITHOUT proxy settings
curl http://httpbin.org/ip
# Traffic should go through Squid transparently

# Check Squid access log for the client's real IP
sudo tail -f /var/log/squid/access.log

# Verify iptables redirect is in place
sudo iptables -t nat -L PREROUTING -n -v

# Check Squid is listening on the intercept port
sudo ss -tlnp | grep 3129
```

## X-Forwarded-For in Transparent Mode

Squid adds `X-Forwarded-For` with the client's real IP even in transparent mode:

```bash
# /etc/squid/squid.conf
# Enable XFF forwarding (on by default)
forwarded_for on

# To hide client IPs from destination servers:
# forwarded_for off
```

## Handling HTTPS in Transparent Mode

HTTP interception works seamlessly, but HTTPS requires SSL bump and a CA certificate trusted by clients:

```bash
# /etc/squid/squid.conf
# HTTPS transparent interception requires ssl-bump configuration
https_port 3130 intercept ssl-bump \
    tls-cert=/etc/squid/ssl/squid.pem \
    generate-host-certificates=on

acl step1 at_step SslBump1
ssl_bump peek step1
ssl_bump bump all

# Redirect HTTPS to ssl-bump port
# iptables -t nat -A PREROUTING ... --dport 443 -j REDIRECT --to-ports 3130
```

## Conclusion

Squid transparent proxy uses the `intercept` keyword on `http_port` combined with iptables REDIRECT rules. Traffic is silently intercepted without client configuration. Always consider privacy implications and legal requirements before deploying transparent interception on networks you don't fully control, and exclude Squid's own traffic from redirection to avoid routing loops.
