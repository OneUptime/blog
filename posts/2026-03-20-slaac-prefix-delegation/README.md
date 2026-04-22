# How to Use DHCPv6 Prefix Delegation with SLAAC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prefix Delegation, DHCPv6-PD, SLAAC, IPv6, Home Router, ISP

Description: Understand how DHCPv6 Prefix Delegation (DHCPv6-PD) works with SLAAC to automatically provision IPv6 prefixes for home routers and enterprise edge devices, enabling downstream SLAAC for hosts.

## Introduction

DHCPv6 Prefix Delegation (DHCPv6-PD, originally RFC 3633 and now part of RFC 9915) allows a router to request a prefix from an upstream router or ISP rather than a single address. The delegated prefix is then sub-divided and used for downstream SLAAC. This is the standard mechanism by which home routers, CPE devices, and enterprise edge routers obtain IPv6 prefixes from ISPs and distribute them to internal networks.

## How Prefix Delegation Works

```text
Prefix Delegation Flow:

ISP → [DHCPv6-PD Server]
         ↓ delegates /56 or /48
CPE Router (Customer Premises Equipment)
  ↓ splits into /64 subnets
  ↓ advertises via SLAAC RA
Home Hosts (SLAAC clients)

Step 1: CPE router sends DHCPv6 SOLICIT with IA_PD option
  IA_PD: "I want a prefix for delegation"
  Prefix hint: may request specific prefix length (/56 or /48)

Step 2: ISP DHCPv6 server responds with ADVERTISE
  Contains IA_PD with delegated prefix:
  e.g., 2001:db8:1234::/56 (256 /64 subnets available)

Step 3: CPE router confirms with REQUEST → REPLY
  Prefix is delegated: 2001:db8:1234::/56

Step 4: CPE router sub-divides prefix for internal use
  LAN 1: 2001:db8:1234:01::/64
  LAN 2: 2001:db8:1234:02::/64
  VLAN 10: 2001:db8:1234:10::/64
  ...

Step 5: CPE advertises /64 prefixes via SLAAC RA
  Hosts on each LAN receive RA with their /64 prefix
  SLAAC generates host addresses from prefix
```

## Configuring DHCPv6-PD Client on Linux

```bash
# Install dhcpcd (popular DHCPv6-PD client)

sudo apt-get install dhcpcd

# Configure dhcpcd for prefix delegation
sudo tee /etc/dhcpcd.conf > /dev/null << 'EOF'
noipv6rs

# WAN interface (towards ISP)
interface eth0
    ipv6rs

    # Request an IPv6 address for WAN (IA_NA)
    ia_na

    # Request a prefix for delegation (IA_PD)
    ia_pd 1/::/56 eth1/1 eth2/2
    # ^      ^       ^       ^
    # |      |       |       +-- Use prefix+2 for eth2 LAN
    # |      |       +---------- Use prefix+1 for eth1 LAN
    # |      +------------------ Hint: request /56
    # +-------------------------- IA_PD ID = 1
EOF

sudo systemctl restart dhcpcd

# Verify prefix was received
ip -6 addr show eth0
# Should show WAN address from IA_NA

ip -6 addr show eth1
# Should show LAN address from delegated prefix
# e.g., 2001:db8:1234:1::1/64

# Check that an RA daemon such as radvd is sending RA on eth1
sudo tcpdump -i eth1 -v "icmp6 and ip6[40] == 134"
```

## Linux Router: Full PD + SLAAC Setup

