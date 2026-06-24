# How to Configure DS-Lite for ISP IPv4 Over IPv6 Tunneling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DS-Lite, IPv6, IPv4, ISP, Tunneling, AFTR, B4

Description: Configure DS-Lite (Dual-Stack Lite) for ISP deployments, setting up the AFTR (carrier NAT44 over IPv6 tunnel) and B4 (customer-premises softwire concentrator) for IPv4 connectivity over IPv6-only...

## Introduction

DS-Lite (RFC 6333) allows ISPs to provide IPv4 connectivity over IPv6-only access networks. Customer-premises equipment (CPE) runs the B4 (Basic Bridging BroadBand) element which encapsulates IPv4 traffic in IPv6 tunnels. The ISP runs AFTR (Address Family Transition Router) which decapsulates the IPv4-in-IPv6 softwire and NAT44s the traffic to the IPv4 internet.

## Architecture

```text
IPv4 Client → B4 (CPE) →[IPv4-in-IPv6 tunnel]→ AFTR (ISP) → IPv4 Internet
              [encap]        [IPv6-only access]    [NAT44]
```

- **B4**: Located at customer premises; encapsulates private IPv4 in IPv6 (softwire)
- **AFTR**: Located at ISP; terminates the IPv4-in-IPv6 softwire and performs NAT44 to public IPv4

## Setting Up AFTR on Linux

```bash
# Production AFTRs need DS-Lite-aware CGN software.
# A plain Linux tunnel with iptables can demonstrate a single-B4 lab,
# but it does not implement the AFTR extended binding table needed
# for overlapping RFC1918 space from multiple customers.

# Create the AFTR tunnel endpoint
# Each B4 gets a dedicated IPv6 address for its softwire

# Example AFTR lab configuration for one B4:
# B4 IPv6 address: 2001:db8:1:1::100
# AFTR IPv6 address: 2001:db8:ffff::1
# B4's private IPv4: 192.168.1.0/24

# Create IPv4-in-IPv6 tunnel for AFTR
sudo ip -6 tunnel add aftr0 mode ipip6 \
  remote 2001:db8:1:1::100 \
  local 2001:db8:ffff::1 \
  dev eth0

sudo ip link set aftr0 up
sudo ip addr add 192.0.0.1/29 dev aftr0

# Route the B4's private subnet through the tunnel
sudo ip route add 192.168.1.0/24 dev aftr0

# NAT44: translate the lab B4's private IPv4 to public IPv4
sudo iptables -t nat -A POSTROUTING -s 192.168.1.0/24 -o eth1 -j MASQUERADE

# Enable IPv6 and IPv4 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1
sudo sysctl -w net.ipv4.ip_forward=1
```

## Setting Up B4 on CPE (Linux)

```bash
# B4 runs on the customer CPE (e.g., OpenWrt, Linux router)
# The CPE gets a native IPv6 address from the ISP

# CPE's IPv6 address: 2001:db8:1:1::100
# AFTR's IPv6 address: 2001:db8:ffff::1

# Create IPv4-in-IPv6 softwire tunnel to AFTR
sudo ip -6 tunnel add b4-aftr mode ipip6 \
  remote 2001:db8:ffff::1 \
  local 2001:db8:1:1::100 \
  dev eth0   # WAN interface with IPv6

sudo ip link set b4-aftr up
sudo ip addr add 192.0.0.2/29 dev b4-aftr

# Route all IPv4 traffic through the B4 tunnel to AFTR
sudo ip route add default via 192.0.0.1 dev b4-aftr

# Enable IPv4 forwarding on the CPE for LAN clients
sudo sysctl -w net.ipv4.ip_forward=1

# LAN devices use the CPE as their IPv4 gateway
# No NAT needed on B4 if AFTR does the NAT44
```

## AFTR IPv6 Address Discovery

The B4 discovers the AFTR address via DHCPv6:

```text
# DHCPv6 option 64: AFTR-Name
# /etc/dhcp/dhcpd6.conf (on ISP DHCPv6 server)

subnet6 2001:db8:1::/48 {
    range6 2001:db8:1:1::100 2001:db8:1:1::ffff;
    option dhcp6.aftr-name "aftr.isp.example.com";
}
```

The B4 performs DNS lookup for the AFTR name and establishes the softwire.

## Verifying DS-Lite

```bash
# On B4 (CPE):
# Check tunnel is up
ip -6 tunnel show b4-aftr

# Check default route via tunnel
ip route show default
# Expected: default via 192.0.0.1 dev b4-aftr

# Test IPv4 connectivity through AFTR
ping 8.8.8.8

# Test IPv6 native connectivity
ping -6 2001:4860:4860::8888

# On AFTR (ISP side):
# Check active softwires
ip -6 tunnel show

# Monitor NAT44 translations
conntrack -L | head -20   # if conntrack-tools is installed

# Check packet forwarding stats
ip -s link show aftr0
```

## Port Sharing Considerations

Since multiple B4 customers share AFTR public IPv4 addresses:

```text
RFC 6333 requires the AFTR's NAT binding table to include the B4's IPv6
address (the softwire identifier) alongside the private IPv4 address/port.
That allows the AFTR to disambiguate overlapping customer RFC1918 space.

In production, this is handled by DS-Lite-aware AFTR/CGN software rather than
static per-customer SNAT rules on a generic Linux tunnel.
```

## Firewall on AFTR

```bash
# Allow softwire traffic (IPv4-in-IPv6 uses protocol 4)
sudo ip6tables -A INPUT -p 4 -d 2001:db8:ffff::1 -j ACCEPT
sudo iptables -A FORWARD -i eth1 -o aftr0 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Rate limit per B4 to prevent abuse
sudo iptables -A FORWARD -i aftr0 -o eth1 -m limit --limit 1000/sec -j ACCEPT
sudo iptables -A FORWARD -i aftr0 -o eth1 -j DROP
```

## Conclusion

DS-Lite provides IPv4 connectivity over IPv6-only ISP access networks. The B4 on the CPE encapsulates IPv4 traffic in IPv6 softwires directed at the AFTR. The AFTR decapsulates and performs NAT44 using shared public IPv4 addresses. B4s discover the AFTR address via DHCPv6 option 64 (AFTR-Name). On Linux, `ip -6 tunnel add ... mode ipip6` creates the IPv4-in-IPv6 softwire for a single-B4 lab. Production AFTR deployments need DS-Lite-aware software that tracks the B4's IPv6 softwire identifier alongside the private IPv4/port binding.
