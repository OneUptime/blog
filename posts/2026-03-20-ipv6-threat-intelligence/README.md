# How to Use IPv6 Threat Intelligence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Threat Intelligence, Misp, STIX, IoC, Security Analytics, SIEM

Description: Integrate IPv6 addresses and prefixes into threat intelligence workflows using MISP, STIX 2.1, and SIEM lookups for blocking, detection, and enrichment.

## IPv6 in Threat Intelligence

Threat intelligence for IPv6 includes:
- **IPv6 IOCs**: known malicious /128 addresses
- **Prefix blocklists**: malicious /48 or /32 ranges
- **Reputation scores**: per-prefix risk rating
- **Attack infrastructure**: C2 servers, scanners, proxies
- **Tunnel abuse**: 6to4/Teredo prefixes used for evasion

IPv6 IOC management faces unique challenges: privacy extensions mean individual addresses rotate, so /64 prefix-level tracking is often more effective than focusing on a single /128.

## STIX 2.1: IPv6 Address Indicators

```json
{
    "type": "bundle",
    "id": "bundle--0e1b9b40-3d10-4c8a-90c4-1f6f8f8790ab",
    "objects": [
        {
            "type": "indicator",
            "spec_version": "2.1",
            "id": "indicator--58d3db08-9a39-4fa0-8e82-2fa70c8ba6bb",
            "created": "2026-03-20T00:00:00.000Z",
            "modified": "2026-03-20T00:00:00.000Z",
            "name": "Malicious IPv6 Scanner",
            "description": "IPv6 address observed conducting network scanning",
            "pattern": "[ipv6-addr:value = '2001:db8:100::1']",
            "pattern_type": "stix",
            "valid_from": "2026-03-20T00:00:00.000Z",
            "indicator_types": ["malicious-activity"],
            "labels": ["scanning", "reconnaissance"]
        },
        {
            "type": "indicator",
            "spec_version": "2.1",
            "id": "indicator--d16b15ab-3e81-4a24-9d9f-8d0a9bc1bb72",
            "created": "2026-03-20T00:00:00.000Z",
            "modified": "2026-03-20T00:00:00.000Z",
            "name": "Malicious IPv6 /48 Prefix",
            "description": "IPv6 /48 prefix hosting attack infrastructure",
            "pattern": "[ipv6-addr:value ISSUBSET '2001:db8:100::/48']",
            "pattern_type": "stix",
            "valid_from": "2026-03-20T00:00:00.000Z",
            "indicator_types": ["malicious-activity"]
        }
    ]
}
```

## MISP: Managing IPv6 IOCs

```python
from pymisp import PyMISP, MISPEvent

# Connect to MISP instance (via IPv6)

misp = PyMISP(
    url="https://[2001:db8::10]/",
    key="your-api-key",
    ssl=True
)

# Create event for IPv6 threat
event = MISPEvent()
event.info = "IPv6 Scanning Campaign"
event.threat_level_id = 2  # Medium
event.analysis = 1          # Ongoing
event.distribution = 1      # This community only

# Add IPv6 IOC attributes
event.add_attribute("ip-src", "2001:db8:100::1")
event.add_attribute("ip-src", "2001:db8:100::2")

# Add prefix as CIDR (network attribute)
event.add_attribute("ip-src", "2001:db8:100::/48")

# Add tag
event.add_tag("tlp:amber")
event.add_tag("attack:scanning")

# Add event
misp.add_event(event)

# Search for IPv6 IOCs
results = misp.search(
    controller="attributes",
    type_attribute="ip-src",
    value="2001:db8:100::1",
    pythonify=True
)
for ioc in results:
    print(f"IOC: {ioc.value} - Event: {ioc.event_id}")
```

## SIEM Lookup: IPv6 Threat List

