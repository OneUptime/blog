# How to Understand /proc/sys/net/ipv6/conf Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Sysctl, Kernel Parameters, Network Configuration

Description: A comprehensive reference to the most important /proc/sys/net/ipv6/conf kernel parameters and their effects on IPv6 networking behavior.

## Directory Structure

```bash
/proc/sys/net/ipv6/conf/
├── all/          # Applies to all interfaces
├── default/      # Default for newly created interfaces
├── lo/           # Loopback interface settings
├── eth0/         # Settings specific to eth0
└── eth1/         # Settings specific to eth1
```

Settings in `all/` are special and change the settings for all interfaces. The `default/` settings apply to interfaces created after the sysctl is set.

## Key Parameters Reference

### accept_ra - Accept Router Advertisements

```bash
# Check current value

cat /proc/sys/net/ipv6/conf/eth0/accept_ra

# Values:
# 0 = Don't accept RA (no SLAAC, ignore gateway from RA)
# 1 = Accept RA (default for non-router hosts) - enables SLAAC
# 2 = Accept RA even when forwarding is enabled

# Common use: force RA acceptance on routers
sysctl -w net.ipv6.conf.eth0.accept_ra=2
```

### autoconf - SLAAC Address Generation

```bash
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# 0 = Disable SLAAC (don't generate addresses from RA prefixes)
# 1 = Enable SLAAC (default)

sysctl -w net.ipv6.conf.eth0.autoconf=0
```

### forwarding - IPv6 Packet Forwarding

```bash
cat /proc/sys/net/ipv6/conf/all/forwarding
# 0 = Host mode (don't forward packets between interfaces)
# 1 = Router mode (forward packets)

# Note: enabling forwarding on all/ changes accept_ra behavior for some interfaces
sysctl -w net.ipv6.conf.all.forwarding=1
```

### disable_ipv6 - Disable IPv6 on Interface

```bash
cat /proc/sys/net/ipv6/conf/eth0/disable_ipv6
# 0 = IPv6 enabled (default)
# 1 = IPv6 disabled on this interface

sysctl -w net.ipv6.conf.eth0.disable_ipv6=1
```

### use_tempaddr - Privacy Extensions

```bash
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
# <= 0 = Disabled
# 1 = Enabled, prefer public address
# > 1 = Enabled, prefer temporary address (RFC 4941)
# Default is 0 for most interfaces and -1 for loopback and point-to-point interfaces

sysctl -w net.ipv6.conf.eth0.use_tempaddr=2
```

### dad_transmits - Duplicate Address Detection

```bash
cat /proc/sys/net/ipv6/conf/eth0/dad_transmits
# Number of NS messages sent during DAD (default: 1)
# 1 = Send 1 DAD probe (default)
# 3 = Send 3 DAD probes

sysctl -w net.ipv6.conf.eth0.dad_transmits=1
```

### accept_redirects - ICMPv6 Redirect Handling

```bash
cat /proc/sys/net/ipv6/conf/eth0/accept_redirects
# 0 = Ignore ICMPv6 redirects (recommended for servers)
# 1 = Accept and apply ICMPv6 redirects (default for hosts)

sysctl -w net.ipv6.conf.all.accept_redirects=0
```

### router_solicitations - RS Count

```bash
cat /proc/sys/net/ipv6/conf/eth0/router_solicitations
# Number of Router Solicitations sent before assuming no routers are present (default: 3)

sysctl -w net.ipv6.conf.eth0.router_solicitations=3
```

### max_addresses - Maximum Autoconfigured IPv6 Addresses per Interface

```bash
cat /proc/sys/net/ipv6/conf/eth0/max_addresses
# Default: 16
# Maximum number of autoconfigured IPv6 addresses per interface

# Increase if an interface needs many autoconfigured addresses
sysctl -w net.ipv6.conf.eth0.max_addresses=64
```

### addr_gen_mode - Address Generation Mode

```bash
cat /proc/sys/net/ipv6/conf/eth0/addr_gen_mode
# 0 = EUI-64 (derived from MAC address)
# 1 = Don't generate a link-local address; use EUI-64 for autoconf addresses
# 2 = Stable privacy using stable_secret (RFC 7217)
# 3 = Stable privacy; use a random secret if stable_secret is unset

sysctl -w net.ipv6.conf.eth0.addr_gen_mode=3
```

## Setting Multiple Parameters Persistently

```bash
# Create a comprehensive IPv6 tuning file
cat > /etc/sysctl.d/99-ipv6-tuning.conf << 'EOF'
# IPv6 forwarding for routers
# net.ipv6.conf.all.forwarding = 1

# Privacy extensions (prefer temporary addresses)
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Stable privacy addressing
net.ipv6.conf.all.addr_gen_mode = 3
net.ipv6.conf.default.addr_gen_mode = 3

# Disable accept_redirects on servers
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# DAD transmits
net.ipv6.conf.all.dad_transmits = 1
EOF

# Apply
sysctl -p /etc/sysctl.d/99-ipv6-tuning.conf
```

## Summary

The `/proc/sys/net/ipv6/conf/` hierarchy controls IPv6 interface behavior. Key parameters: `accept_ra` (SLAAC/gateway from RA), `autoconf` (SLAAC address generation), `forwarding` (router mode), `use_tempaddr` (privacy extensions), `dad_transmits` (DAD robustness), `addr_gen_mode` (address generation algorithm). Use `sysctl.d` files for persistent changes. Settings in `all/` are special and change interface settings system-wide; settings in `default/` apply to new interfaces.
