# How to Configure Squid with iptables for Transparent IPv4 Interception

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, iptables, Transparent Proxy, IPv4, TPROXY, Interception

Description: Set up Squid transparent proxy with iptables REDIRECT or TPROXY rules to intercept IPv4 HTTP traffic without client configuration.

## Introduction

Transparent IPv4 interception requires two components: Squid configured with an interception listener and iptables rules that redirect traffic to Squid's port. Two methods exist: `REDIRECT` (simple, changes destination IP) and `TPROXY` (preserves original destination, requires kernel support).

## Method 1: REDIRECT (Simpler)

```bash
# /etc/squid/squid.conf

# Intercept mode: accept redirected connections

http_port 0.0.0.0:3129 intercept

# Standard explicit proxy port
http_port 0.0.0.0:3128

# Access control
acl lan src 192.168.0.0/16 10.0.0.0/8
http_access allow lan
http_access deny all
```

iptables rules for REDIRECT:

```bash
#!/bin/bash
# /usr/local/bin/setup-transparent-proxy.sh

LAN_INTERFACE="eth1"   # Interface facing LAN clients
LAN_SUBNET="192.168.0.0/16"
PROXY_LAN_IP="192.168.0.1"
SQUID_PORT="3129"

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Don't intercept traffic to the proxy server itself
iptables -t nat -A PREROUTING -i ${LAN_INTERFACE} \
  -s ${LAN_SUBNET} -p tcp --dport 80 \
  -d ${PROXY_LAN_IP} -j RETURN

# Redirect all other HTTP to Squid
iptables -t nat -A PREROUTING -i ${LAN_INTERFACE} \
  -s ${LAN_SUBNET} -p tcp --dport 80 \
  -j REDIRECT --to-ports ${SQUID_PORT}

# Persist rules
iptables-save > /etc/iptables/rules.v4
```

## Method 2: TPROXY (Preserves Original IP)

TPROXY allows Squid to see the original destination IP:

```bash
# /etc/squid/squid.conf
http_port 0.0.0.0:3129 tproxy
```

```bash
#!/bin/bash
# TPROXY requires kernel TPROXY support and routing marks

# Mark packets for TPROXY
iptables -t mangle -A PREROUTING -i eth1 \
  -p tcp --dport 80 \
  -j TPROXY --tproxy-mark 0x1/0x1 --on-port 3129

# Route marked packets to loopback
ip rule add fwmark 1 lookup 100
ip route add local 0.0.0.0/0 dev lo table 100
```

## Verifying Transparent Interception

```bash
# On a LAN client with NO proxy settings configured:
curl http://httpbin.org/ip
# Traffic should transparently route through Squid

# Check Squid access log for intercepted connections
sudo tail -f /var/log/squid/access.log
# TCP_MISS/TCP_HIT without explicit proxy shows interception is working

# Verify iptables rules are active
sudo iptables -t nat -L PREROUTING -n -v | grep REDIRECT

# Check Squid listening ports
sudo ss -tlnp | grep squid
# Should show 3129, plus 3128 if you configured the explicit proxy port
```

## Excluding Traffic from Interception

```bash
# For REDIRECT, add bypass rules before the REDIRECT interception rule

# Don't intercept HTTPS (port 443) - use a separate ssl-bump setup
iptables -t nat -I PREROUTING 1 -i eth1 \
  -p tcp --dport 443 -j RETURN

# Don't intercept traffic to specific servers
iptables -t nat -I PREROUTING 1 -i eth1 \
  -d 10.0.0.0/8 -j RETURN  # Don't proxy internal traffic

# Don't intercept traffic from specific hosts
iptables -t nat -I PREROUTING 1 -i eth1 \
  -s 192.168.0.200 -j RETURN  # Bypass proxy for this host
```

## Conclusion

Squid transparent proxy with iptables REDIRECT is the simplest approach: configure `http_port <port> intercept` in Squid and add `iptables -j REDIRECT` rules to redirect LAN HTTP traffic to that port. Always exclude traffic to the proxy server itself, exclude direct internal traffic, and optionally exclude specific hosts that need unproxied internet access.
