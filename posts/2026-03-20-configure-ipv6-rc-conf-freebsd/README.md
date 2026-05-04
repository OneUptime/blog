# How to Configure IPv6 with rc.conf on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, Rc.conf, Network Configuration, SLAAC

Description: A comprehensive reference for IPv6-related rc.conf settings on FreeBSD, covering SLAAC, static addressing, routing, and system-wide IPv6 options.

## IPv6 rc.conf Variables Reference

```bash
# /etc/rc.conf is the primary configuration file for FreeBSD services

# IPv6 networking variables:

# Enable IPv6 on all interfaces
ipv6_activate_all_interfaces="YES"

# Static IPv6 address for interface em0
ifconfig_em0_ipv6="inet6 2001:db8::10 prefixlen 64"

# Additional IPv6 addresses (aliases)
ifconfig_em0_alias0="inet6 2001:db8::20 prefixlen 64"

# SLAAC: accept Router Advertisements
ifconfig_em0_ipv6="inet6 accept_rtadv"

# Default IPv6 gateway
ipv6_defaultrouter="2001:db8::1"
ipv6_defaultrouter="fe80::1%em0"  # Link-local gateway (use zone ID)

# Enable IPv6 routing (router mode)
ipv6_gateway_enable="YES"

# Router Solicitation daemon (sends RS, processes RA for SLAAC)
rtsold_enable="YES"
rtsold_flags="-aF"   # -a: autoprobe interfaces, -F: configure kernel to accept RAs and disable IPv6 forwarding
```

## SLAAC Configuration

```bash
# /etc/rc.conf for SLAAC (automatic IPv6 from router)
cat >> /etc/rc.conf << 'EOF'
# Enable SLAAC on em0
ifconfig_em0_ipv6="inet6 accept_rtadv"

# rtsold: Router Solicitation daemon
rtsold_enable="YES"
rtsold_flags="-aF"
EOF

service rtsold start
service netif restart
```

## Static IPv6 Configuration

```bash
cat >> /etc/rc.conf << 'EOF'
# Static IPv6 configuration
ifconfig_em0_ipv6="inet6 2001:db8::10 prefixlen 64"
ipv6_defaultrouter="2001:db8::1"
ipv6_activate_all_interfaces="YES"
EOF

service netif restart
service routing restart
```

## Router Configuration

```bash
# /etc/rc.conf for a router
cat >> /etc/rc.conf << 'EOF'
# Enable IPv6 forwarding
ipv6_gateway_enable="YES"

# Upstream interface: static + accept RA for default route
ifconfig_em0_ipv6="inet6 2001:db8:1::1 prefixlen 64 accept_rtadv"

# Downstream interface: static address
ifconfig_em1_ipv6="inet6 2001:db8:2::1 prefixlen 64"

# Send Router Advertisements on downstream
rtadvd_enable="YES"
rtadvd_interfaces="em1"
EOF

service netif restart
service routing restart
service rtadvd start
```

## Advanced rc.conf IPv6 Options

```bash
# Static routes
ipv6_static_routes="remote"
ipv6_route_remote="2001:db8:1::/48 2001:db8::1"

# Network start order
network_interfaces="lo0 em0 em1"

# NDP (Neighbor Discovery) options
# Usually managed by kernel, no rc.conf options needed

# IPv6 in jail configurations (for jails with IPv6)
# jail_example_ip6="2001:db8::100"
```

## Viewing Effective Configuration

```bash
# View all IPv6-related rc.conf settings
grep -i ipv6 /etc/rc.conf
grep -i inet6 /etc/rc.conf
grep -i rtsold /etc/rc.conf

# Show what rcvar each service expects
service rtsold rcvar
service rtadvd rcvar
```

## Applying Changes Without Reboot

```bash
# Restart network services to apply rc.conf changes
service netif restart         # Applies ifconfig changes
service routing restart       # Applies route changes
service rtsold restart        # Restart Router Solicitation daemon

# For a single interface
service netif restart em0

# Verify changes
ifconfig em0 | grep inet6
netstat -rn -f inet6
```

## Summary

FreeBSD IPv6 configuration in `/etc/rc.conf` uses these key variables: `ifconfig_<iface>_ipv6` for address/mode, `ipv6_defaultrouter` for the default gateway, `ipv6_gateway_enable="YES"` for forwarding, `rtsold_enable="YES"` for SLAAC. For SLAAC use `inet6 accept_rtadv` in the interface config. Apply changes with `service netif restart && service routing restart`. Static routes use `ipv6_static_routes` and `ipv6_route_<name>` variables.
