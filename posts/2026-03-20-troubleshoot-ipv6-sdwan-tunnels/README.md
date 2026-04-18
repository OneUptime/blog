# How to Troubleshoot IPv6 SD-WAN Tunnels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SD-WAN, Troubleshooting, Tunnel, IPsec, Debugging, WAN

Description: Diagnose and resolve common IPv6 SD-WAN tunnel issues including tunnel establishment failures, IPv6 routing problems through SD-WAN overlays, and MTU/PMTU issues.

---

IPv6 SD-WAN tunnel troubleshooting requires checking tunnel state, verifying IPv6 underlay connectivity, diagnosing routing problems for IPv6 prefixes distributed through the SD-WAN control plane, and resolving MTU issues common when encapsulating IPv6 in additional headers.

## Step 1: Verify IPv6 Underlay Connectivity

```bash
# The underlay is the physical WAN transport

# Check IPv6 WAN interface has a valid address
ip -6 addr show eth0
# Should show: inet6 <global-ipv6>/prefix scope global

# Check IPv6 default route via WAN
ip -6 route show | grep "^default"
# Should show: default via <ISP-gateway> dev eth0

# Ping remote site's WAN IPv6 address (underlay test)
ping6 2001:db8:remote-wan::1 -c 5

# If ping fails:
# 1. Check ISP firewall/ACL blocking ICMPv6
# 2. Verify IPv6 is enabled on WAN interface
# 3. Check sysctl net.ipv6.conf.eth0.disable_ipv6 = 0
```

## Step 2: Test Tunnel Establishment

```bash
# For IPsec tunnels
# Check IKE/ISAKMP Phase 1 (for IPv6 underlay)
sudo ipsec statusall | grep -E "ESTABLISHED|CONNECTING|ipv6"

# Check IKE daemon logs
sudo journalctl -u strongswan -f | grep -E "IKE|IPsec|IPv6"

# For WireGuard tunnels
sudo wg show wg0
# Check: "latest handshake" should be recent
# "transfer" should show activity

# For GRE/IPIP6 tunnels
ip -6 tunnel show
ip -s link show ip6gre0

# Check if tunnel interface is up
ip link show | grep -E "UP|DOWN" | grep -i "tun\|wg\|gre"
```

## Step 3: Diagnose IPv6 Routing in SD-WAN Overlay

```bash
# Check IPv6 routes learned via SD-WAN control plane
ip -6 route show
ip -6 route show table all | grep -v "^local\|^unreachable\|^prohibit"

# Expected: Routes to remote site prefixes via tunnel interface
# 2001:db8:site-b::/64 via 2001:db8:overlay::2 dev sdwan-tun0

# Verify SD-WAN BGP/OMP IPv6 routes
# For Cisco SD-WAN:
# show omp routes vpn 1 family ipv6

# For general BGP-based SD-WAN:
# BIRD 2.x (unified daemon):
birdc show route | grep 2001:db8
# BIRD 1.x (legacy, separate bird6 daemon):
# birdc6 show route | grep 2001:db8
# or FRRouting:
vtysh -c "show ipv6 route bgp"

# Manually trace path through overlay
traceroute6 -s 2001:db8:local::1 2001:db8:remote::10
# Should traverse overlay tunnel, not go to internet
```

## Step 4: Fix MTU/PMTU Issues