```bash
# Complete setup: receive prefix from ISP, advertise to LAN

# 1. Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# 2. Configure dhcpcd on WAN interface (eth0)
sudo tee /etc/dhcpcd.conf > /dev/null << 'EOF'
noipv6rs

interface eth0
    ipv6rs
    ia_na
    ia_pd 1/::/56 eth1/1
EOF

# 3. Configure radvd to advertise the delegated LAN prefix
sudo apt-get install radvd

sudo tee /etc/radvd.conf > /dev/null << 'EOF'
interface eth1
{
    AdvSendAdvert on;
    prefix ::/64
    {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
EOF

sudo systemctl enable --now radvd

# 4. Alternative: use wide-dhcpv6-client for PD
sudo apt-get install wide-dhcpv6-client

sudo tee /etc/wide-dhcpv6/dhcp6c.conf > /dev/null << 'EOF'
interface eth0 {
    send ia-pd 1;
    send rapid-commit;
    request domain-name-servers;
};

id-assoc pd 1 {
    prefix ::/56 infinity;
    prefix-interface eth1 {
        sla-id 1;
        sla-len 8;  # /56 + 8 = /64
    };
};
EOF

sudo systemctl start wide-dhcpv6-client
```

## Cisco Home Router / CPE Configuration

```text
! Cisco IOS CPE router with DHCPv6-PD

ipv6 unicast-routing

! WAN interface: request prefix from ISP
interface GigabitEthernet0/0
 description WAN - towards ISP
 ! Get WAN address and default route via SLAAC
 ipv6 address autoconfig default
 ipv6 enable
 ! Send a /56 prefix-length hint, then store the delegated prefix as PREFIX
 ipv6 dhcp client pd hint ::/56
 ipv6 dhcp client pd PREFIX
 no shutdown

! LAN interface: use delegated prefix
interface GigabitEthernet0/1
 description LAN - internal hosts
 ! Use subnet ID 1 from the delegated prefix and ::1 as the router address
 ipv6 address PREFIX ::1:0:0:0:1/64
 ! Signal stateless DHCPv6 for DNS and other non-address options
 ipv6 nd other-config-flag
 no shutdown

! Configure SLAAC RA on LAN
! (automatic when IPv6 address is assigned and unicast-routing enabled)

! Verify delegation
show ipv6 dhcp binding
show ipv6 interface GigabitEthernet0/1
```

## Verifying Prefix Delegation

```bash
# Check delegated prefix in the DHCPv6 lease
sudo dhcpcd --dumplease eth0 | grep dhcp6_ia_pd
# Look for IA_PD / IA Prefix fields for 2001:db8:1234::/56

# Check LAN prefix was derived from delegation
ip -6 addr show eth1
# inet6 2001:db8:1234:1::1/64 scope global  ← /56 sub-divided to /64

# Check RA is being sent on LAN
sudo tcpdump -i eth1 -v "icmp6 and ip6[40] == 134"

# Check host received SLAAC address from delegated prefix
# On host connected to eth1:
# ip -6 addr show
# inet6 2001:db8:1234:1::211:22ff:fe33:4455/64 scope global dynamic
#                    ^^ prefix matches delegation

# Check DHCPv6 client lease
sudo dhcpcd --dumplease eth0
```

## Prefix Delegation Hierarchy

```text
Typical IPv6 Allocation and Delegation Hierarchy:

ISP assigns:       /32 (ISP prefix)
  ↓ allocates or routes internally
Regional POP:      /40 (per region)
  ↓ allocates or routes internally
Customer:          /48 (per enterprise customer)
  ↓ sub-divides
Site A:            /56 (per building or campus)
  ↓ sub-divides
VLAN/Subnet:       /64 (per LAN segment)
  ↓ SLAAC addresses
Hosts:             /128 (individual host addresses)

Home broadband typical:
  ISP delegates /56, /60, or sometimes /64 to CPE router
  CPE uses one /64 sub-prefix for each SLAAC LAN
  A /64 delegation supports one SLAAC LAN; larger delegations support multiple LANs
  Hosts use SLAAC within each /64
```

## Conclusion

DHCPv6 Prefix Delegation enables automatic IPv6 prefix provisioning for routers. The CPE router requests a prefix block (typically /48 or /56) from the ISP using IA_PD, then sub-divides it into /64 prefixes for internal networks. Hosts on each network use SLAAC to generate addresses from those /64 prefixes. On Linux, `dhcpcd` with IA_PD configuration handles the client side. The combination of DHCPv6-PD for prefix acquisition and SLAAC for host addressing is the standard deployment model for home broadband and enterprise IPv6.
