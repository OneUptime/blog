# IPv6 Privacy vs Static Interface IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Privacy, Interface ID, EUI-64, SLAAC, Security

Description: A guide to understanding IPv6 privacy extensions vs static interface IDs, including EUI-64 privacy risks, RFC 8981 temporary addresses, and when to use each addressing approach.

IPv6 Stateless Address Autoconfiguration (SLAAC) historically often derived the interface ID (last 64 bits) from the MAC address using modified EUI-64. This creates a stable, globally unique identifier that can be used to track users across networks. Privacy extensions (RFC 8981) mitigate this for outbound connections by generating temporary, random interface IDs, while RFC 7217 stable addresses avoid exposing the MAC address in the stable address.

## Understanding EUI-64 and the Privacy Problem

```bash
# Modified EUI-64 derives interface ID from MAC address

# MAC: 00:11:22:33:44:55
# EUI-64: 0211:22FF:FE33:4455
# IPv6 address: 2001:db8::/64 prefix + 0211:22ff:fe33:4455
# Result: 2001:db8::211:22ff:fe33:4455

# For MAC-derived SLAAC addresses, this interface ID is constant everywhere
# If you connect to WiFi at a coffee shop and at home,
# you get different prefixes but the SAME interface ID
# An observer can track you across networks

# Check if your current address uses EUI-64
# MAC-derived modified EUI-64 addresses often have "ff:fe" in the middle
ip -6 addr show | grep "scope global" | grep "ff:fe"
```

## RFC 8981 Privacy Extensions

Privacy extensions generate temporary, random interface IDs that change periodically alongside a stable address:

```bash
# Check current privacy extension status on Linux
sysctl net.ipv6.conf.eth0.use_tempaddr

# Values:
# 0 = disabled (use stable public address only)
# 1 = generate temporary address but prefer stable public address
# 2 = generate temporary address and PREFER it for outgoing connections (recommended)

# Enable privacy extensions for all interfaces
sysctl -w net.ipv6.conf.all.use_tempaddr=2
sysctl -w net.ipv6.conf.default.use_tempaddr=2

# Make persistent
cat >> /etc/sysctl.d/99-ipv6-privacy.conf << 'EOF'
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
EOF
sysctl --system
```

## Stable Privacy Addresses (RFC 7217)

RFC 7217 provides a middle ground: stable addresses that don't expose the MAC address, but remain consistent per interface and prefix:

```bash
# Check if stable privacy is configured (Linux with systemd-networkd)
cat /etc/systemd/network/eth0.network

# Add stable privacy configuration
cat > /etc/systemd/network/eth0.network << 'EOF'
[Match]
Name=eth0

[Network]
DHCP=yes
IPv6AcceptRA=yes

[IPv6AcceptRA]
UseAutonomousPrefix=yes
Token=prefixstable    # RFC 7217 stable privacy
EOF

systemctl restart systemd-networkd
```

## Comparing Address Types

```bash
# After enabling privacy extensions, a typical interface may show:
ip -6 addr show eth0

# Example output:
# inet6 2001:db8:a:b:1234:5678:9abc:def0/64 scope global temporary dynamic
#   valid_lft 86390sec preferred_lft 14390sec
# inet6 2001:db8:a:b:aabb:ccff:fedd:eeff/64 scope global dynamic mngtmpaddr
#   valid_lft 2591990sec preferred_lft 604790sec
# inet6 fe80::aabb:ccff:fedd:eeff/64 scope link

# First address: temporary (privacy extension) - used for outbound connections
# Second address: stable public address - used alongside temporary ones
# (MAC-derived in this example; RFC 7217 addresses would be opaque instead)
# Third address: link-local - not routable, used for NDP

# Confirm which address is used for outbound connections
curl -6 https://ipv6.icanhazip.com
# On client systems, this typically shows the temporary address
```

## When to Use Static Interface IDs

Static interface IDs (disabling privacy extensions) are appropriate for:

1. **Servers** - consistent address needed for DNS A/AAAA records
2. **Network equipment** - routers, switches need predictable addresses
3. **Management interfaces** - monitoring, SSH access requires stable IPs

```bash
# Disable privacy for a specific interface (servers)
# /etc/sysctl.d/server-ipv6.conf
net.ipv6.conf.eth0.use_tempaddr = 0

# Manually configure a static address alongside SLAAC
ip -6 addr add 2001:db8::100/64 dev eth0

# Or in /etc/network/interfaces
# iface eth0 inet6 static
#   address 2001:db8::100
#   netmask 64
```

## DHCPv6 as an Alternative

DHCPv6 with consistent host identifiers can provide server-like stable addresses without using EUI-64:

```bash
# Request stable address from DHCPv6 using a persistent DUID
# DUIDs are opaque identifiers; some types include a link-layer address and some do not

# systemd-networkd DHCPv6 configuration
cat > /etc/systemd/network/eth0.network << 'EOF'
[Match]
Name=eth0

[Network]
DHCP=ipv6

[DHCPv6]
UseAddress=yes
# "vendor" is the systemd default and is based on hashed machine-id, not the MAC address
DUIDType=vendor
EOF
```

The choice between privacy extensions and static interface IDs depends on the use case: clients (laptops, phones) should use privacy extensions (RFC 8981 temporary addresses) and avoid MAC-derived stable IIDs, while servers and infrastructure should use stable, manually configured addresses. RFC 7217 stable privacy addresses offer a good compromise for devices that need consistent addressing without exposing MAC addresses.
