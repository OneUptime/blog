# How to Configure IPv6 Prefix Delegation for ISP Customers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Prefix Delegation, DHCPv6-PD, ISP, Router, CPE

Description: Configure DHCPv6 Prefix Delegation (PD) to automatically assign IPv6 prefixes to ISP customer premises equipment (CPE).

## What is DHCPv6 Prefix Delegation?

DHCPv6 Prefix Delegation (originally specified in RFC 3633 and incorporated into RFC 8415) allows an ISP to automatically delegate a block of IPv6 addresses to a customer's router (CPE). The CPE then sub-divides that prefix to assign addresses to internal devices.

```mermaid
sequenceDiagram
    CPE->>ISP_DHCP: Solicit (with IA_PD option)
    ISP_DHCP->>CPE: Advertise (prefix 2001:db8:100:100::/56)
    CPE->>ISP_DHCP: Request (confirm prefix)
    ISP_DHCP->>CPE: Reply (lease confirmed)
    CPE->>LAN: RA with 2001:db8:100:101::/64
```

## ISC Kea DHCPv6 Server Configuration

Configure Kea to delegate /56 prefixes to residential customers:

```json
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth0"]
    },
    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/dhcp6.leases"
    },
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8:0100::/40",
        "pd-pools": [
          {
            "prefix": "2001:db8:0100::",
            "prefix-len": 40,
            "delegated-len": 56
          }
        ],
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:db8:53::1,2001:db8:53::2"
          }
        ]
      }
    ]
  }
}
```

## ISC DHCP (dhcpd) Alternative

For ISCs older dhcpd, configure PD like this:

```text
# dhcpd6.conf

subnet6 2001:db8:0100::/40 {
    prefix6 2001:db8:0100:: 2001:db8:01ff:ff00:: /56;

    option dhcp6.name-servers 2001:db8:53::1;
}
```

## CPE Configuration (Linux/OpenWrt)

The CPE router requests a prefix using DHCPv6-PD. On Linux with `dhclient`, request PD on the WAN interface:

```bash
dhclient -6 -P --prefix-len-hint 56 -v eth0
```

On OpenWrt (typical residential router):

```text
# /etc/config/network
config interface 'wan6'
    option device  'eth0.2'
    option proto   'dhcpv6'
    option reqprefix '56'    # Request a /56 from ISP

config interface 'lan'
    option proto   'static'
    option ip6assign '64'    # Use /64 from delegated prefix for LAN
```

## Verifying Delegation

Check that the CPE received and is using the delegated prefix:

```bash
# Check that IPv6 routes and delegated prefixes are installed
ip -6 route show

# On OpenWrt, check that the delegated prefix is assigned to the LAN interface
ip -6 addr show dev br-lan

# Verify RA is advertising the prefix to LAN clients
radvdump
```

## RADIUS-Based Prefix Assignment

For ISPs managing prefix delegation centrally via RADIUS:

```text
# FreeRADIUS users file - assign specific prefix per customer
customer@isp.com Cleartext-Password := "password"
    Delegated-IPv6-Prefix = "2001:db8:100:100::/56"
```

## Conclusion

DHCPv6 Prefix Delegation is the standard mechanism for ISPs to provide IPv6 to customers. Configuring ISC Kea with appropriate PD pools, combined with customer CPE using `dhcpv6` protocol, enables automatic prefix assignment without manual configuration per customer.