```python
# Generate SIEM lookup file from MISP
#!/usr/bin/env python3
# misp-to-siem-lookup.py

import csv
import ipaddress
from pymisp import PyMISP

misp = PyMISP(
    url="https://[2001:db8::10]/",
    key="YOUR_API_KEY"
)

# Fetch all IPv6 IOCs
iocs = misp.search(
    controller="attributes",
    type_attribute="ip-src",
    to_ids=1,
    pythonify=True
)

output_file = "/opt/splunk/etc/apps/threat_intel/lookups/ipv6_iocs.csv"
rows = []

with open(output_file, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(["cidr", "threat_type", "source", "event_id"])

    for ioc in iocs:
        try:
            network = ipaddress.ip_network(ioc.value, strict=False)
        except ValueError:
            continue

        if network.version != 6:
            continue

        rows.append((network.prefixlen, network.with_prefixlen, ioc.category, "MISP", ioc.event_id))

    for _, cidr, threat_type, source, event_id in sorted(rows, reverse=True):
        writer.writerow([cidr, threat_type, source, event_id])

print(f"Exported {len(rows)} IPv6 IOCs to {output_file}")
```

## Splunk: IPv6 Threat Intel Enrichment

```text
# transforms.conf
[ipv6_iocs]
filename = ipv6_iocs.csv
match_type = CIDR(cidr)
max_matches = 1

# Enrich firewall events with threat intelligence
index=firewall src_ip="*:*"
| lookup ipv6_iocs cidr AS src_ip OUTPUT threat_type, source, event_id
| where isnotnull(threat_type)
| stats count by src_ip, threat_type, source, event_id
```

## Automated Blocklist from Threat Intel

```bash
#!/bin/bash
# update-ipv6-blocklist.sh - Apply threat intel as nftables rules
# Requires jq and root privileges

MISP_URL="https://[2001:db8::10]"
MISP_KEY="YOUR_API_KEY"

# Fetch malicious IPv6 addresses and prefixes from MISP
MALICIOUS_IPS=$(curl -s -H "Authorization: ${MISP_KEY}" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    "${MISP_URL}/attributes/restSearch" \
    -d '{"type":"ip-src","to_ids":1,"returnFormat":"json"}' | \
    jq -r '.response.Attribute[]?.value' | \
    grep -E '^[0-9A-Fa-f:]+(/[0-9]{1,3})?$' | \
    sort -u)

# Ensure nftables table, chain, and set exist
nft list table ip6 filter >/dev/null 2>&1 || nft add table ip6 filter
nft list chain ip6 filter input >/dev/null 2>&1 || \
    nft 'add chain ip6 filter input { type filter hook input priority 0; }'
nft list set ip6 filter threat_intel_ipv6 >/dev/null 2>&1 || \
    nft 'add set ip6 filter threat_intel_ipv6 { type ipv6_addr; flags interval; auto-merge; }'
nft flush set ip6 filter threat_intel_ipv6

# Add addresses and prefixes to the set
while IFS= read -r IP; do
    [ -n "${IP}" ] && nft add element ip6 filter threat_intel_ipv6 "{ ${IP} }"
done <<< "${MALICIOUS_IPS}"

# Add blocking rule if it does not already exist
if ! nft list chain ip6 filter input | grep -q '@threat_intel_ipv6'; then
    nft add rule ip6 filter input ip6 saddr @threat_intel_ipv6 \
        counter log prefix "THREAT_INTEL_BLOCK: " drop
fi

echo "Blocklist updated: $(printf '%s\n' "${MALICIOUS_IPS}" | grep -c .) IPv6 addresses/prefixes"
```

## Conclusion

IPv6 threat intelligence workflows mirror IPv4 but require /64-prefix awareness - individual /128 addresses rotate due to privacy extensions, making prefix-level tracking more durable. Store IPv6 IOCs in STIX 2.1 format using the `ipv6-addr` object type and `ISSUBSET` for prefix-based indicators. MISP handles IPv6 attributes natively - use `ip-src` and `ip-dst` attribute types with IPv6 values or CIDR ranges. Export IOCs to SIEM lookup tables in CIDR notation so exact `/128` indicators and broader prefixes can both be matched correctly. Automate blocklist updates from MISP to nftables interval sets for operational blocking, and run enrichment queries in Splunk or Elastic to identify IOC matches in historical logs.
