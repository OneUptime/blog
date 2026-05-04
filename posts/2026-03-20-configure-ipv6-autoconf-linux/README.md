# How to Configure IPv6 Autoconf on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, SLAAC, Autoconf, Sysctl

Description: Learn how to configure the IPv6 autoconf sysctl parameter on Linux to control Stateless Address Autoconfiguration (SLAAC) - whether the kernel generates IPv6 addresses from Router Advertisement...

## What is IPv6 Autoconf?

The `autoconf` parameter controls whether Linux automatically generates IPv6 addresses from Router Advertisement (RA) prefixes - the SLAAC (Stateless Address Autoconfiguration) process. When a router announces a /64 prefix via RA and `autoconf=1`, the kernel generates a complete 128-bit address by combining the prefix with an interface identifier (the address is configured on the interface with the announced /64 prefix length).

```text
RA prefix: 2001:db8::/64
+ interface identifier (EUI-64 or random)
= SLAAC address: 2001:db8::1234:5678:9abc:def0/64
```

## autoconf Values

```bash
# Check current value

cat /proc/sys/net/ipv6/conf/eth0/autoconf

# 0 = Disable SLAAC (do not generate addresses from RA prefixes)
# 1 = Enable SLAAC (default for hosts)
```

## Configuring autoconf

```bash
# Disable SLAAC on a specific interface
sysctl -w net.ipv6.conf.eth0.autoconf=0

# Enable SLAAC (default)
sysctl -w net.ipv6.conf.eth0.autoconf=1

# Disable SLAAC globally
sysctl -w net.ipv6.conf.all.autoconf=0
sysctl -w net.ipv6.conf.default.autoconf=0
```

## Relationship Between autoconf and accept_ra

Both parameters must be set correctly for SLAAC to work:

| accept_ra | autoconf | Result |
|-----------|----------|--------|
| 0 | any | No RA processed, no SLAAC, no gateway from RA |
| 1 | 0 | Default route from RA, but no SLAAC addresses |
| 1 | 1 | Default route + SLAAC addresses (full SLAAC) |
| 2 | 1 | Same as above but works with forwarding=1 |

```bash
# Accept gateway from RA but don't generate SLAAC addresses
# (useful when using DHCPv6 for addresses)
sysctl -w net.ipv6.conf.eth0.accept_ra=1
sysctl -w net.ipv6.conf.eth0.autoconf=0
```

## Persistent Configuration

```bash
# Server with static IPv6 addresses (no SLAAC)
cat > /etc/sysctl.d/60-ipv6-autoconf.conf << 'EOF'
# Disable SLAAC - use static addresses only
net.ipv6.conf.all.autoconf = 0
net.ipv6.conf.default.autoconf = 0
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
EOF

sysctl --system
```

## Verifying SLAAC Behavior

```bash
# Check if SLAAC addresses are present (dynamic = from SLAAC)
ip -6 addr show dynamic

# Show all global addresses on eth0
ip -6 addr show dev eth0 scope global

# Monitor address assignment in real time
ip -6 monitor addr

# Check if RA was received and address was assigned
journalctl -k | grep -i 'ipv6\|slaac\|ra\|prefix'
```

## Disabling SLAAC on Ubuntu (Netplan)

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp6: false          # Disable DHCPv6
      accept-ra: false      # Disable RA processing (and SLAAC)
      addresses:
        - 2001:db8::10/64   # Static address
      routes:
        - to: ::/0
          via: 2001:db8::1
```

```bash
netplan apply
```

## Summary

The `autoconf` parameter (`net.ipv6.conf.<iface>.autoconf`) controls SLAAC address generation: `1` (default) generates addresses from RA-announced prefixes, `0` disables it. Requires `accept_ra` to also be non-zero for RAs to be processed. Disable autoconf on servers using static or DHCPv6 addresses to avoid unexpected SLAAC addresses appearing. Persist settings in `/etc/sysctl.d/` files.
