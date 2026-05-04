# How to Configure IPv6 sysctl Parameters on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Sysctl, Kernel Parameters, Network Configuration

Description: A practical guide to viewing, setting, and persisting IPv6 kernel parameters on Linux using sysctl, covering the most important tunables for IPv6 networking behavior.

## Understanding sysctl for IPv6

The `sysctl` command reads and writes kernel parameters at runtime. IPv6 parameters live under `net.ipv6.*` and map directly to files under `/proc/sys/net/ipv6/`.

```bash
# List all IPv6 sysctl parameters

sysctl -a | grep net.ipv6

# Show a specific parameter
sysctl net.ipv6.conf.eth0.accept_ra

# Show all conf parameters for an interface
sysctl -a | grep net.ipv6.conf.eth0
```

## Common IPv6 sysctl Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `net.ipv6.conf.all.forwarding` | 0 | Enable IPv6 routing between interfaces |
| `net.ipv6.conf.all.accept_ra` | 1 | Accept Router Advertisements |
| `net.ipv6.conf.all.autoconf` | 1 | Enable SLAAC address generation |
| `net.ipv6.conf.all.disable_ipv6` | 0 | Disable IPv6 on all interfaces |
| `net.ipv6.conf.all.use_tempaddr` | 0 | Enable privacy extensions |
| `net.ipv6.conf.all.dad_transmits` | 1 | DAD NS count |
| `net.ipv6.conf.all.accept_redirects` | 1 | Accept ICMPv6 redirects |
| `net.ipv6.conf.all.addr_gen_mode` | 0 | Address generation mode |

## Setting Parameters at Runtime

```bash
# Set a parameter immediately (not persistent)
sysctl -w net.ipv6.conf.all.forwarding=1

# Set for a specific interface
sysctl -w net.ipv6.conf.eth0.accept_ra=2

# Set multiple parameters
sysctl -w net.ipv6.conf.all.use_tempaddr=2 \
       net.ipv6.conf.default.use_tempaddr=2

# Verify the change
sysctl net.ipv6.conf.all.forwarding
```

## Making Changes Persistent

Runtime changes via `sysctl -w` are lost on reboot. Use configuration files for persistence:

```bash
# Create a drop-in configuration file
cat > /etc/sysctl.d/60-ipv6-networking.conf << 'EOF'
# Enable IPv6 forwarding (for routers)
# net.ipv6.conf.all.forwarding = 1

# Privacy extensions - prefer temporary addresses
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Stable privacy addressing (random but stable per host/prefix)
# Mode 2 uses the secret from stable_secret (RFC 7217); set stable_secret first
# or use mode 3 to have the kernel pick a random secret automatically.
net.ipv6.conf.all.addr_gen_mode = 2
net.ipv6.conf.default.addr_gen_mode = 2

# Disable ICMPv6 redirects (recommended for servers)
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# DAD transmits (Duplicate Address Detection)
net.ipv6.conf.all.dad_transmits = 1
EOF

# Apply immediately without reboot
sysctl -p /etc/sysctl.d/60-ipv6-networking.conf

# Or reload all sysctl.d files
sysctl --system
```

## Interface-Specific vs Global Settings

```bash
# Global: applies to all existing interfaces
sysctl -w net.ipv6.conf.all.accept_ra=0

# Interface-specific: overrides global for eth0
sysctl -w net.ipv6.conf.eth0.accept_ra=1

# Default: applies to newly created interfaces only
sysctl -w net.ipv6.conf.default.accept_ra=0
```

Priority order: `interface-specific` > `all` > `default`

## Reading Parameters via /proc

```bash
# Direct /proc access (equivalent to sysctl)
cat /proc/sys/net/ipv6/conf/eth0/accept_ra

# Write directly to /proc
echo 0 > /proc/sys/net/ipv6/conf/eth0/accept_ra

# List available parameters for an interface
ls /proc/sys/net/ipv6/conf/eth0/
```

## Verifying Applied Configuration

```bash
# Check all conf parameters for default
sysctl -a | grep 'net.ipv6.conf.default'

# Verify forwarding is set
sysctl net.ipv6.conf.all.forwarding

# Check all interfaces at once
for iface in /proc/sys/net/ipv6/conf/*/; do
    name=$(basename "$iface")
    val=$(cat "${iface}accept_ra")
    echo "${name}: accept_ra=${val}"
done
```

## Summary

Use `sysctl -w net.ipv6.*` for temporary runtime changes and `/etc/sysctl.d/` files for persistent configuration. Apply with `sysctl --system` or `sysctl -p <file>`. Key parameters: `forwarding` (router mode), `accept_ra` (SLAAC gateway), `use_tempaddr` (privacy), `addr_gen_mode` (address algorithm). Interface-specific settings override `all/`, which overrides `default/`.
