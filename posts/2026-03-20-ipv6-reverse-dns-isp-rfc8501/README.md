# How to Configure IPv6 Reverse DNS for ISPs (RFC 8501)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Reverse DNS, ISP, RFC 8501, Ip6.arpa

Description: A guide to implementing IPv6 reverse DNS at ISP scale per RFC 8501 guidelines, covering delegation management, customer zone provisioning, and scalability considerations.

## What Is RFC 8501?

RFC 8501, "Reverse DNS in IPv6 for Internet Service Providers," provides operational guidance for ISPs managing reverse DNS for large IPv6 address spaces. It addresses the unique challenges of IPv6 rDNS at carrier scale, where each customer may have a /48, /56, or /64 prefix.

## ISP Reverse DNS Responsibilities

At ISP scale, the ISP must:
1. Manage the `ip6.arpa` reverse zone corresponding to their assigned /32 block
2. Delegate sub-zones to customers who want to manage their own rDNS
3. Choose an operational model for non-delegated space (for example wildcard PTRs, DDNS, on-demand generation, or NXDOMAIN)
4. Handle the operational scale of potentially millions of addresses

## Setting Up the ISP's Parent Zone

The ISP receives a /32 from their RIR (e.g., ARIN, RIPE). For `2001:db8::/32`:

```named
// ISP's BIND configuration - /etc/named.conf
zone "8.b.d.0.1.0.0.2.ip6.arpa" IN {
    type master;
    file "/var/named/ip6-reverse-master.zone";
    allow-transfer { secondary-ns; };
    // Allow dynamic updates for automated provisioning
    allow-update { key provisioning-tsig; };
};
```

## Customer Delegation Management

At ISP scale, customer delegations are typically automated. When a customer is assigned a prefix, add NS delegation records for the corresponding nibble-aligned reverse zone:

```bash
#!/bin/bash
# Script to add delegation for a new customer prefix

# Usage: ./add-rDNS-delegation.sh 2001:db8:cafe::/48 ns1.customer.com. ns2.customer.com.

PREFIX=$1
NS1=${2%.}.
NS2=${3%.}.

# Calculate zone name from a nibble-aligned IPv6 prefix
ZONE=$(python3 - "$PREFIX" <<'PY'
import ipaddress
import sys

n = ipaddress.ip_network(sys.argv[1], strict=False)
if n.version != 6 or n.prefixlen % 4 != 0:
    raise ValueError('prefix must be an IPv6 prefix on a nibble boundary')
full = n.network_address.exploded.replace(':','')
nibbles = list(full[: n.prefixlen // 4])
nibbles.reverse()
print('.'.join(nibbles) + '.ip6.arpa')
PY
)

echo "Adding delegation for $ZONE to $NS1 and $NS2"

# Add NS records via nsupdate
nsupdate -k /etc/named/provisioning.key << EOF
server 127.0.0.1
zone 8.b.d.0.1.0.0.2.ip6.arpa.
update add $ZONE. 86400 IN NS $NS1.
update add $ZONE. 86400 IN NS $NS2.
send
EOF

echo "Delegation added successfully"
```

## Handling Un-Delegated Customer Space

RFC 8501 discusses several valid approaches for customer space that is not delegated, including returning NXDOMAIN, using wildcard PTRs, or generating records on demand. One common pattern is a wildcard PTR per customer prefix:

In practice, that usually means serving a wildcard zone for each non-delegated customer prefix:

```named
// In named.conf: wildcard zone for an undelegated customer /48
zone "0.0.f.0.8.b.d.0.1.0.0.2.ip6.arpa" {
    type master;
    file "/var/named/customer-f00-reverse.zone";
};
```

```dns
; Wildcard PTR for an undelegated customer /48
; 2001:db8:f00::/48 -> customer-prefix.dynamic.isp.example.com.
; /var/named/customer-f00-reverse.zone
$TTL 3600
@ IN SOA ns1.isp.example.com. noc.isp.example.com. (...)
@ IN NS ns1.isp.example.com.
@ IN NS ns2.isp.example.com.

; Wildcard covers addresses within this customer prefix
* IN PTR customer-prefix.dynamic.isp.example.com.
```

This scales well, but because the same PTR name is returned for the whole prefix, forward and reverse DNS will not uniquely match for individual addresses.

## IPAM Integration for Automated PTR Management

Large ISPs often integrate IPAM or DDI systems (for example Infoblox or BlueCat, or a source-of-truth such as NetBox feeding DNS automation) to manage PTR records. When an IPv6 address is assigned to a customer, the automation can trigger a DNS update:

```python
# Python example: auto-create PTR when assigning IPv6 address
import ipaddress
import subprocess

def create_ptr_record(ipv6_address, hostname):
    """Create a PTR record for an IPv6 address"""
    addr = ipaddress.ip_address(ipv6_address)
    if addr.version != 6:
        raise ValueError('expected an IPv6 address')
    if addr not in ipaddress.ip_network('2001:db8::/32'):
        raise ValueError("address is outside the ISP's delegated reverse zone")
    hostname = hostname.rstrip('.') + '.'

    # Generate the PTR record name
    ptr_name = addr.reverse_pointer + '.'

    # Add via nsupdate
    update_cmd = f"""
server 127.0.0.1
zone 8.b.d.0.1.0.0.2.ip6.arpa.
update add {ptr_name} 3600 IN PTR {hostname}
send
"""
    result = subprocess.run(['nsupdate', '-k', '/etc/named/update.key'],
                          input=update_cmd, text=True, capture_output=True)
    return result.returncode == 0
```

## RFC 8501 Operational Summary

1. **Delegate where possible**: If customers can run authoritative DNS, the ISP can delegate the corresponding `ip6.arpa` zone
2. **Non-delegated space has multiple valid models**: RFC 8501 discusses wildcard PTRs, DDNS, on-demand generation, and valid negative responses such as NXDOMAIN
3. **Automation matters at scale**: Manual reverse-zone management does not scale for large residential IPv6 deployments
4. **Forward and reverse consistency should be considered**: Wildcard PTRs do not provide unique per-address names or matching forward DNS
5. **Privacy matters**: Default PTR names should avoid exposing subscriber identity, location, or connectivity details

## Verifying ISP Delegation at Scale

```bash
# Check delegation health for a customer prefix
dig NS e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa. @isp-ns1.example.com +short

# Bulk check delegations
while read -r PREFIX; do
    ZONE=$(python3 - "$PREFIX" <<'PY'
import ipaddress
import sys

n = ipaddress.ip_network(sys.argv[1], strict=False)
if n.version != 6 or n.prefixlen % 4 != 0:
    raise ValueError('expected a nibble-aligned IPv6 prefix')
full = n.network_address.exploded.replace(':', '')
print('.'.join(reversed(full[: n.prefixlen // 4])) + '.ip6.arpa.')
PY
)
    RESULT=$(dig NS "$ZONE" @127.0.0.1 +short)
    echo "$PREFIX: $RESULT"
done < customer-prefixes.txt
```

## Summary

RFC 8501 describes several workable IPv6 rDNS models for ISPs: maintain the appropriate `ip6.arpa` reverse zone, delegate customer sub-zones where possible, and otherwise choose between wildcard PTRs, DDNS, on-demand generation, or valid negative responses for non-delegated space. Automation is essential at ISP scale, but wildcard PTRs trade simplicity for less accurate per-address naming.
