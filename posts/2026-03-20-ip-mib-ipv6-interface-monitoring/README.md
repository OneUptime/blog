# How to Use IP-MIB for IPv6 Interface Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IP-MIB, SNMP, IPv6, Network Monitoring, RFC 4293, OID, MIB

Description: Use the IP-MIB (RFC 4293) to monitor IPv6 addresses, routing table entries, and IP statistics on network devices and servers via SNMP.

---

The IP-MIB (RFC 4293) unifies IPv4 and IPv6 management in a single MIB structure, providing the `ipAddressTable` for address information and `ipNetToPhysicalTable` for neighbor mapping across both IP versions.

## IP-MIB Structure for IPv6

```text
IP-MIB Objects for IPv6:
- ipAddressTable        : IPv4 and IPv6 interface addresses
- ipAddressEntry        : Per-address information
  - ipAddressAddrType   : Address type (ipv6=2, ipv6z=4)
  - ipAddressAddr       : Address portion of the row index
  - ipAddressIfIndex    : Interface index
  - ipAddressType       : unicast/anycast (broadcast is IPv4-only)
  - ipAddressPrefix     : Link prefix (OID reference)
  - ipAddressOrigin     : manual/dhcp/linklayer/random/other
  - ipAddressStatus     : preferred/deprecated/invalid/inaccessible/unknown/tentative/duplicate/optimistic
- ipNetToPhysicalTable  : IPv4 ARP and IPv6 neighbor mappings
- ipSystemStatsTable    : Per-IP version statistics
```

## Querying ipAddressTable

```bash
# Walk the full address table (IPv4 and IPv6 rows)

snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipAddressTable

# Get global IPv6 addresses only (type 2 = ipv6)
# The IPv6 address is part of the row index, so walk an accessible column.
snmpwalk -OX -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipAddressIfIndex | grep "\[ipv6\]"

# Get address origins
snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipAddressOrigin

# Results:
# 1 = other
# 2 = manual (static)
# 4 = dhcp
# 5 = linklayer (SLAAC)
# 6 = random

# Get address status
snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipAddressStatus

# Results:
# 1 = preferred
# 2 = deprecated
# 3 = invalid
# 4 = inaccessible
# 5 = unknown
# 6 = tentative
# 7 = duplicate
# 8 = optimistic
```

## IPv6 System Statistics via ipSystemStatsTable

```bash
# Get IPv6 packet statistics
snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipSystemStatsTable

# Specific IPv6 stats (ipSystemStatsIPVersion = ipv6(2))
snmpget -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipSystemStatsHCInReceives.2

snmpget -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipSystemStatsHCOutTransmits.2

# In/Out discards
snmpget -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipSystemStatsInDiscards.2

snmpget -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipSystemStatsOutDiscards.2
```

## Neighbor Mapping Table (ipNetToPhysicalTable)

```bash
# Get IPv4 ARP and IPv6 neighbor mappings
snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipNetToPhysicalTable

# Get link-layer addresses
snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipNetToPhysicalPhysAddress

# Get mapping state
snmpwalk -v2c -c public udp6:[2001:db8::1]:161 \
  IP-MIB::ipNetToPhysicalState

# State values:
# 1=reachable, 2=stale, 3=delay, 4=probe, 5=invalid, 6=unknown, 7=incomplete
```

## Python Script for IP-MIB IPv6 Monitoring

```python
#!/usr/bin/env python3
# ipv6_mib_monitor.py

from ipaddress import IPv6Address
from pysnmp.hlapi import *

def get_ipv6_addresses(host_ipv6, community='public'):
    """Retrieve global IPv6 addresses from device via SNMP."""
    ip_address_ifindex_oid = '1.3.6.1.2.1.4.34.1.3'  # ipAddressIfIndex
    base_oid = tuple(int(part) for part in ip_address_ifindex_oid.split('.'))

    addresses = []
    for (errorInd, errorStatus, errorIndex, varBinds) in nextCmd(
        SnmpEngine(),
        CommunityData(community, mpModel=1),
        Udp6TransportTarget((host_ipv6, 161)),
        ContextData(),
        ObjectType(ObjectIdentity(ip_address_ifindex_oid)),
        lexicographicMode=False,
        lookupMib=False
    ):
        if errorInd:
            raise RuntimeError(errorInd)
        if errorStatus:
            raise RuntimeError(
                '%s at %s' % (
                    errorStatus.prettyPrint(),
                    varBinds[int(errorIndex) - 1][0] if errorIndex else '?'
                )
            )
        for oid, value in varBinds:
            oid_parts = tuple(int(part) for part in str(oid).split('.'))
            if oid_parts[:len(base_oid)] != base_oid:
                continue

            index = oid_parts[len(base_oid):]
            addr_type = index[0]

            # ipv6(2) rows carry the 16-byte IPv6 address in the OID index.
            if addr_type == 2 and len(index) == 17:
                address = str(IPv6Address(bytes(index[1:])))
                addresses.append({
                    'address': address,
                    'if_index': int(value)
                })

    return addresses

if __name__ == '__main__':
    device = '2001:db8::1'
    addrs = get_ipv6_addresses(device)
    for entry in addrs:
        print(f"{entry['address']} ifIndex={entry['if_index']}")
```

## Comparing ipAddressTable with System Data

```bash
# Get global IPv6 addresses from SNMP (ipAddressAddrType = ipv6(2))
snmpwalk -OX -v2c -c public udp6:[::1]:161 \
  IP-MIB::ipAddressIfIndex | awk -F'[][]' '/\[ipv6\]/{print $4}' | sort -u > /tmp/snmp_ipv6_addrs.txt

# Get addresses directly from system
ip -6 addr show scope global | awk '/inet6 / {print $2}' | cut -d/ -f1 | sort -u > /tmp/system_ipv6_addrs.txt

# Compare to verify SNMP accuracy
diff /tmp/snmp_ipv6_addrs.txt /tmp/system_ipv6_addrs.txt
```

The IP-MIB's unified approach to IPv4 and IPv6 management through the `ipAddressTable` and `ipSystemStatsTable` simplifies monitoring by using the same MIB tables for both protocols, with `ipAddressAddrType` distinguishing address rows and `ipSystemStatsIPVersion` distinguishing statistics rows.
