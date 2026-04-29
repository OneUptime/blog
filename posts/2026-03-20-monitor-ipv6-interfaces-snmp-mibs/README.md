# How to Monitor IPv6 Interfaces via SNMP MIBs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, MIB, IPv6, Network Monitoring, Interface Monitoring, OID

Description: Monitor IPv6 interface statistics and address information using SNMP MIBs, including the IF-MIB for interface counters and IPV6-MIB for IPv6-specific data.

---

SNMP MIBs (Management Information Bases) provide structured access to device data. For IPv6 monitoring, the IF-MIB covers interface statistics applicable to both IPv4 and IPv6, while the IP-MIB (RFC 4293) provides IPv6 address and routing information.

## Key MIBs for IPv6 Monitoring

```text
Relevant MIBs for IPv6:
- IF-MIB (RFC 2863): Interface statistics (ifInOctets, ifOutOctets)
- IP-MIB (RFC 4293): IPv6 addresses and routing table
- IPV6-MIB (RFC 2465): Legacy IPv6 MIB
- IPV6-TC: IPv6 address types
- INET-ADDRESS-MIB (RFC 4001): Address format definitions
```

## Querying Interface Statistics via SNMP

```bash
# Get all interface descriptions (IF-MIB)

snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifDescr

# Get interface operational status
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifOperStatus

# Get interface counters
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifInOctets
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifOutOctets

# High-capacity counters for 64-bit interfaces
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifHCInOctets
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifHCOutOctets

# Interface errors
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifInErrors
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 ifOutErrors
```

## Monitoring IPv6 Addresses via IP-MIB

```bash
# Get IPv6 address table (ipAddressTable in IP-MIB)
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 IP-MIB::ipAddressTable

# Get IPv6 address origin (manual, dhcp, linklayer for SLAAC, random for privacy extensions)
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 IP-MIB::ipAddressOrigin

# Get pointer to the address prefix entry in ipAddressPrefixTable
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 IP-MIB::ipAddressPrefix

# Get interface IPv6 address status
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 IP-MIB::ipAddressStatus
```

## Python Script for IPv6 Interface Monitoring

```python
#!/usr/bin/env python3
# monitor_ipv6_interfaces.py

from pysnmp.hlapi import *
import json

def get_interface_data(host_ipv6, community='public'):
    """Query IPv6 interface statistics via SNMP."""
    results = {}

    # OIDs for interface monitoring
    oids = [
        ('ifDescr', '1.3.6.1.2.1.2.2.1.2'),
        ('ifOperStatus', '1.3.6.1.2.1.2.2.1.8'),
        ('ifHCInOctets', '1.3.6.1.2.1.31.1.1.1.6'),
        ('ifHCOutOctets', '1.3.6.1.2.1.31.1.1.1.10'),
        ('ifInErrors', '1.3.6.1.2.1.2.2.1.14'),
    ]

    for oid_name, oid_base in oids:
        results[oid_name] = {}
        for (errorIndication, errorStatus, errorIndex, varBinds) in nextCmd(
            SnmpEngine(),
            CommunityData(community, mpModel=1),
            Udp6TransportTarget((host_ipv6, 161)),
            ContextData(),
            ObjectType(ObjectIdentity(oid_base)),
            lexicographicMode=False
        ):
            if errorIndication or errorStatus:
                break
            for varBind in varBinds:
                idx = str(varBind[0]).split('.')[-1]
                results[oid_name][idx] = str(varBind[1])

    return results

if __name__ == '__main__':
    device = '2001:db8::switch1'
    data = get_interface_data(device)
    print(json.dumps(data, indent=2))
```

## Using SNMP for IPv6 Neighbor Table

```bash
# Get IPv6 neighbor table (ipv6NetToMediaTable)
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 \
  1.3.6.1.2.1.55.1.12  # IPV6-MIB::ipv6NetToMediaTable

# Or via IP-MIB ipNetToPhysicalTable
snmpwalk -v2c -c public udp6:[2001:db8::device]:161 \
  IP-MIB::ipNetToPhysicalPhysAddress
```

## Setting Up Prometheus SNMP Exporter for IPv6

```yaml
# /etc/prometheus/snmp_exporter_targets.yaml
scrape_configs:
  - job_name: 'snmp_ipv6'
    static_configs:
      - targets:
          - '[2001:db8::switch1]:161'
          - '[2001:db8::switch2]:161'
    metrics_path: /snmp
    params:
      module: [if_mib]
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - target_label: __address__
        replacement: localhost:9116
```

Monitoring IPv6 interfaces through SNMP MIBs provides the same counters and statistics as IPv4, with the IF-MIB's high-capacity 64-bit counters (`ifHCInOctets`, `ifHCOutOctets`) being essential for accurate measurements on high-speed IPv6 links.
