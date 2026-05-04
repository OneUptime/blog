# How to Configure IPv6 Routing on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, Routing, Rc.conf, Static Routes

Description: Learn how to configure IPv6 routing on FreeBSD, including static routes, default gateways, IPv6 forwarding, and dynamic routing with routing daemons.

## View IPv6 Routing Table

```bash
# Show IPv6 routing table

netstat -rn -f inet6

# Show only default route
netstat -rn -f inet6 | grep default

# Show specific routes
netstat -rn -f inet6 | grep 2001:db8

# Look up the route to a specific destination
route -6 get 2001:4860:4860::8888
```

## Add and Remove Static Routes

```bash
# Add a default IPv6 route
route -6 add default 2001:db8::1

# Add default route via link-local address (include zone ID)
route -6 add default fe80::1%em0

# Add a specific IPv6 route
route -6 add 2001:db8:remote::/48 2001:db8::gateway

# Delete a route
route -6 delete default
route -6 delete 2001:db8:remote::/48

# Flush all IPv6 routes (use with caution)
route -6 flush
```

## Persistent Routes in /etc/rc.conf

```bash
# Single default route
cat >> /etc/rc.conf << 'EOF'
ipv6_defaultrouter="2001:db8::1"
EOF

# Static routes using named entries
cat >> /etc/rc.conf << 'EOF'
ipv6_static_routes="remote_net vpn_net"
ipv6_route_remote_net="2001:db8:remote::/48 2001:db8::gateway"
ipv6_route_vpn_net="2001:db8:vpn::/48 2001:db8::vpn-gw"
EOF

service routing restart
```

## Enable IPv6 Forwarding (Router Mode)

```bash
# Enable forwarding temporarily
sysctl -w net.inet6.ip6.forwarding=1

# Make persistent in /etc/sysctl.conf
echo 'net.inet6.ip6.forwarding=1' >> /etc/sysctl.conf

# Or in /etc/rc.conf (recommended method)
echo 'ipv6_gateway_enable="YES"' >> /etc/rc.conf

service routing restart
```

## Policy Routing for IPv6

```bash
# FreeBSD supports policy routing via setfib
# Create additional routing tables (FIBs) via /boot/loader.conf
# (loader.conf is read at boot; reboot required to apply)
echo 'net.fibs=2' >> /boot/loader.conf   # 2 FIBs (0 and 1)

# Add routes to a specific FIB
setfib 1 route -6 add default 2001:db8::backup-gw

# Run a process using a specific FIB
setfib 1 ping6 2001:4860:4860::8888
```

## Dynamic Routing with OpenBGPD or FRR

```bash
# Install FRR (Free Range Routing) for dynamic routing
pkg install frr

# Basic FRR OSPFv3 configuration for IPv6
cat > /usr/local/etc/frr/ospf6d.conf << 'EOF'
router ospf6
 ospf6 router-id 1.1.1.1
!
interface em0
 ipv6 ospf6 area 0.0.0.0
!
interface em1
 ipv6 ospf6 area 0.0.0.0
!
EOF

# Enable FRR services
echo 'frr_enable="YES"' >> /etc/rc.conf
echo 'frr_daemons="ospf6d"' >> /etc/rc.conf

service frr start
```

## Verify Routing

```bash
# Check routing table
netstat -rn -f inet6

# Test reachability
ping6 -c 3 2001:db8::1        # Gateway
ping6 -c 3 2001:4860:4860::8888  # External

# Trace path
traceroute6 2001:4860:4860::8888

# Check forwarding is enabled
sysctl net.inet6.ip6.forwarding
```

## Summary

Configure IPv6 routing on FreeBSD with `route -6 add` for temporary routes and `ipv6_defaultrouter` / `ipv6_static_routes` in `/etc/rc.conf` for persistent routes. Enable forwarding with `ipv6_gateway_enable="YES"` in `rc.conf` or `net.inet6.ip6.forwarding=1` in `sysctl.conf`. View routes with `netstat -rn -f inet6`. For dynamic routing, install FRR and configure OSPFv3 or BGP4+.
