# How to Enable IPv6 on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, Rc.conf, ifconfig, Network Configuration

Description: Learn how to enable IPv6 on FreeBSD, check the current IPv6 status, and configure interfaces for IPv6 using rc.conf and ifconfig.

## Checking IPv6 Status on FreeBSD

```bash
# Show all interfaces and their IPv6 addresses

ifconfig -a | grep inet6

# Show IPv6 on a specific interface
ifconfig em0 | grep inet6

# Check IPv6 forwarding and Router Advertisement settings
sysctl net.inet6.ip6.forwarding
sysctl net.inet6.ip6.accept_rtadv

# Show routing table for IPv6
netstat -rn -f inet6
```

## Enable IPv6 via SLAAC in /etc/rc.conf

```bash
# Edit /etc/rc.conf to enable IPv6

# For SLAAC (automatic from Router Advertisement):
cat >> /etc/rc.conf << 'EOF'
# Enable IPv6 with SLAAC on em0
ifconfig_em0_ipv6="inet6 accept_rtadv"
rtsold_enable="YES"
EOF

# Apply without reboot
service netif restart
service rtsold start
```

## Enable IPv6 with Static Address in /etc/rc.conf

```bash
cat >> /etc/rc.conf << 'EOF'
# Static IPv6 address
ifconfig_em0_ipv6="inet6 2001:db8::10 prefixlen 64"

# Default IPv6 route
ipv6_defaultrouter="2001:db8::1"
EOF

# Apply
service netif restart
service routing restart
```

## Configure IPv6 Immediately with ifconfig

```bash
# Enable IPv6 on the interface
ifconfig em0 inet6 -ifdisabled

# Add a static IPv6 address (temporary, not persistent)
ifconfig em0 inet6 2001:db8::10 prefixlen 64 alias

# Add default IPv6 route
route -6 add default 2001:db8::1

# Enable SLAAC on an interface and request Router Advertisements
ifconfig em0 inet6 accept_rtadv
rtsol em0

# Verify
ifconfig em0 | grep inet6
netstat -rn -f inet6 | grep default
```

## Enabling IPv6 Forwarding

```bash
# Enable IPv6 forwarding for router mode
sysctl -w net.inet6.ip6.forwarding=1

# Make it persistent
echo 'net.inet6.ip6.forwarding=1' >> /etc/sysctl.conf

# Or in /etc/rc.conf (recommended)
echo 'ipv6_gateway_enable="YES"' >> /etc/rc.conf

# If this system must both forward IPv6 and receive SLAAC,
# allow Router Advertisements while forwarding
sysctl -w net.inet6.ip6.rfc6204w3=1
echo 'net.inet6.ip6.rfc6204w3=1' >> /etc/sysctl.conf
```

## Configure IPv6 DNS

```bash
# Add IPv6 DNS servers to /etc/resolv.conf
cat >> /etc/resolv.conf << 'EOF'
nameserver 2001:4860:4860::8888
nameserver 2001:4860:4860::8844
EOF

# Or use resolvconf if installed
echo "nameserver 2001:4860:4860::8888" | resolvconf -a em0.inet6
```

## Verify IPv6 is Working

```bash
# Check for IPv6 addresses
ifconfig -a | grep inet6

# Ping IPv6 loopback
ping6 ::1

# Ping default gateway
ping6 2001:db8::1

# Test external IPv6 connectivity
ping6 2001:4860:4860::8888

# Test DNS resolution
host -t AAAA google.com
```

## Summary

Enable IPv6 on FreeBSD by adding `ifconfig_em0_ipv6="inet6 accept_rtadv"` and `rtsold_enable="YES"` to `/etc/rc.conf` for SLAAC, or `ifconfig_em0_ipv6="inet6 2001:db8::10 prefixlen 64"` and `ipv6_defaultrouter="2001:db8::1"` for static configuration. Enable immediately with `ifconfig em0 inet6 -ifdisabled` followed by `ifconfig em0 inet6 <addr> prefixlen <n> alias`, or use `ifconfig em0 inet6 accept_rtadv` with `rtsol em0` for immediate SLAAC. Enable forwarding with `ipv6_gateway_enable="YES"` in `rc.conf`; if the system must also receive SLAAC while forwarding, set `net.inet6.ip6.rfc6204w3=1`. Verify with `ifconfig -a | grep inet6` and `ping6 ::1`.
