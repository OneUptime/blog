# How to Configure CLAT (Customer-Side Translator) for 464XLAT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 464XLAT, CLAT, Linux, Mobile Networks

Description: A practical guide to configuring the CLAT component of 464XLAT on Linux to enable IPv4 applications to work over an IPv6-only network connection.

## What Is CLAT?

The CLAT (Customer-side Translator) is the device-local component of 464XLAT. It creates a virtual IPv4 interface on the device, intercepts outbound IPv4 packets, translates them to IPv6, and sends them over the IPv6-only access network to the PLAT (NAT64 gateway) in the carrier/provider network.

On Android, this is built into the OS. On Linux, you can configure it manually or use tools like `clatd`.

## Prerequisites

- IPv6-only network connectivity (device has IPv6 address, no IPv4)
- A PLAT (NAT64/PLAT) in your network using prefix `64:ff9b::/96` or similar
- Linux with `iproute2` and either `clatd` or Jool SIIT

## Method 1: Using clatd (Recommended)

`clatd` is a userspace CLAT daemon that handles prefix discovery and translation automatically:

```bash
# Install clatd on Ubuntu/Debian

apt install clatd

# Or install from source
git clone https://github.com/toreanderson/clatd
make -C clatd install installdeps
```

Configure `clatd` in `/etc/clatd.conf`:

```ini
# /etc/clatd.conf

# The CLAT interface name (defaults to clat)
clat-dev=clat

# Optional: override the PLAT-facing uplink if auto-detection is not correct
# plat-dev=eth0

# IPv4 address to assign to the CLAT interface
# RFC 7335 reserves 192.0.0.0/29 for IPv4 service continuity;
# clatd defaults to 192.0.0.1 on the CLAT device
clat-v4-addr=192.0.0.1

# The PLAT NAT64 prefix (auto-discovered via RFC 7050 by default)
# Uncomment to override automatic discovery:
# plat-prefix=64:ff9b::/96

# The IPv6 address mode for translated packets
# 'shared' reuses the host's IPv6 address; 'derived' creates a dedicated one
# clat-v6-addr=shared
```

```bash
# Start clatd
systemctl enable clatd
systemctl start clatd

# Verify CLAT interface is created
ip addr show clat
# Expected: 192.0.0.1/32

# Test IPv4 connectivity through CLAT
ping -4 8.8.8.8
```

## Method 2: Manual CLAT Configuration with Jool SIIT

For manual configuration, use Jool in SIIT mode (stateless translation). If the CLAT runs on the same Linux host as the application, Jool's documented host-local design uses a separate network namespace and veth pair; the Jool-specific CLAT configuration is:

```bash
# Load Jool SIIT kernel module
modprobe jool_siit

# Enable forwarding if the CLAT is running on a router/CPE
sysctl -w net.ipv4.conf.all.forwarding=1
sysctl -w net.ipv6.conf.all.forwarding=1

# Create a Jool SIIT instance for CLAT and set the PLAT prefix
jool_siit instance add --netfilter --pool6 64:ff9b::/96

# Configure the EAMT (Explicit Address Mapping Table)
# Map the client-side IPv4 address to the CLAT-side IPv6 address
# Replace 192.0.0.1 and 2001:db8::1 with the actual addresses in your deployment
jool_siit eamt add 192.0.0.1 2001:db8::1
```

## Configuring the CLAT Interface Routing

After the CLAT interface is up, `clatd` normally installs the IPv4 default route automatically. If you disable that behavior with `v4-defaultroute-enable=no`, add it manually:

```bash
# Verify CLAT interface is up with IPv4 address
ip addr show clat

# Add default IPv4 route through CLAT interface
# This makes IPv4 traffic go through the CLAT translator
ip route add default dev clat metric 2048

# Verify the route is present
ip route show default
```

## Automatic PLAT Prefix Discovery

The CLAT discovers the PLAT's NAT64 prefix automatically using RFC 7050. This involves:

```bash
# The CLAT queries AAAA for ipv4only.arpa via the DNS64 resolver
dig AAAA ipv4only.arpa @<dns64-resolver>

# Example output when DNS64 synthesizes the record:
# ipv4only.arpa. 60 IN AAAA 64:ff9b::c000:00aa
# (192.0.0.170 embedded in prefix 64:ff9b::/96)

# clatd does this automatically during startup
# Check discovered prefix in clatd logs
journalctl -u clatd | grep -i prefix
```

## Verifying CLAT Operation

```bash
# 1. Check CLAT interface has IPv4 address
ip addr show clat

# 2. Test IPv4 ping through CLAT
ping -4 -c 5 8.8.8.8

# 3. Capture to see CLAT translating IPv4 to IPv6
tcpdump -i eth0 -n ip6 &
ping -4 -c 3 8.8.8.8
fg  # and Ctrl+C

# 4. Verify no IPv4 address on the uplink interface (confirms IPv6-only)
ip addr show eth0 | grep 'inet '
```

## Testing Application Compatibility

```bash
# Test that IPv4-literal connections work through CLAT
curl -4 -I http://1.1.1.1/

# Test hostname-based connections
curl -I http://example.com

# Test another client over IPv4
wget -4 --spider http://1.1.1.1/
```

## Summary

CLAT is the device-side component of 464XLAT that creates a local IPv4 interface backed by IPv6 translation. The easiest way to deploy it on Linux is with `clatd`, which handles PLAT prefix discovery automatically. CLAT lets many IPv4 applications, including ones that expect an IPv4 socket API, keep working on IPv6-only networks by translating their traffic to IPv6 before it leaves the device.
