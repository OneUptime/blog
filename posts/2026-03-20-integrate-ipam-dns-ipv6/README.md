# How to Integrate IPAM with DNS for IPv6 Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, DNS, AAAA Records, Automation, NetBox

Description: Automate the creation and management of DNS AAAA and PTR records from IPAM address assignments, keeping DNS synchronized with the IPAM source of truth.

## Introduction

When IPv6 addresses are assigned in IPAM, corresponding DNS AAAA records and PTR records in the appropriate reverse zone under `ip6.arpa` should be created automatically. Manual DNS management creates drift between IPAM and DNS - automation ensures they stay synchronized. The examples below assume the NetBox `dns_name` field contains a fully qualified DNS name.

## Generate AAAA Records from NetBox

```python
#!/usr/bin/env python3
# netbox_to_dns.py

# Generate DNS zone file additions from NetBox IPv6 addresses

import pynetbox
import ipaddress

nb = pynetbox.api("http://netbox.internal", token="your-token")

def ipv6_to_ptr_name(addr: str) -> str:
    """Convert IPv6 address to ip6.arpa PTR record name."""
    return ipaddress.ip_address(addr).reverse_pointer + "."

# Get all IPv6 addresses with DNS names
dns_records = []
for ip in nb.ipam.ip_addresses.filter(family=6, status="active"):
    if not ip.dns_name:
        continue

    addr = str(ipaddress.ip_address(str(ip.address).split('/')[0]))
    dns_name = str(ip.dns_name).rstrip('.')

    dns_records.append({
        "name": dns_name,
        "address": addr,
        "ptr": ipv6_to_ptr_name(addr)
    })

# Generate BIND zone additions
print("; AAAA Records")
print(f"; Generated: {__import__('datetime').datetime.now()}")
print()
for record in sorted(dns_records, key=lambda r: (r['name'], r['address'])):
    print(f"{record['name'] + '.':<40} IN  AAAA  {record['address']}")

print()
print("; PTR Records (reverse DNS)")
for record in sorted(dns_records, key=lambda r: (r['ptr'], r['name'])):
    print(f"{record['ptr']} IN  PTR  {record['name']}.")
```

## Sync IPAM to BIND via nsupdate

```python
#!/usr/bin/env python3
# sync_ipam_to_bind.py
# Dynamically update BIND DNS from NetBox using nsupdate

import subprocess
from collections import defaultdict
import pynetbox
import ipaddress
import dns.resolver

nb = pynetbox.api("http://netbox.internal", token="your-token")
DNS_SERVER = "2001:db8::53"
TSIG_KEY_FILE = "/etc/bind/ddns.key"

def ipv6_to_ptr(addr: str) -> str:
    return ipaddress.ip_address(addr).reverse_pointer + "."

def get_current_aaaa(hostname: str) -> set[str]:
    try:
        answers = dns.resolver.resolve(f"{hostname}.", "AAAA")
        return {str(ipaddress.ip_address(str(answer))) for answer in answers}
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return set()

def update_dns_record(hostname: str, current_ipv6_addrs: set[str], desired_ipv6_addrs: list[str]):
    """Replace AAAA and PTR records for a hostname using nsupdate."""
    nsupdate_lines = [f"""
server {DNS_SERVER}
update delete {hostname}. AAAA
""".strip()]
    for ipv6_addr in desired_ipv6_addrs:
        nsupdate_lines.append(f"update add {hostname}. 300 AAAA {ipv6_addr}")
    nsupdate_lines.append("send")
    nsupdate_lines.append("")

    for ipv6_addr in sorted(current_ipv6_addrs - set(desired_ipv6_addrs), key=ipaddress.ip_address):
        ptr_name = ipv6_to_ptr(ipv6_addr)
        nsupdate_lines.extend([
            f"update delete {ptr_name} PTR",
            "send",
            "",
        ])

    for ipv6_addr in desired_ipv6_addrs:
        ptr_name = ipv6_to_ptr(ipv6_addr)
        nsupdate_lines.extend([
            f"update delete {ptr_name} PTR",
            f"update add {ptr_name} 300 PTR {hostname}.",
            "send",
            "",
        ])

    result = subprocess.run(
        ["nsupdate", "-k", TSIG_KEY_FILE, "-v"],
        input="\n".join(nsupdate_lines),
        capture_output=True,
        text=True,
    )

    if result.returncode == 0:
        print(f"Updated DNS: {hostname} -> {', '.join(desired_ipv6_addrs)}")
    else:
        print(f"DNS update FAILED for {hostname}: {result.stderr}")

# Sync all NetBox addresses to DNS
records_by_name = defaultdict(list)
for ip in nb.ipam.ip_addresses.filter(family=6, status="active"):
    if not ip.dns_name:
        continue

    hostname = str(ip.dns_name).rstrip('.').lower()
    addr = str(ipaddress.ip_address(str(ip.address).split('/')[0]))
    records_by_name[hostname].append(addr)

# Check if DNS already matches
for hostname in sorted(records_by_name):
    desired = sorted(set(records_by_name[hostname]), key=ipaddress.ip_address)
    current = get_current_aaaa(hostname)
    if current != set(desired):
        update_dns_record(hostname, current, desired)
    else:
        print(f"DNS already correct: {hostname} -> {', '.join(desired)}")
```

## PowerDNS Integration via API

