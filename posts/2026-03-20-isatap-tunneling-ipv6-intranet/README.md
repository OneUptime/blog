# How to Configure ISATAP Tunneling for IPv6 on IPv4 Intranets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ISATAP, IPv6, Tunneling, IPv4, Intranet, Transition

Description: Configure ISATAP (Intra-Site Automatic Tunnel Addressing Protocol) to provide IPv6 connectivity to IPv4-only intranet hosts without upgrading the network infrastructure.

## Introduction

ISATAP (RFC 5214) allows IPv6 hosts to communicate over IPv4 intranets by embedding an IPv4 address in the ISATAP interface identifier (for example, `prefix::0:5efe:a.b.c.d`). It requires an ISATAP router that has both IPv4 and IPv6 connectivity.

## ISATAP Address Format

```text
ISATAP address: <64-bit prefix>::0:5efe:a.b.c.d
                <64-bit prefix>::200:5efe:a.b.c.d  (when the IPv4 address is globally unique)
                <64-bit prefix>::0:5efe:10.0.0.5

For host 10.0.0.5 with prefix 2001:db8::/64:
IPv4 address in hex: 0a00:0005
IPv6 address:        2001:db8::5efe:a00:5
Expanded form:       2001:db8:0:0:0:5efe:0a00:0005
```

## Linux ISATAP Host Configuration

```bash
# Create ISATAP tunnel interface

sudo ip tunnel add isatap0 mode isatap local 10.0.0.5 ttl 64

# Bring interface up
sudo ip link set isatap0 up

# Assign IPv6 address using ISATAP format
# Using prefix 2001:db8::/64 and IPv4 10.0.0.5
sudo ip address add 2001:db8::5efe:a00:5/64 dev isatap0

# Add default route via the ISATAP router's link-local address
# ISATAP router's IPv4 address: 10.0.0.1 -> fe80::5efe:a00:1
sudo ip -6 route add default via fe80::5efe:a00:1 dev isatap0
```

## ISATAP Router Configuration

```bash
# The ISATAP router has both IPv4 and native IPv6

# Create ISATAP tunnel (router-side)
sudo ip tunnel add isatap-router mode isatap local 10.0.0.1 ttl 64
sudo ip link set isatap-router up
sudo ip -6 address add 2001:db8::5efe:a00:1/64 dev isatap-router

# Enable forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# The router must respond to Router Solicitations from ISATAP hosts
# Configure radvd to advertise on the ISATAP interface:
```

```bash
# /etc/radvd.conf (on ISATAP router)
interface isatap-router {
    AdvSendAdvert on;
    UnicastOnly on;          # ISATAP is an NBMA link
    AdvDefaultLifetime 1800;
    prefix 2001:db8::/64 {
        AdvOnLink off;       # Host-to-router model
        AdvAutonomous on;
    };
};
```

## DNS Configuration for ISATAP

```bash
# Add a DNS A record for "isatap" pointing to the ISATAP router
# isatap.example.com.  IN A  10.0.0.1

# Windows ISATAP hosts automatically query DNS for "isatap.domain"
# to find the ISATAP router

# On Windows DNS servers, "isatap" is commonly blocked by the
# global query block list by default; remove it there if needed.

# Linux hosts need manual router configuration (above)
```

## Persistent Configuration

```bash
# /etc/network/interfaces (Debian)
auto isatap0
iface isatap0 inet6 manual
    pre-up ip tunnel add isatap0 mode isatap local 10.0.0.5 ttl 64
    up ip link set isatap0 up
    up ip -6 address add 2001:db8::5efe:a00:5/64 dev isatap0
    up ip -6 route add default via fe80::5efe:a00:1 dev isatap0
    down ip -6 route del default via fe80::5efe:a00:1 dev isatap0
    down ip -6 address del 2001:db8::5efe:a00:5/64 dev isatap0
    post-down ip link set isatap0 down
    post-down ip tunnel del isatap0
```

## Testing ISATAP

```bash
# Verify ISATAP interface
ip address show isatap0

# Test connectivity to ISATAP router
ping -6 2001:db8::5efe:a00:1

# Test connectivity to another ISATAP host (10.0.0.6)
ping -6 2001:db8::5efe:a00:6

# Trace the path
traceroute6 2001:db8::5efe:a00:1
```

## Conclusion

ISATAP embeds IPv4 addresses into the IPv6 interface identifier using the `::5efe:` pattern (or `::200:5efe:` when the IPv4 address is globally unique), allowing IPv6 communication over IPv4 intranets. Configure an ISATAP router (a dual-stack host) that advertises the IPv6 prefix, and add ISATAP tunnel interfaces on each host. ISATAP is primarily used in enterprise intranet scenarios for gradual IPv6 deployment without replacing IPv4 infrastructure. For new deployments, native dual-stack is preferred.
