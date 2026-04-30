# How to Configure IPv6 on Arista EOS Switches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Arista, EOS, Switch, Datacenter, BGP

Description: Configure IPv6 on Arista EOS switches for datacenter deployments, including routed interfaces, BGP unnumbered with IPv6, and eAPI-based automation.

## Introduction

Arista EOS (Extensible Operating System) is widely used in hyperscale datacenter networks. Its IPv6 implementation is closely aligned with Linux networking concepts and supports modern features like BGP unnumbered with IPv6 link-local addresses, making it popular for spine-leaf fabrics.

## Step 1: Enable IPv6 Routing and Configure Interfaces

```text
! Enable IPv6 unicast routing
Switch(config)# ipv6 unicast-routing

! Configure a routed interface
Switch(config)# interface Ethernet1
Switch(config-if)# no switchport
Switch(config-if)# ipv6 address 2001:db8:1:1::1/64
Switch(config-if)# ipv6 enable
Switch(config-if)# no shutdown

! Configure VLAN interface (SVI) for IPv6
Switch(config)# interface Vlan100
Switch(config-if)# ipv6 address 2001:db8:1:100::1/64
Switch(config-if)# no shutdown

! Configure an IPv6 loopback
Switch(config)# interface Loopback0
Switch(config-if)# ipv6 address 2001:db8::1/128
```

## Step 2: Configure BGP with IPv6

```text
! Basic BGP with IPv6 address family
Switch(config)# router bgp 65001
Switch(config-router-bgp)# router-id 10.0.0.1
Switch(config-router-bgp)# !
Switch(config-router-bgp)# address-family ipv6
Switch(config-router-bgp-af-ipv6)# network 2001:db8::1/128

! Configure BGP neighbor with IPv6
Switch(config-router-bgp)# neighbor 2001:db8:1:1::2 remote-as 65002
Switch(config-router-bgp)# !
Switch(config-router-bgp)# address-family ipv6
Switch(config-router-bgp-af-ipv6)# neighbor 2001:db8:1:1::2 activate
```

## Step 3: BGP Unnumbered with IPv6 Link-Local

Arista EOS excels at BGP unnumbered, which uses IPv6 link-local addresses for BGP peering. For unnumbered peering, the interface only needs IPv6 enabled so EOS can use its auto-generated link-local address:

```text
! Enable IPv6 on the interface (link-local is auto-generated)
Switch(config)# interface Ethernet1
Switch(config-if)# no switchport
Switch(config-if)# ipv6 enable
Switch(config-if)# no shutdown

! Configure BGP unnumbered over IPv6 link-local transport
Switch(config)# router bgp 65001
Switch(config-router-bgp)# neighbor SPINE peer group
Switch(config-router-bgp)# neighbor SPINE remote-as 65002
Switch(config-router-bgp)# neighbor SPINE auto-local-addr
Switch(config-router-bgp)# neighbor interface Ethernet1 peer-group SPINE

! Activate for both IPv4 and IPv6
Switch(config-router-bgp)# address-family ipv4
Switch(config-router-bgp-af-ipv4)# neighbor SPINE activate

Switch(config-router-bgp)# address-family ipv6
Switch(config-router-bgp-af-ipv6)# neighbor SPINE activate
```

## Step 4: Configure IPv6 ACL

```text
! Create IPv6 access control list
Switch(config)# ipv6 access-list IPV6-PROTECT
Switch(config-ipv6-acl)# permit icmpv6 any any
Switch(config-ipv6-acl)# permit tcp any any
Switch(config-ipv6-acl)# deny ipv6 any any log

! Apply to interface
Switch(config)# interface Ethernet1
Switch(config-if)# ipv6 access-group IPV6-PROTECT in
```

## Step 5: Automate with eAPI

After enabling `management api http-commands`, Arista's eAPI provides a JSON-RPC interface for automation:

```python
#!/usr/bin/env python3
# configure_ipv6_arista.py

# Use Arista's eAPI to configure IPv6 addressing

import requests
import json

SWITCH_IP = "192.168.1.1"
USERNAME = "admin"
PASSWORD = "password"

headers = {"Content-Type": "application/json"}

payload = {
    "jsonrpc": "2.0",
    "method": "runCmds",
    "params": {
        "version": 1,
        "cmds": [
            "enable",
            "configure",
            "interface Ethernet1",
            "no switchport",
            "ipv6 address 2001:db8:1:1::1/64",
            "no shutdown"
        ],
        "format": "json"
    },
    "id": "1"
}

response = requests.post(
    f"https://{SWITCH_IP}/command-api",
    auth=(USERNAME, PASSWORD),
    headers=headers,
    json=payload,
    verify=False
)

print(json.dumps(response.json(), indent=2))
```

## Verification Commands

```text
! Show IPv6 interface status
Switch# show ipv6 interface brief

! Show IPv6 routing table
Switch# show ipv6 route

! Show BGP IPv6 summary
Switch# show ipv6 bgp summary

! Show IPv6 neighbors
Switch# show ipv6 neighbors

! Show BGP unnumbered peers
Switch# show ipv6 bgp peers

! Ping with IPv6
Switch# ping ipv6 2001:db8::1
```

## Conclusion

Arista EOS provides strong IPv6 support with BGP unnumbered being a standout feature for spine-leaf datacenter fabrics. The combination of IPv6-enabled interfaces and BGP unnumbered simplifies cabling and configuration by eliminating the need for unique point-to-point /64 prefixes on every link. Use eAPI for programmatic IPv6 configuration in automated provisioning pipelines.