```python
#!/usr/bin/env python3
# ipam_to_powerdns.py

from collections import defaultdict
import requests
import pynetbox
import ipaddress
import dns.resolver

nb = pynetbox.api("http://netbox.internal", token="your-token")
PDNS_URL = "http://[::1]:8081/api/v1/servers/localhost"
PDNS_KEY = "your-pdns-api-key"
HEADERS = {"X-API-Key": PDNS_KEY, "Content-Type": "application/json"}

def ipv6_to_ptr(addr: str) -> str:
    return ipaddress.ip_address(addr).reverse_pointer + "."

def zone_for_name(name: str) -> str:
    return str(dns.resolver.zone_for_name(name))

def get_current_aaaa(fqdn: str) -> set[str]:
    try:
        answers = dns.resolver.resolve(f"{fqdn}.", "AAAA")
        return {str(ipaddress.ip_address(str(answer))) for answer in answers}
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        return set()

def patch_rrsets(zone: str, rrsets: list[dict]):
    """Create or update RRsets in PowerDNS."""
    resp = requests.patch(
        f"{PDNS_URL}/zones/{zone}",
        json={"rrsets": rrsets},
        headers=HEADERS,
        timeout=10,
    )
    if resp.status_code == 204:
        print(f"Updated zone: {zone}")
    else:
        print(f"Failed to update {zone}: {resp.status_code} {resp.text}")

# Sync
records_by_name = defaultdict(list)
for ip in nb.ipam.ip_addresses.filter(family=6, status="active"):
    if ip.dns_name:
        addr = str(ipaddress.ip_address(str(ip.address).split('/')[0]))
        fqdn = str(ip.dns_name).rstrip('.').lower()
        records_by_name[fqdn].append(addr)

forward_rrsets = defaultdict(list)
reverse_rrsets = defaultdict(list)

for fqdn, addrs in records_by_name.items():
    unique_addrs = sorted(set(addrs), key=ipaddress.ip_address)
    current_addrs = get_current_aaaa(fqdn)
    forward_zone = zone_for_name(f"{fqdn}.")
    forward_rrsets[forward_zone].append({
        "name": fqdn + ".",
        "type": "AAAA",
        "ttl": 300,
        "changetype": "REPLACE",
        "records": [{"content": addr, "disabled": False} for addr in unique_addrs]
    })

    for addr in unique_addrs:
        ptr_name = ipv6_to_ptr(addr)
        reverse_zone = zone_for_name(ptr_name)
        reverse_rrsets[reverse_zone].append({
            "name": ptr_name,
            "type": "PTR",
            "ttl": 300,
            "changetype": "REPLACE",
            "records": [{"content": fqdn + ".", "disabled": False}]
        })

    for addr in sorted(current_addrs - set(unique_addrs), key=ipaddress.ip_address):
        ptr_name = ipv6_to_ptr(addr)
        reverse_zone = zone_for_name(ptr_name)
        reverse_rrsets[reverse_zone].append({
            "name": ptr_name,
            "type": "PTR",
            "changetype": "DELETE"
        })

for zone, rrsets in forward_rrsets.items():
    patch_rrsets(zone, rrsets)

for zone, rrsets in reverse_rrsets.items():
    patch_rrsets(zone, rrsets)
```

## Validation Script

```python
#!/usr/bin/env python3
# validate_ipam_dns_sync.py
# Verify that IPAM and DNS are in sync for AAAA and PTR records

from collections import defaultdict
import ipaddress
import pynetbox
import dns.resolver

nb = pynetbox.api("http://netbox.internal", token="your-token")

mismatches = 0
records_by_name = defaultdict(set)
ptr_records = {}

for ip in nb.ipam.ip_addresses.filter(family=6, status="active"):
    if not ip.dns_name:
        continue

    ipam_addr = str(ipaddress.ip_address(str(ip.address).split('/')[0]))
    hostname = str(ip.dns_name).rstrip('.').lower()
    records_by_name[hostname].add(ipam_addr)
    ptr_records[ipam_addr] = hostname

for hostname in sorted(records_by_name):
    try:
        answers = dns.resolver.resolve(f"{hostname}.", "AAAA")
        dns_addrs = {str(ipaddress.ip_address(str(a))) for a in answers}
        if dns_addrs != records_by_name[hostname]:
            print(f"MISMATCH: {hostname}")
            print(f"  IPAM: {', '.join(sorted(records_by_name[hostname], key=ipaddress.ip_address))}")
            print(f"  DNS:  {', '.join(sorted(dns_addrs, key=ipaddress.ip_address))}")
            mismatches += 1
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        print(f"MISSING AAAA: {hostname} (IPAM: {', '.join(sorted(records_by_name[hostname], key=ipaddress.ip_address))})")
        mismatches += 1
    except Exception as e:
        print(f"ERROR checking {hostname}: {e}")

for ipam_addr, hostname in sorted(ptr_records.items(), key=lambda item: ipaddress.ip_address(item[0])):
    ptr_name = ipaddress.ip_address(ipam_addr).reverse_pointer
    try:
        answers = dns.resolver.resolve(ptr_name, "PTR")
        ptr_targets = {str(answer).rstrip(".").lower() for answer in answers}
        if hostname not in ptr_targets:
            print(f"MISMATCH PTR: {ptr_name}")
            print(f"  IPAM: {hostname}")
            print(f"  DNS:  {', '.join(sorted(ptr_targets))}")
            mismatches += 1
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
        print(f"MISSING PTR: {ptr_name} (IPAM: {hostname})")
        mismatches += 1
    except Exception as e:
        print(f"ERROR checking PTR {ptr_name}: {e}")

print(f"\nSync status: {mismatches} mismatches found")
```

## Conclusion

IPAM-DNS integration automates the most error-prone part of IPv6 address management - keeping AAAA and PTR records synchronized with assignments. Use nsupdate or the PowerDNS API for dynamic updates triggered by IPAM changes. Run a periodic validation script to detect and alert on drift between IPAM and DNS. The most important practice is making IPAM the source of truth: address assignments happen in IPAM first, and DNS records are derived from those assignments, never the other way around.
