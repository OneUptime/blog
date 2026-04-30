# How to Plan IPv6 Address Allocation for ISPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISP, Address Planning, BGP, RIR, Network Design

Description: A comprehensive guide to planning IPv6 address allocation for ISPs, covering RIR allocations, customer delegation, and aggregation strategies.

## ISP IPv6 Allocation Overview

ISPs receive large IPv6 blocks from Regional Internet Registries (RIRs) and delegate smaller prefixes to customers. Many ISPs begin with a /32, although the exact initial allocation varies by RIR policy and documented need.

## Typical ISP Allocation Structure

```text
ISP Total Allocation: 2001:db8::/32

Infrastructure:     2001:db8:0000::/40   (loopbacks, links)
Residential CPE:    2001:db8:0100::/40   (prefix delegation to homes)
Business Customers: 2001:db8:0200::/40   (static allocations)
Data Center:        2001:db8:0300::/40   (hosting customers)
Reserved/Growth:    2001:db8:f000::/40
```

## Customer Prefix Delegation Standards

RFC 6177 recommends giving end sites at least a /64 and, in most cases, significantly more. In practice, many ISPs use plans like:

| Customer Type | Common Prefix | Subnets Available |
|--------------|-------------------|-------------------|
| Home/SOHO     | /56 or /60        | 256 or 16         |
| Small Business | /48              | 65,536            |
| Enterprise     | /44 or /40       | 1M or 16M         |
| Data Center    | /48 per tenant   | 65,536            |

## Prefix Delegation via DHCPv6-PD

Assign home prefixes dynamically using DHCPv6 Prefix Delegation:

```json
{
  "Dhcp6": {
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
        ]
      }
    ]
  }
}
```

## BGP Route Aggregation

In a typical provider-aggregatable design, do not advertise individual customer /56s or /48s to the internet. Aggregate at the ISP level:

```frr
# Only advertise the ISP aggregate to upstream peers
router bgp 65001
 address-family ipv6 unicast
  network 2001:db8::/32
 exit-address-family
```

## Tracking Customer Allocations

Maintain an IPAM system to track all customer prefix assignments. NetBox supports IPv6 natively:

```python
# pynetbox - query all active customer IPv6 allocations
import pynetbox

nb = pynetbox.api("http://netbox.isp.example.com", token="your-token")

# Get all /48 prefixes assigned to business customers
prefixes = nb.ipam.prefixes.filter(status="active")

for prefix in prefixes:
    if (
        getattr(prefix.family, "value", None) == 6
        and getattr(prefix.role, "slug", None) == "customer"
        and str(prefix.prefix).endswith("/48")
    ):
        print(f"{prefix.prefix} -> {prefix.description}")
```

## Reserve Space for Infrastructure

Reserve a dedicated block for infrastructure (loopbacks, point-to-point links). Use /128s for loopbacks and /127s for point-to-point links (RFC 6164):

```text
Router loopback: 2001:db8:0000::{router-id}/128
P2P link:        2001:db8:0000:1000::{pair-id}/127
```

## Multihoming Considerations

If the ISP is multihomed (multiple upstream providers), ensure the ISP aggregate(s) are advertised to all upstreams. Customers that need a prefix portable across providers generally need PI space rather than an allocation from the ISP's provider-assigned (PA) block.

## Conclusion

ISP IPv6 address planning requires a hierarchical structure, clear delegation policies, and strict route aggregation. Following RIR policy for allocations, using clear customer prefix policies, and maintaining an IPAM system ensures long-term scalability and clean routing table hygiene.
