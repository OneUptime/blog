# How to Configure DS-Lite with AFTR on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DS-Lite, AFTR, Linux, ISP Configuration

Description: Step-by-step instructions for configuring an AFTR (Address Family Transition Router) for DS-Lite on Linux to terminate IPv4-in-IPv6 Softwire tunnels from B4 CPE devices.

## Prerequisites

- Linux server with an IPv6 address reachable by B4 devices
- Public IPv4 address pool for CGN NAT44
- Kernel support for IPv6 tunneling (`ip6_tunnel` module)

## Understanding AFTR's Role

The AFTR performs two functions:
1. **Softwire tunnel termination**: Decapsulates IPv4-in-IPv6 packets from B4 devices
2. **CGN NAT44**: Translates subscriber private IPv4 addresses to shared public addresses

## Method 1: Using lwAFTR (Snabb-based AFTR)

For production deployments, Snabb's lwAFTR (Lightweight 4over6 AFTR) offers high-performance packet processing. For lab/testing with a single B4, use Linux's built-in `ip6tnl` tunnels with iptables NAT.

## Method 2: Linux ip6tnl + NAT44 (Single-B4 Lab/Small Scale)

### Step 1: Load Required Kernel Modules

```bash
# Load IPv6 tunnel and NAT/conntrack modules

modprobe ip6_tunnel
modprobe iptable_nat
modprobe nf_conntrack

# Verify the tunnel module is loaded
lsmod | grep ip6_tunnel
```

### Step 2: Create the Softwire Tunnel Interface

RFC 6333 defines a point-to-multipoint AFTR softwire, but a plain Linux `ip6tnl` + `iptables` setup does not implement the AFTR extended binding behavior needed to safely handle multiple B4s with overlapping RFC 1918 space. For a lab setup, configure a dedicated tunnel to a single B4:

```bash
# Create an IPv4-in-IPv6 tunnel to a specific B4
# Mode ipip6 = encapsulated IPv4 over IPv6
ip -6 tunnel add aftr0 mode ipip6 \
    local 2001:db8::1 \
    remote 2001:db8:100::2 \
    encaplimit none \
    dev eth0

# Bring the tunnel interface up
ip link set aftr0 up

# Assign the DS-Lite well-known AFTR IPv4 address to the tunnel interface
ip addr add 192.0.0.1/29 dev aftr0
```

### Step 3: Configure CGN NAT44

All IPv4 traffic arriving from B4 devices (after decapsulation) must be NATted to public addresses:

```bash
# NAT the subscriber LAN behind the B4 to the public IPv4 address pool
# Replace 192.168.100.0/24 with the subscriber IPv4 LAN routed over this tunnel
# Replace 203.0.113.0/28 with your actual public IPv4 addresses
iptables -t nat -A POSTROUTING -o eth1 -s 192.168.100.0/24 -j SNAT \
    --to-source 203.0.113.1-203.0.113.14

# Alternatively, use MASQUERADE if the public IP is dynamic
iptables -t nat -A POSTROUTING -o eth1 -s 192.168.100.0/24 -j MASQUERADE

# Enable IPv4 forwarding
sysctl -w net.ipv4.ip_forward=1

# Enable IPv6 forwarding (needed for tunnel traffic)
sysctl -w net.ipv6.conf.all.forwarding=1
```

### Step 4: Add Routes for Subscriber Networks

```bash
# Route the subscriber IPv4 LAN behind the B4 through the softwire
ip route add 192.168.100.0/24 dev aftr0
```

## Configuring the B4 Side (CPE/Router)

On the home router or B4 device:

```bash
# Create an IPv4-in-IPv6 tunnel from B4 to AFTR
ip -6 tunnel add b4tun0 mode ipip6 \
    local 2001:db8:100::2 \
    remote 2001:db8::1 \
    dev eth0

ip link set b4tun0 up

# Assign the DS-Lite well-known B4 IPv4 address to the tunnel
ip addr add 192.0.0.2/29 dev b4tun0

# Keep the subscriber LAN prefix (for example, 192.168.100.0/24) on the LAN interface, not on b4tun0

# Set MTU to account for the IPv6 header overhead (40 bytes)
ip link set b4tun0 mtu 1460

# Route all IPv4 traffic through the B4 tunnel to AFTR
ip route add default dev b4tun0 mtu 1460
```

## Configuring AFTR Discovery via DHCPv6

B4 devices need to know the AFTR's FQDN. Configure your DHCPv6 server to send option 64 (AFTR-Name), which the B4 resolves to an AAAA record:

```bash
# ISC DHCP server configuration for AFTR-Name option
# /etc/dhcp/dhcpd6.conf
cat >> /etc/dhcp/dhcpd6.conf << 'EOF'
subnet6 2001:db8:100::/64 {
    range6 2001:db8:100::100 2001:db8:100::ffff;
    option dhcp6.aftr-name aftr.example.isp.net.;
}
EOF
```

## Verifying AFTR Operation

```bash
# Check tunnel interface is up
ip link show aftr0
ip addr show aftr0

# Monitor encapsulated traffic arriving from B4 devices
tcpdump -i eth0 -n 'ip6 proto 4'

# Check NAT44 translation table
conntrack -L -n | head -20

# Test from a B4 device
# On B4: ping -4 8.8.8.8
# On AFTR: watch conntrack -L -p icmp
```

## NAT Logging for Abuse Investigation

At ISP scale, NAT logging may be required for abuse handling or regulatory obligations, depending on your jurisdiction:

```bash
# Log NAT translations with conntrack
conntrack -E -p tcp --event-mask NEW | logger -t ds-lite-nat

# Or use iptables LOG target
iptables -t nat -A POSTROUTING -s 192.168.100.0/24 -j LOG --log-prefix "DS-LITE-NAT: "
```

## Summary

Configuring a DS-Lite AFTR on Linux for a lab or single-B4 setup involves creating an `ipip6` tunnel interface to a specific B4, assigning the DS-Lite well-known tunnel IPv4 addresses, configuring iptables NAT44 to translate the subscriber IPv4 LAN to the public pool, enabling IP forwarding, and setting proper MTU (1460 bytes) to account for IPv6 tunnel overhead. For production ISP scale, consider dedicated AFTR software like Snabb lwAFTR.
