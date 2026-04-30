# How to Configure IPv6 Overlay and Underlay in SD-WAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SD-WAN, Overlay, Underlay, Tunneling, GRE, IPsec, VXLAN

Description: Understand and configure IPv6 in SD-WAN overlay and underlay networks, covering IPv6-over-IPv4, IPv4-over-IPv6, and dual-stack overlay/underlay combinations.

---

SD-WAN uses an overlay network (tunnels carrying user traffic) over an underlay network (physical WAN transport). IPv6 can exist at either layer independently-IPv6 user traffic over IPv4 WAN tunnels, or IPv4 tunnels over IPv6 WAN links-or both layers can be IPv6.

## SD-WAN Overlay/Underlay Combinations

```text
SD-WAN IPv6 Deployment Combinations:

1. IPv4 Underlay + IPv4/IPv6 Overlay (most common today)
   WAN transport: IPv4
   User traffic: IPv4 and IPv6 encapsulated in IPv4 tunnels

2. IPv6 Underlay + IPv4/IPv6 Overlay
   WAN transport: IPv6 (ISP provides IPv6 WAN)
   User traffic: IPv4 and IPv6 encapsulated in IPv6 tunnels

3. Dual-Stack Underlay + Dual-Stack Overlay
   WAN transport: IPv4 and IPv6 (best resilience)
   User traffic: Uses best available path

Example:
[Site A] ─── IPv6 user traffic ─── SD-WAN tunnel (IPv4 underlay) ─── [Site B]
                                    ^
                                    Encapsulated: IPv6 in an IPv4 tunnel
```

## Linux SD-WAN: IPv6 Overlay over IPv4 Underlay

```bash
#!/bin/bash
# ipv6-overlay-ipv4-underlay.sh

# Create SIT tunnel carrying IPv6 over IPv4 WAN

TUNNEL_NAME="sdwan-tun0"
LOCAL_WAN_IPV4="203.0.113.1"     # Local IPv4 WAN address
REMOTE_WAN_IPV4="198.51.100.1"   # Remote site IPv4 WAN address
LOCAL_OVERLAY_IPV6="2001:db8:0:1::1/126"
REMOTE_OVERLAY_IPV6="2001:db8:0:1::2"

# Create SIT tunnel for IPv6 overlay
ip tunnel add $TUNNEL_NAME mode sit \
    local $LOCAL_WAN_IPV4 \
    remote $REMOTE_WAN_IPV4 \
    ttl 255

ip link set $TUNNEL_NAME up

# Assign IPv6 address to tunnel interface
ip -6 addr add $LOCAL_OVERLAY_IPV6 dev $TUNNEL_NAME

# Add route to remote site's LAN via overlay
ip -6 route add 2001:db8:200::/64 via $REMOTE_OVERLAY_IPV6 dev $TUNNEL_NAME

echo "IPv6 overlay tunnel established over IPv4 underlay"
ip -6 addr show $TUNNEL_NAME
ip -6 route show | grep "2001:db8:200::/64"
```

## IPsec IPv6 Overlay over IPv6 Underlay

```bash
# /etc/ipsec.conf - StrongSwan IPv6 SD-WAN tunnel (legacy stroke interface)
# IPv6 underlay WAN, IPv6 overlay user traffic

conn sdwan-site-a-to-b
    keyexchange=ikev2
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!

    # Underlay: IPv6 WAN endpoints
    left=2001:db8:10::1
    leftid=2001:db8:10::1
    right=2001:db8:20::1
    rightid=2001:db8:20::1

    # Overlay: IPv6 site prefixes
    leftsubnet=2001:db8:100::/64
    rightsubnet=2001:db8:200::/64

    # Authentication
    leftcert=site-a.crt
    rightcert=site-b.crt

    auto=start
    dpdaction=restart
    closeaction=restart
```

```bash
# Start StrongSwan IPv6 IPsec
sudo systemctl enable --now strongswan-starter
sudo ipsec statusall

# Verify IPv6 overlay tunnel
sudo ipsec statusall | grep "2001:db8"

# Test IPv6 through IPsec overlay from Site A
ping -6 2001:db8:200::10
```

## VXLAN IPv6 Overlay (Data Center SD-WAN)

```bash
# Create VXLAN with IPv6 underlay (Linux)

# Create VXLAN interface with IPv6 underlay
ip link add vxlan100 type vxlan \
    id 100 \
    local 2001:db8:30::1 \
    remote 2001:db8:30::2 \
    dstport 4789 \
    dev eth0

ip link set vxlan100 up

# Assign overlay IPv6 address
ip -6 addr add 2001:db8:500::1/64 dev vxlan100

# Add route for remote overlay host
ip -6 route add 2001:db8:500::2/128 dev vxlan100

# Verify VXLAN tunnel
bridge fdb show dev vxlan100
ip -6 neigh show dev vxlan100
```

## WireGuard SD-WAN with IPv6

```bash
# /etc/wireguard/wg0.conf - WireGuard SD-WAN
# Dual-stack overlay with mixed IPv4/IPv6 underlay endpoints

[Interface]
PrivateKey = <site-a-private-key>
Address = 10.200.0.1/24, 2001:db8:400::1/64
ListenPort = 51820

[Peer]
# Site B
PublicKey = <site-b-public-key>
Endpoint = 198.51.100.1:51820          # IPv4 underlay endpoint
AllowedIPs = 192.168.2.0/24, 2001:db8:200::/64  # IPv4+IPv6 overlay

[Peer]
# Site C - connect over IPv6 underlay
PublicKey = <site-c-public-key>
Endpoint = [2001:db8:40::1]:51820      # IPv6 underlay endpoint
AllowedIPs = 192.168.3.0/24, 2001:db8:300::/64
```

```bash
# Start WireGuard
sudo wg-quick up wg0

# Verify tunnels
sudo wg show wg0

# Test IPv6 over WireGuard overlay
ping -6 2001:db8:200::10

# Check routing
ip -6 route show | grep "wg0"
```

## Monitor Overlay/Underlay IPv6 Separation

```bash
# Capture underlay IPv6 traffic (WAN interface, for IPv6-based tunnels)
sudo tcpdump -i eth0 -nn 'ip6 and (proto 50 or udp port 4789 or udp port 51820)'

# Capture overlay IPv6 traffic (tunnel interface)
sudo tcpdump -i wg0 -nn ip6

# Verify encapsulation is working
# Underlay: Should show ESP or UDP tunnel packets to the remote endpoint
# Overlay: Tunnel interfaces should show the decapsulated IPv6 payload
sudo tcpdump -i eth0 -nn -vv 'ip6 and (proto 50 or udp port 4789 or udp port 51820)'

# Check tunnel statistics
ip -s link show wg0
ip -s tunnel show | grep -A5 "sdwan"
```

SD-WAN IPv6 overlay/underlay design provides flexibility: IPv6 user traffic can traverse IPv4 WAN links (common today), IPv6 WAN links can carry either IPv4 or IPv6 user traffic, and a dual-stack underlay can enable automatic failover between IPv4 and IPv6 transport paths when the SD-WAN platform is configured to use both transports.
