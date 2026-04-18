# How to Configure VMware SD-WAN (VeloCloud) with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, VMware SD-WAN, VeloCloud, Edge, Gateway, WAN

Description: Configure IPv6 in VMware SD-WAN (formerly VeloCloud) including Edge device IPv6 addressing, Gateway IPv6 configuration, and routing IPv6 traffic over SD-WAN overlays.

---

VMware SD-WAN supports IPv6 on Edge LAN interfaces and transport side, distributing IPv6 prefixes through the SD-WAN control plane. Edges can route IPv6 between sites and to the internet via SD-WAN Gateways or direct breakout.

## VMware SD-WAN IPv6 Architecture

```text
VMware SD-WAN IPv6 Flow:
Orchestrator (Cloud)
       |
   [Gateway] ← public IPv4/IPv6 transport
   /         \
[Edge-A]    [Edge-B]
LAN: IPv4   LAN: IPv4
     IPv6        IPv6
Clients get dual-stack addresses from Edge DHCPv6/SLAAC
```

## VeloCloud Edge IPv6 Configuration (Orchestrator)

```text
VMware SD-WAN Orchestrator:
Navigate to: Configure > Edges > [Edge Name] > Device > LAN Networks

Add/Edit Network:
  VLAN ID: 10
  Interface: GE1
  IPv4: 192.168.1.1/24
  DHCPv4: Enabled (server)

  IPv6: 2001:db8:a::/64
  IPv6 Mode: Static
  RA (Router Advertisement): Enabled
  RA Interval: 30 seconds
  RDNSS: 2001:4860:4860::8888
  DHCPv6: Enabled (Stateless or Stateful)
```

## VeloCloud Edge Local UI IPv6

```bash
# Access Edge local UI: https://edge-ip:8008 (if local UI enabled)

# Or configure via REST API

# VMware SD-WAN Orchestrator API - configure IPv6 on edge interface

curl -s -X POST \
  "https://orchestrator.example.com/portal/rest/edge/updateEdgeNetworkModuleConfig" \
  -H "Content-Type: application/json" \
  -H "Cookie: velocloud.session=SESSION_TOKEN" \
  -d '{
    "id": EDGE_ID,
    "modules": [{
      "name": "networkRoutes",
      "data": {
        "networks": [{
          "cidrIp": "192.168.1.0",
          "cidrPrefix": 24,
          "networkAddress": "192.168.1.0",
          "netmask": "255.255.255.0",
          "gateway": "192.168.1.1",
          "ipv6": {
            "enabled": true,
            "prefix": "2001:db8:a::/64",
            "raEnabled": true,
            "dhcpv6Enabled": true
          }
        }]
      }
    }]
  }'
```

## SD-WAN Business Policy for IPv6

```text
VMware SD-WAN Orchestrator:
Configure > Profiles > [Profile] > Business Policy

Add Rule:
  Name: IPv6-VoIP-Priority
  Source: 2001:db8:a::/64
  Destination: Any
  Protocol: UDP
  DSCP: EF
  Action: Edge Direct
  Link Steering: MPLS preferred
  QoS: Priority Queue 1

Add Rule:
  Name: IPv6-Internet-Breakout
  Source: ::/0
  Destination: ::/0
  Action: Direct (local internet breakout)
  Cloud Security: Zscaler or Netskope
```

## Gateway IPv6 for Hub-and-Spoke

```bash
# VMware SD-WAN Gateways handle IPv6 routing for hub sites

# Gateway configuration (Linux-based)
# /etc/velocloud/gateway.conf

# Enable IPv6 forwarding
sysctl -w net.ipv6.conf.all.forwarding=1

# Gateway public IPv6 address
ip -6 addr add 2001:db8::1/64 dev eth0

# BGP peers with upstream ISP for IPv6
# In BGP configuration:
# neighbor 2001:db8::2 remote-as 65001
# address-family ipv6 unicast
#   neighbor 2001:db8::2 activate
#   network 2001:db8:a::/48

# Redistribute SD-WAN IPv6 routes to BGP
# bgp redistribute-internal ipv6
```

## Verify IPv6 on VeloCloud Edge

```bash
# SSH into Edge device (if enabled)
ssh admin@edge-ip

# Show IPv6 interfaces
ip -6 addr show
ip -6 route show

# Show SD-WAN tunnel status
cat /var/log/velo/velocloud.log | grep ipv6

# Check VCMP tunnel endpoints (may be IPv4 transport even for IPv6 payload)
netstat -an | grep VCMP

# Test IPv6 from behind the edge
ping6 -I eth1 2001:4860:4860::8888

# View routing table for VRF
ip -6 route show table 200  # VeloCloud uses custom tables
```

## Monitor IPv6 in VMware SD-WAN Orchestrator

```text
Orchestrator > Monitor > Edges > [Edge] > Overview

Network Interface Stats:
- Shows IPv6 traffic on LAN interfaces
- IPv6 packet counters, errors

Orchestrator > Monitor > Business Policy Stats
- Filter by IPv6 source/destination
- Shows policy hits for IPv6 traffic

Orchestrator > Monitor > QoS
- DSCP distribution for IPv6 flows

Orchestrator > Monitor > Path Stats
- Shows IPv6 flows on WAN paths
```

VMware SD-WAN IPv6 support enables dual-stack LAN interfaces on Edges with SLAAC/DHCPv6 for clients, distributes IPv6 prefixes through the SD-WAN control plane, and applies business policies (QoS, path selection, internet breakout) uniformly to both IPv4 and IPv6 traffic flows.
