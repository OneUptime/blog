# How to Fix Fragmentation Issues in VPN Tunnels (GRE, IPsec)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, VPN, GRE, IPsec, Fragmentation, Linux, Networking

Description: Fix packet fragmentation and MTU-related performance issues in GRE, IPsec, and WireGuard VPN tunnels by correctly sizing MTU and configuring MSS clamping.

## Introduction

VPN tunnels add overhead to packets - headers for encapsulation, encryption, and authentication. This reduces the effective MTU inside the tunnel. When tunnel MTU is not properly configured, packets get fragmented inside the tunnel, causing performance degradation, increased CPU load, and in some cases, connection hangs. The fix requires calculating the correct MTU for each tunnel type and applying it consistently.

## Understand Tunnel Overhead

```text
Protocol Overhead (IPv4 underlay examples; actual values vary by options and padding):

GRE tunnel:
  Outer IP header: 20 bytes
  GRE header:       4 bytes minimum (+4 bytes each for checksum, key, or sequence extensions)
  Total overhead:  24 bytes minimum
  Max payload in 1500 MTU network: 1476 bytes minimum

IPsec Tunnel Mode (ESP, AES-GCM):
  Outer IP header: 20 bytes
  ESP header:       8 bytes
  Explicit IV:      8 bytes
  ESP trailer:      2 bytes + 0-3 bytes padding
  Auth tag (GCM):  16 bytes
  Total overhead:  54-57 bytes
  Max payload:     1443-1446 bytes
  NAT-T adds:       8 bytes of outer UDP overhead

WireGuard:
  Outer IP header: 20 bytes (IPv4) or 40 bytes (IPv6)
  UDP header:       8 bytes
  WireGuard data header + tag: 32 bytes
  Total overhead:  60 bytes (IPv4) or 80 bytes (IPv6)
  Max payload:     1440 bytes (IPv4) or 1420 bytes (IPv6)

VXLAN:
  Outer IP:        20 bytes
  Outer UDP:        8 bytes
  VXLAN header:     8 bytes
  Inner Ethernet:  14 bytes
  Total overhead:  50 bytes
  Max payload (for inner IP): 1450 bytes inner MTU
```

## Fix GRE Tunnel MTU

```bash
# Set GRE tunnel interface MTU:

# Interface: gre0 (or tun0, etc.)

# Check current MTU:
ip link show gre0

# Set correct MTU (1500 - 24 = 1476):
ip link set gre0 mtu 1476

# Permanent with NetworkManager:
nmcli connection modify gre-tunnel ip-tunnel.mtu 1476

# For ip_gre kernel module:
ip tunnel add gre0 mode gre remote 10.1.0.2 local 10.1.0.1 ttl 64
ip link set gre0 mtu 1476 up

# Verify with ping through tunnel:
ping -M do -s 1448 remote-host-behind-gre  # 1476 - 28 = 1448
```

## Fix IPsec Tunnel MTU

```bash
# ESP overhead varies by cipher, IP version, padding, and NAT-T use:
# AES-GCM over IPv4: roughly 54-57 bytes; add 8 bytes if NAT-T is in use
# AES-CBC/HMAC modes are typically larger because CBC adds a 16-byte IV and block padding

# Set MTU on xfrm interface:
ip link set xfrm0 mtu 1420   # Conservative value that works for most configs

# For StrongSwan:
# In /etc/swanctl/swanctl.conf:
# connections {
#   my-vpn {
#     children {
#       my-child {
#         # No child-specific MTU field here; set the XFRM interface MTU instead
#       }
#     }
#   }
# }

# Reduce MTU on the underlying physical interface (affects all traffic):
# Don't do this! Use MSS clamping instead for IPsec

# Better: use iptables TCPMSS rules for IPsec traffic (example fixed MSS value):
iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -m policy --pol ipsec --dir in -j TCPMSS --set-mss 1350

iptables -t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN \
  -m policy --pol ipsec --dir out -j TCPMSS --set-mss 1350
```

## Fix WireGuard MTU

```bash
# WireGuard MTU depends on the outer IP version:
# IPv4 underlay: 1500 - 60 = 1440
# IPv6 underlay: 1500 - 80 = 1420

# In WireGuard config (/etc/wireguard/wg0.conf):
[Interface]
Address = 10.0.0.1/24
MTU = 1420    # Conservative value; common for IPv6 underlay

# Or set dynamically:
ip link set wg0 mtu 1420

# If you omit MTU in wg-quick, it is usually auto-detected from the route to the peer.

# If underlying path MTU is less than 1500 (e.g., PPPoE at 1492):
# IPv4 underlay: 1492 - 60 = 1432
# IPv6 underlay: 1492 - 80 = 1412

# Calculate the right MTU:
UNDERLYING_MTU=1500
WG_OVERHEAD=60   # Use 80 if the outer path to the peer is IPv6
WG_MTU=$((UNDERLYING_MTU - WG_OVERHEAD))
echo "Set WireGuard MTU to: $WG_MTU"
ip link set wg0 mtu $WG_MTU
```

## Apply MSS Clamping (Comprehensive Fix)

```bash
# MSS clamping is the most reliable fix:
# Forces TCP to use smaller segments automatically

# For any VPN interface (tun0, wg0, gre0):
# Clamp MSS on the tunnel egress interface:
iptables -t mangle -A FORWARD -o wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Use the actual tunnel interface that carries the encapsulated traffic:
iptables -t mangle -A FORWARD -o gre0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu

# Or set explicit MSS value (IPv4 example for a 1420-byte tunnel MTU):
iptables -t mangle -A FORWARD -o wg0 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --set-mss 1380

# Make persistent (Debian/Ubuntu with iptables-persistent):
iptables-save > /etc/iptables/rules.v4
```

## Verify Fix

```bash
# Test that large packets work through tunnel:
# From host on one side of tunnel to host on other side:

# Should succeed (below path MTU):
ping -M do -s 1392 10.0.0.2  # 1420-byte path MTU over IPv4 => 1420 - 28 = 1392
ping -M do -s 1350 10.0.0.2  # More conservative

# Check TCP MSS in connections through tunnel:
ss -tin state established | grep mss
# MSS should be <= 1380 (or your configured value)

# Watch for retransmissions (fragmentation causing drops):
nstat -az TcpRetransSegs  # Should not be increasing rapidly during VPN transfer
```

## Conclusion

VPN tunnel MTU issues are caused by the overhead each tunnel protocol adds on top of the underlying MTU. Calculate the correct tunnel MTU by subtracting protocol overhead from the underlying path MTU. Set the tunnel interface MTU explicitly with `ip link set tunnelX mtu SIZE`. For TCP, MSS clamping (`--clamp-mss-to-pmtu`) is the most reliable fix as it handles PMTUD failures automatically. For UDP applications through VPN, ensure application payload size accounts for the reduced effective MTU.
