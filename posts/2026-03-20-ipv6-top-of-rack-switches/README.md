# How to Configure IPv6 for Top-of-Rack Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Top-of-Rack, Switches, BGP, SLAAC, Data Center

Description: Configure IPv6 on top-of-rack (ToR) switches including interface addressing, BGP peering, SLAAC for servers, and prefix advertisement.

## Role of ToR Switches in IPv6 Data Centers

Top-of-Rack switches are the first-hop network devices for servers. They must be configured to:
1. Provide IPv6 addresses to servers via SLAAC or DHCPv6
2. Peer with spine switches using BGP or OSPF
3. Advertise rack-level prefixes upstream

## Interface Configuration

Configure the ToR switch uplink and downlink interfaces with IPv6:

```text
# Arista EOS - ToR switch configuration

! Uplink to Spine 1
interface Ethernet49/1
   description Spine1-Uplink
   no switchport
   ipv6 address 2001:db8:0:1::1/64

! Uplink to Spine 2
interface Ethernet50/1
   description Spine2-Uplink
   no switchport
   ipv6 address 2001:db8:0:2::1/64

! Downlink VLAN interface for server rack
interface Vlan100
   description Rack1-Servers
   ipv6 address 2001:db8:1:100::1/64
   ipv6 nd ra interval 30
   ipv6 nd prefix 2001:db8:1:100::/64
```

## Enabling SLAAC for Server Address Assignment

Configure Router Advertisements (RA) on server-facing VLAN interfaces to enable SLAAC:

```text
# Cisco Nexus - RA configuration for server VLAN

interface Vlan100
  ipv6 address 2001:db8:1:100::1/64
  ipv6 nd ra-interval 30
  ipv6 nd prefix 2001:db8:1:100::/64 2592000 604800

! Suppress RAs on uplinks to spines (not needed there)
interface Ethernet1/1
  ipv6 nd suppress-ra
```

## BGP Configuration on ToR Switch

Peer with spine switches using BGP to advertise rack prefixes:

```text
# Arista EOS BGP configuration
ipv6 route 2001:db8:1::/56 Null0

router bgp 65100
   router-id 10.0.1.1
   !
   ! Peer with both spines over the uplink interfaces
   neighbor SPINES peer-group
   neighbor interface Ethernet49/1 peer-group SPINES remote-as 65200
   neighbor interface Ethernet50/1 peer-group SPINES remote-as 65200
   !
   address-family ipv6
      neighbor SPINES activate
      ! Advertise rack /56 summary
      network 2001:db8:1::/56
```

## Neighbor Discovery Security

Enable RA Guard on server-facing ports to prevent rogue RA attacks:

```text
# Cisco Nexus - RA Guard on server ports
ipv6 nd raguard policy SERVER-PORTS
  device-role host
  managed-config-flag off

! Apply the policy to each server-facing access port
interface Ethernet1/1
  ipv6 nd raguard attach-policy SERVER-PORTS
```

## Verifying IPv6 Operation

Check that IPv6 is functioning correctly on the ToR switch:

```bash
# Arista EOS verification commands
show ipv6 interface brief
show ipv6 neighbors
show ipv6 bgp summary
show ipv6 route

# Check RA is being sent on server VLAN
show ipv6 nd ra internal state vlan 100
```

## MLD Snooping

Enable MLD snooping on server VLANs to prevent unnecessary multicast flooding (IPv6 uses multicast for NDP):

```text
# Enable MLD snooping on server VLANs
system mld snooping
ipv6 mld snooping

vlan configuration 100
  ipv6 mld snooping
  ipv6 mld snooping querier fe80::1
```

## Conclusion

Configuring IPv6 on ToR switches involves setting up server-facing interfaces with SLAAC, establishing BGP peering with spines over IPv6 uplinks, and securing the environment with RA Guard and MLD snooping. A well-configured ToR switch provides reliable, automatic IPv6 address assignment to all rack servers.
