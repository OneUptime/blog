# How to Configure 6rd on Customer Premises Equipment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, 6rd, CPE, ISP, Tunneling

Description: Learn how to configure 6rd IPv6 tunneling on customer premises equipment (CPE routers) including OpenWrt, Linux-based routers, and static manual configuration.

## Overview

Customer Premises Equipment (CPE) implementing 6rd receives tunnel parameters from the ISP (via DHCPv4 option 212 or manual configuration) and establishes a 6rd tunnel to the ISP Border Relay (BR). The CPE then advertises the derived IPv6 prefix to the home LAN via Router Advertisement.

## DHCPv4 Option 212 - Auto-Provisioning

6rd parameters are typically delivered via DHCPv4:

```bash
# isc-dhcp-client - request option 212 in /etc/dhcp/dhclient.conf

also request option-6rd;

# When lease is obtained, extract parameters:
# option 212 contains:
#   1 byte:  IPv4MaskLen (shared high-order IPv4 bits omitted from embedding, e.g. 0)
#   1 byte:  6rdPrefixLen (e.g. 32 for /32)
#   16 bytes: 6rd prefix (e.g. 2001:db8::)
#   4*N bytes: one or more BR IPv4 addresses
```

## OpenWrt Configuration

OpenWrt supports 6rd via the `6rd` package:

```bash
# Install 6rd package
opkg install 6rd

# Configure via UCI
uci set network.wan6.proto=6rd
uci set network.wan6.peeraddr=198.51.100.1    # BR IPv4
uci set network.wan6.ip6prefix=2001:db8::
uci set network.wan6.ip6prefixlen=32
uci set network.wan6.ip4prefixlen=0            # No shared IPv4 prefix (use all 32 WAN IPv4 bits)
uci set network.wan6.tunlink=wan               # Underlying IPv4 interface
uci commit network
/etc/init.d/network restart

# /etc/config/network after commit:
# config interface 'wan6'
#     option proto '6rd'
#     option peeraddr '198.51.100.1'
#     option ip6prefix '2001:db8::'
#     option ip6prefixlen '32'
#     option ip4prefixlen '0'
#     option tunlink 'wan'
```

## Linux Manual Configuration Script

```bash
#!/bin/bash
# 6rd-setup.sh - configure 6rd tunnel based on ISP parameters

# ISP-provided parameters (normally from DHCPv4 option 212)
BR_IPV4="198.51.100.1"          # Border Relay IPv4
PREFIX="2001:db8"               # 6rd prefix
PREFIX_LEN="32"                 # 6rd prefix length
IPV4_MASK_LEN="0"               # Shared high-order IPv4 bits omitted from embedding
WAN_IF="eth0"                   # WAN interface

# Get WAN IPv4 address
WAN_IP=$(ip -4 addr show dev "$WAN_IF" | awk '/inet / {split($2,a,"/"); print a[1]}')

if [ -z "$WAN_IP" ]; then
    echo "Error: No IPv4 address on $WAN_IF"
    exit 1
fi

echo "WAN IPv4: $WAN_IP"

if [ "$PREFIX_LEN" != "32" ] || [ "$IPV4_MASK_LEN" != "0" ]; then
    echo "Error: This example assumes a /32 6rd prefix and IPv4MaskLen 0"
    exit 1
fi

# Convert IPv4 to hex string for prefix calculation
HEX=$(printf '%02x%02x%02x%02x' $(echo "$WAN_IP" | tr '.' ' '))
PART1="${HEX:0:4}"
PART2="${HEX:4:4}"

echo "IPv4 hex: $PART1:$PART2"

# Derive 6rd prefix for this CPE
CE_PREFIX="${PREFIX}:${PART1}:${PART2}::/64"
CE_ADDR="${PREFIX}:${PART1}:${PART2}::1"

echo "6rd CE prefix: $CE_PREFIX"
echo "6rd CE address: $CE_ADDR"

# Remove existing 6rd tunnel
ip tunnel del 6rd 2>/dev/null

# Create 6rd tunnel
ip tunnel add 6rd mode sit remote any local "$WAN_IP" ttl 64
ip tunnel 6rd dev 6rd 6rd-prefix ${PREFIX}::/${PREFIX_LEN} 6rd-relay_prefix 0.0.0.0/${IPV4_MASK_LEN}

ip link set 6rd up mtu 1480
ip -6 addr add ${CE_ADDR}/${PREFIX_LEN} dev 6rd

# Route to BR
ip -6 route replace default via ::${BR_IPV4} dev 6rd

echo "6rd tunnel configured"

# Enable RA on LAN interface
cat > /etc/radvd.conf << EOF
interface eth1 {
    AdvSendAdvert on;
    prefix ${CE_PREFIX} {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
EOF
systemctl restart radvd
echo "RA configured for LAN prefix $CE_PREFIX"
```

## Verify 6rd Tunnel

```bash
# Check tunnel status
ip tunnel show 6rd
# 6rd: ipv6/ip  local 203.0.113.10  ttl 64  6rd-prefix 2001:db8::/32

# Check IPv6 address
ip -6 addr show dev 6rd

# Check default route
ip -6 route show default
# default via ::198.51.100.1 dev 6rd

# Check IPv4 reachability to the Border Relay
ping 198.51.100.1

# Ping external IPv6
ping -6 2001:4860:4860::8888

# Verify LAN devices get IPv6 (on LAN host)
ip -6 addr show | grep "2001:db8:"
```

## Firewall on CPE

```bash
# Allow 6rd tunnel traffic (protocol 41) only from ISP BR
iptables -I INPUT 1 -p 41 -s 198.51.100.1 -j ACCEPT
iptables -I INPUT 2 -p 41 -j DROP

# IPv6 firewall for LAN (on 6rd interface)
ip6tables -A FORWARD -i eth1 -o 6rd -j ACCEPT   # LAN → Internet
ip6tables -A FORWARD -i 6rd -o eth1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A FORWARD -i 6rd -o eth1 -j DROP      # Block unexpected inbound
```

## Troubleshooting 6rd

```bash
# 1. No IPv6 connectivity
#    Check IPv4 path to BR
ping 198.51.100.1

# 2. Tunnel up but no route
ip -6 route show

# 3. Hosts not getting IPv6 addresses
systemctl status radvd
radvdump  # Show RA contents

# 4. Large file transfers fail (MTU)
# Test with large ping
ping -6 -s 1400 2001:4860:4860::8888
# Set MTU
ip link set 6rd mtu 1480

# 5. Check 6rd configuration
ip tunnel show 6rd
```

## Summary

6rd CPE configuration requires ISP-provided parameters: Border Relay IPv4, 6rd prefix, prefix length, and IPv4 mask length. OpenWrt simplifies this with the `6rd` package and UCI configuration. For manual Linux configuration, use `ip tunnel add 6rd mode sit` with `ip tunnel 6rd dev 6rd` to encode the ISP parameters. The derived CE prefix (6rd prefix plus the CE IPv4 bits after any shared IPv4 prefix is removed) is advertised to the LAN via radvd Router Advertisements. Block protocol 41 from non-BR sources at the CPE firewall.
