# How to Fix IPv6 MTU Issues in Tunnels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MTU, Tunnel, GRE, IPsec, VPN

Description: Identify and fix MTU issues in IPv6 tunnels, calculate correct tunnel MTU values, and prevent fragmentation overhead in GRE, IPsec, and VPN configurations.

## Introduction

Tunnels introduce additional header overhead that reduces the effective MTU for encapsulated traffic. If the tunnel interface MTU is not reduced to account for this overhead, packets will either be fragmented (adding overhead and risk of drops) or cause connectivity failures when fragmentation is needed but ICMPv6 Packet Too Big messages are blocked. Setting the correct tunnel MTU is one of the most important and commonly missed IPv6 configuration steps.

## Overhead Calculation for Common Tunnels

```text
Tunnel overhead reference table (assuming 1500-byte outer link and IPv4 underlay where not otherwise noted):

Tunnel Type               Overhead    Inner IPv6 MTU
─────────────────────────────────────────────────────
6in4 (IPv6 over IPv4)     20 bytes    1480 bytes
6in4 + IPsec ESP          52+ bytes   1448 bytes or lower
IPv6 over GRE             24 bytes    1476 bytes
IPv6 over GRE + IPsec     76+ bytes   1424 bytes or lower
OpenVPN (UDP)             ~74 bytes   ~1426 bytes
WireGuard over IPv4       60 bytes    1420 bytes
VXLAN over IPv4           50 bytes    1450 bytes
VXLAN over IPv6           70 bytes    1430 bytes
Teredo                    28+ bytes   1472 bytes or lower
MPLS (1 label)            4 bytes     1496 bytes
MPLS (2 labels)           8 bytes     1492 bytes
```

## Configuring Tunnel MTU on Linux

```bash
# 6in4 tunnel (Hurricane Electric style)

sudo ip tunnel add he-ipv6 mode sit remote <HE_SERVER_IP> local <YOUR_IP> ttl 255
sudo ip link set he-ipv6 mtu 1480   # 1500 - 20 (IPv4 header)
sudo ip link set he-ipv6 up
sudo ip addr add 2001:db8::2/64 dev he-ipv6

# GRE tunnel for IPv6
sudo ip tunnel add gre-v6 mode gre remote 203.0.113.1 local 198.51.100.1 ttl 255
sudo ip link set gre-v6 mtu 1476   # 1500 - 20 (IPv4) - 4 (GRE)
sudo ip link set gre-v6 up

# WireGuard (set in /etc/wireguard/wg0.conf)
# [Interface]
# MTU = 1420

# After WireGuard starts, verify
ip link show wg0 | grep mtu
# Expected: mtu 1420

# For a VXLAN tunnel over IPv4
sudo ip link add vxlan0 type vxlan id 100 dstport 4789 remote 203.0.113.1
sudo ip link set vxlan0 mtu 1450   # 1500 - 20 (IPv4) - 8 (UDP) - 8 (VXLAN) - 14 (inner Ethernet)
sudo ip link set vxlan0 up
```

## Detecting Tunnel MTU Problems

```bash
# Test if large packets traverse a tunnel correctly
# Replace 2001:db8::remote with the far end of your tunnel
ping -6 -M do -s 1452 2001:db8::remote  # 1500-byte packet
ping -6 -M do -s 1412 2001:db8::remote  # 1460-byte packet (smaller test)
ping -6 -M do -s 1232 2001:db8::remote  # 1280-byte packet (IPv6 minimum MTU)

# If the 1500-byte probe fails but the 1280-byte probe succeeds: MTU misconfigured or PMTUD blocked

# Check PMTU information for the outer tunnel endpoint
ip route get <OUTER_ENDPOINT_IP>
# For IPv6-underlay tunnels, use: ip -6 route get <OUTER_ENDPOINT_IPV6>

# Check if Packet Too Big messages arrive for tunnel traffic
sudo tcpdump -i any -v "icmp6 and ip6[40] == 2"

# Tracepath to see MTU at each hop
tracepath -6 2001:db8::remote
# Look for hops where MTU decreases
```

## Automatic Tunnel MTU with PMTUD

Linux can use PMTUD on the outer path of `ip tunnel` devices, but this is controlled by the tunnel's PMTUD setting rather than a per-interface IPv6 sysctl:

```bash
# PMTUD is enabled on ip tunnel devices by default unless you create them with nopmtudisc
ip tunnel show he-ipv6

# Re-enable PMTUD explicitly on an existing tunnel if it was disabled
sudo ip tunnel change he-ipv6 mode sit remote <HE_SERVER_IP> local <YOUR_IP> ttl 255 pmtudisc

# Inspect the route to the outer tunnel endpoint; a cached lower PMTU may appear as "mtu <value>"
ip route get <HE_SERVER_IP>
```

## MSS Clamping as a Mitigation

When fixing the tunnel MTU is not possible, MSS clamping prevents TCP from sending packets larger than the effective tunnel MTU:

```bash
# Clamp TCP MSS for forwarded SYN packets leaving the tunnel interface
# Set to: tunnel_mtu - 40 (IPv6) - 20 (TCP) = tunnel_mtu - 60
# For a 1480-byte tunnel: MSS = 1420
sudo ip6tables -t mangle -A FORWARD \
    -o he-ipv6 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1420

# Or use dynamic clamping (preferred when PMTUD works)
sudo ip6tables -t mangle -A FORWARD \
    -o he-ipv6 -p tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu

# Verify iptables rules
sudo ip6tables -t mangle -L FORWARD -v -n
```

## Conclusion

Tunnel MTU issues are among the most common IPv6 configuration mistakes. Every tunnel type adds overhead that must be subtracted from the outer link MTU to get the correct inner interface MTU. Always set the tunnel interface MTU explicitly (using `ip link set <tunnel> mtu <value>`) rather than relying on defaults. When the tunnel carries TCP traffic and PMTUD is not reliable, add MSS clamping rules with `--clamp-mss-to-pmtu` as a safety net. For UDP-based protocols, keep payloads conservative or implement application-level MTU discovery.
