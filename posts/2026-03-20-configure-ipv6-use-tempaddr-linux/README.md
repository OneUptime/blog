# How to Configure IPv6 Use Tempaddr on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Linux, Privacy Extensions, Use_tempaddr, Sysctl

Description: A detailed reference for the use_tempaddr sysctl parameter on Linux, explaining all values, interaction with addr_gen_mode, and how to configure IPv6 privacy extensions for different use cases.

## The use_tempaddr Parameter

`use_tempaddr` is the kernel sysctl that controls IPv6 Privacy Extensions (RFC 4941). It determines whether temporary addresses are generated from SLAAC prefixes and whether they are preferred for new outgoing connections.

```bash
# Path in /proc filesystem

/proc/sys/net/ipv6/conf/<interface>/use_tempaddr

# sysctl name
net.ipv6.conf.<interface>.use_tempaddr
```

## Values Explained

```bash
# -1 = Disabled (default for point-to-point and loopback devices)
#  0 = Disabled (default for most devices)
#  1 = Enabled: generate temporary addresses, but PREFER the stable/public address
# >1 = Enabled: generate temporary addresses, PREFER temporary address (RFC 4941 recommended)

# Check current value
sysctl net.ipv6.conf.eth0.use_tempaddr
sysctl net.ipv6.conf.all.use_tempaddr

# Direct proc read
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
```

## Setting use_tempaddr

```bash
# Disable temporary addresses
sysctl -w net.ipv6.conf.all.use_tempaddr=0

# Enable temporary addresses (prefer stable address for outgoing)
sysctl -w net.ipv6.conf.all.use_tempaddr=1

# Enable temporary addresses (prefer temporary for outgoing - RFC 4941)
sysctl -w net.ipv6.conf.all.use_tempaddr=2

# Set for all current and future interfaces
sysctl -w net.ipv6.conf.all.use_tempaddr=2
sysctl -w net.ipv6.conf.default.use_tempaddr=2
```

## Persistent Configuration

```bash
# For workstations and privacy-conscious hosts
cat > /etc/sysctl.d/60-ipv6-use-tempaddr.conf << 'EOF'
# Enable RFC 4941 privacy extensions
# Prefer temporary addresses for outgoing connections
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
EOF

sysctl --system

# For servers (stable addresses preferred, no privacy extensions)
cat > /etc/sysctl.d/60-ipv6-use-tempaddr.conf << 'EOF'
net.ipv6.conf.all.use_tempaddr = 0
net.ipv6.conf.default.use_tempaddr = 0
EOF
```

## Difference Between Value 1 and Value 2

```bash
# use_tempaddr=1: temporary address exists but stable address is used for new connections
# use_tempaddr=2: temporary address is used for new connections (higher privacy)

# You can verify which source address is selected:
ip -6 route get 2001:4860:4860::8888
# With use_tempaddr=1:
# src 2001:db8::1234:5678:9abc:def0  (stable/public address)
# With use_tempaddr=2:
# src 2001:db8::a1b2:c3d4:e5f6:7890  (temporary address)
```

## Viewing the Effect

```bash
# After setting use_tempaddr=2, view addresses
ip -6 addr show dev eth0

# You should see both stable and temporary addresses:
# inet6 2001:db8::1234:5678:9abc:def0/64 scope global mngtmpaddr  ← stable
#    valid_lft forever preferred_lft forever
# inet6 2001:db8::a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic  ← temporary
#    valid_lft 86389sec preferred_lft 14389sec

# Check which address will be used for outgoing connections
ip -6 route get 2001:4860:4860::8888
```

## System-Wide Configuration (Ubuntu/NetworkManager)

```bash
# For NetworkManager-managed systems, also set in connection profiles
nmcli connection modify eth0 ipv6.ip6-privacy 2

# Check current setting
nmcli connection show eth0 | grep privacy
```

## Summary

The `use_tempaddr` sysctl controls IPv6 privacy extensions: `0` disables temporary addresses (use on servers), `1` generates them but prefers stable addresses, `2` generates and prefers temporary addresses for outgoing connections (RFC 4941 compliant, use on workstations/desktops). Always set both `all` and `default` for consistent behavior. Combine with `addr_gen_mode=3` (RFC 7217 stable privacy addresses) for comprehensive IPv6 privacy.