```bash
# SD-WAN encapsulation reduces effective MTU
# Each layer adds overhead (assuming IPv4 underlay; add +20 bytes for IPv6 underlay):
# GRE: +24 bytes (4 GRE + 20 outer IPv4)
# IPsec (ESP): +50-80 bytes (depends on cipher/auth/IV/pad)
# WireGuard: +60 bytes (32 WG + 8 UDP + 20 outer IPv4)
# VXLAN: +50 bytes (8 VXLAN + 8 UDP + 20 IPv4 + 14 Ethernet)

# IPv6 minimum MTU: 1280 bytes
# Typical SD-WAN MTU: 1400-1420 bytes

# Check effective MTU on tunnel interface
ip link show wg0 | grep mtu
# Set appropriate MTU
sudo ip link set wg0 mtu 1420

# Test PMTU
ping6 -M do -s 1400 -c 3 2001:db8:remote::10
# If fragmentation needed: returns "Message too big"

# PMTU discovery is always on for IPv6 (mandatory per RFC 8201).
# Accept MTU option from Router Advertisements (default: 1):
sysctl -w net.ipv6.conf.all.accept_ra_mtu=1

# Check PMTU cache
ip -6 route show cache | grep mtu

# Fix for PMTU blackhole: Set lower MSS via nftables
sudo nft add rule ip6 filter forward \
    tcp flags syn tcp option maxseg size set 1380
```

## Step 5: Debug IPv6 Traffic Flow

```bash
# Capture IPv6 traffic entering the tunnel
sudo tcpdump -i wg0 -nn ip6 -c 50

# Capture encrypted packets on WAN interface
sudo tcpdump -i eth0 -nn \
    \(udp port 51820 or proto 50 or proto gre\) -v

# Verify traffic goes through tunnel (not around it)
# From local host:
ip -6 route get 2001:db8:remote::10
# Should show: via <tunnel-endpoint> dev wg0 (not eth0)

# Check if packets are being forwarded
ip6tables -L FORWARD -n -v
# Look for DROP counts on forwarding rules

# Enable IPv6 forwarding if disabled
sysctl -w net.ipv6.conf.all.forwarding=1
```

## Step 6: Common Issues and Fixes

```bash
# Issue 1: Tunnel up but IPv6 not routed
# Fix: Add missing IPv6 routes to tunnel
ip -6 route add 2001:db8:remote::/64 dev wg0

# Issue 2: Asymmetric routing - traffic goes out wg0 but returns via eth0
# Fix: Use ip6tables CONNMARK or policy routing to ensure symmetric return
ip -6 rule add from 2001:db8:remote::/64 lookup 200
ip -6 route add default via 2001:db8:wan::gateway table 200

# Issue 3: SD-WAN controller can't reach edge via IPv6
# Fix: Check control plane channel (often still IPv4 even for IPv6 overlay)
ping 10.0.0.edge  # Controller uses IPv4 for mgmt

# Issue 4: ICMPv6 blocked at tunnel endpoint
# Fix: Allow ICMPv6 in firewall
ip6tables -I FORWARD -p icmpv6 -j ACCEPT
ip6tables -I INPUT -p icmpv6 -j ACCEPT

# Issue 5: DNS resolves IPv6 addresses but routing fails
# Check: dig AAAA remote.example.com → 2001:db8:remote::10
# Check: ip -6 route get 2001:db8:remote::10  # Does it route correctly?
```

## One-Liner Diagnostic Script

```bash
#!/bin/bash
# sdwan-ipv6-diag.sh

echo "=== IPv6 Interface Status ==="
ip -6 addr show | grep -v "^$\|lo"

echo "=== IPv6 Default Routes ==="
ip -6 route show | grep "^default"

echo "=== SD-WAN Tunnel Interfaces ==="
ip link show | grep -E "wg|gre|tun|ipsec|vxlan"

echo "=== IPv6 Tunnel Routes ==="
ip -6 route show | grep -v "^fe80\|^local\|^ff00"

echo "=== Connectivity Tests ==="
ping6 -c 2 -W 2 2001:4860:4860::8888 && echo "Internet: OK" || echo "Internet: FAIL"

echo "=== Firewall Forward Drops ==="
ip6tables -L FORWARD -n -v | awk 'NR>2 && $1 != "0" {print}'
```

IPv6 SD-WAN tunnel troubleshooting most frequently uncovers MTU mismatches where encapsulation overhead reduces the effective IPv6 MTU below 1280 bytes (causing silent packet drops), missing IPv6 routes in the overlay routing table (usually a control plane BGP/OMP issue), or asymmetric IPv6 forwarding paths due to incomplete policy routing rules.
