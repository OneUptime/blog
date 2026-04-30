# How to Configure IPv6 for CMTS (Cable Modem Termination Systems)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, CMTS, DOCSIS, Cable, ISP, DHCPv6

Description: Configure IPv6 on Cable Modem Termination Systems (CMTS) using DOCSIS 3.0/3.1 with DHCPv6 prefix delegation for cable internet subscribers.

## CMTS and IPv6

Cable networks use DOCSIS (Data Over Cable Service Interface Specification). DOCSIS 3.0 and 3.1 support IPv6 natively. The CMTS is the ISP-side device that terminates cable modem connections and manages subscriber IPv6 addressing.

## DOCSIS IPv6 Architecture

```mermaid
flowchart LR
    CM[Cable Modem] -- DOCSIS --> CMTS
    CMTS -- DHCPv6 Relay --> DHCP[DHCPv6 Server]
    CMTS -- BGP --> Core[ISP Core Network]
    CM --> CPE[Customer Router\n(gets delegated prefix via PD)]
```

## Cisco CMTS (uBR10012) IPv6 Configuration

On Cisco CMTS platforms, IPv6 features are configured on the cable bundle interface, while the physical cable interface is associated to that bundle and given an IPv6 provisioning mode:

```text
! Configure IPv6 routing
ip cef
ipv6 cef
ipv6 unicast-routing

! Configure IPv6 on the cable bundle interface
interface Bundle1
 ipv6 address 2001:db8:1::1/64
 ipv6 enable
 ipv6 nd managed-config-flag
 ipv6 nd other-config-flag
 ipv6 nd ra interval 5
 ! Enable DHCPv6 relay for prefix delegation
 ipv6 dhcp relay destination 2001:db8:200::10

! Associate the physical cable interface with the bundle
interface Cable1/0/0
 cable ip-init ipv6
 cable bundle 1

! Loopback for CMTS management
interface Loopback0
 ipv6 address 2001:db8:ffff::1/128
```

## DOCSIS Configuration File for IPv6 Cable Modems

DOCSIS configuration files are binary TLV files and can include subscriber-management parameters that affect IPv6 CPE behavior:

```text
# DOCSIS config file (binary TLV file shown in ASCII form)

03 (Net Access Control)                         = 1
18 (Maximum Number of CPE)                      = 1
63 (Subscriber Mgmt Control Max CPE IPv6 Prefix) = 1
```

## DHCPv6 Server for CMTS Subscribers

Configure ISC Kea to handle CMTS subscriber prefix delegation:

```json
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth1"]
    },
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8:1::/64",
        "relay": {
          "ip-addresses": ["2001:db8:1::1"]
        },
        "pools": [
          {
            "pool": "2001:db8:1::100-2001:db8:1::ffff"
          }
        ],
        "pd-pools": [
          {
            "prefix": "2001:db8:100::",
            "prefix-len": 40,
            "delegated-len": 56
          }
        ]
      }
    ]
  }
}
```

## Verifying Cable Modem IPv6 Status

```text
! Cisco CMTS - verify cable modems have IPv6
show cable modem ipv6 registered

! Check delegated prefixes for a specific modem
show cable modem 00aa.bbcc.ddee ipv6 prefix

! View DHCPv6 bindings relayed through CMTS
show ipv6 dhcp relay binding
```

## IPv6 Multicast on CMTS

Cable TV and IPTV over IPv6 multicast typically also require IPv6 multicast routing and MLD (Multicast Listener Discovery) on the subscriber-facing CMTS bundle interface:

```text
! Enable IPv6 multicast routing globally
ipv6 multicast-routing

! Configure MLD on the bundle interface
interface Bundle1
 ipv6 mld version 2
 ipv6 mld query-interval 125
```

## Conclusion

Configuring IPv6 on a CMTS involves enabling IPv6 on the cable bundle interface, setting up DHCPv6 relay to a prefix delegation server, and using DOCSIS configuration files for any required subscriber-management TLVs. With DOCSIS 3.1's wide deployment, most modern cable infrastructure supports IPv6 natively.
