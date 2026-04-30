# How to Generate IPv6 Address Allocation Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPAM, Reporting, NetBox, Address Management

Description: Generate IPv6 address allocation reports from IPAM tools including coverage summaries, allocation history, unused prefix reports, and site-by-site breakdowns.

## Introduction

IPv6 allocation reports give network teams visibility into how address space is being used, where gaps exist, and which prefixes may be reclaim candidates. Good reports answer: What percent of our /32 is allocated? Which sites have unused /48s? Are there /64s assigned but containing no hosts?

## Python Report Generator (NetBox)

```python
#!/usr/bin/env python3
# generate_ipv6_report.py

import pynetbox
import ipaddress
from datetime import datetime, timezone
from collections import defaultdict

nb = pynetbox.api("http://netbox.internal", token="your-token")

def prefix_length(prefix):
    return ipaddress.ip_network(str(prefix), strict=False).prefixlen

def generate_allocation_report():
    print("=" * 70)
    print(f"IPv6 Address Allocation Report")
    print(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 70)

    # Section 1: Top-level allocation summary
    org_prefix = "2001:db8::/32"
    all_prefixes = list(nb.ipam.prefixes.filter(family=6, within_include=org_prefix))

    by_length = defaultdict(list)
    for p in all_prefixes:
        by_length[prefix_length(p.prefix)].append(p)

    print("\n### Prefix Summary by Length ###")
    for length in sorted(by_length.keys()):
        count = len(by_length[length])
        print(f"  /{length}: {count} prefixes")

    # Section 2: Scope allocations
    print("\n### Scope Allocations (/48) ###")
    print(f"  {'Scope':<25} {'Prefix':<35} {'Status':<12} {'/64 Count':>10}")
    print(f"  {'-'*25} {'-'*35} {'-'*12} {'-'*10}")

    for p in sorted(by_length.get(48, []), key=lambda x: str(x.prefix)):
        scope = str(p.scope) if p.scope else "Unassigned"
        child_64s = nb.ipam.prefixes.count(
            within=str(p.prefix), mask_length=64)
        print(f"  {scope:<25} {str(p.prefix):<35} {p.status.value:<12} {child_64s:>10}")

    # Section 3: Empty prefixes (allocated but no child prefixes, IP ranges, or IPs)
    print("\n### Potentially Unused /48 Prefixes ###")
    unused = []
    for p in by_length.get(48, []):
        child_prefix_count = nb.ipam.prefixes.count(within=str(p.prefix))
        child_range_count = nb.ipam.ip_ranges.count(parent=str(p.prefix))
        child_ip_count = nb.ipam.ip_addresses.count(parent=str(p.prefix))
        if (
            child_prefix_count == 0
            and child_range_count == 0
            and child_ip_count == 0
            and p.status.value == "active"
        ):
            unused.append(p)

    if unused:
        for p in unused:
            print(f"  {str(p.prefix)} - {p.description or 'No description'}")
    else:
        print("  None found")

    # Section 4: /64 prefixes with no assigned IPs
    print("\n### Empty /64 Prefixes (no IP addresses assigned) ###")
    empty_64s = []
    for p in by_length.get(64, []):
        ip_count = nb.ipam.ip_addresses.count(parent=str(p.prefix))
        if ip_count == 0:
            empty_64s.append(p)

    print(f"  Found {len(empty_64s)} empty /64 prefixes")
    for p in empty_64s[:10]:  # Show first 10
        print(f"  {str(p.prefix)} - {p.description or 'No description'}")

generate_allocation_report()
```

## CSV Export

```python
import csv
import ipaddress
import pynetbox
from datetime import datetime

nb = pynetbox.api("http://netbox.internal", token="your-token")

output_file = f"ipv6_report_{datetime.now().strftime('%Y%m%d')}.csv"

with open(output_file, "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow([
        "Prefix", "Prefix Length", "Status", "Scope", "VLAN",
        "Description", "Used IPs", "Tags", "Created"
    ])

    prefixes = nb.ipam.prefixes.filter(family=6, within_include="2001:db8::/32")
    for p in prefixes:
        prefix_length = ipaddress.ip_network(str(p.prefix), strict=False).prefixlen
        ip_count = nb.ipam.ip_addresses.count(parent=str(p.prefix))
        writer.writerow([
            str(p.prefix),
            prefix_length,
            p.status.value,
            str(p.scope) if p.scope else "",
            str(p.vlan) if p.vlan else "",
            p.description or "",
            ip_count,
            ", ".join(t.slug for t in (p.tags or [])),
            str(p.created) if hasattr(p, 'created') else ""
        ])

print(f"Report exported to: {output_file}")
```

## HTML Report with Charts

```python
#!/usr/bin/env python3
# html_ipv6_report.py

import pynetbox
from collections import Counter

nb = pynetbox.api("http://netbox.internal", token="your-token")

prefixes = list(nb.ipam.prefixes.filter(family=6))
by_scope = Counter(str(p.scope) for p in prefixes if p.scope)
by_status = Counter(p.status.value for p in prefixes)

html = f"""<!DOCTYPE html>
<html><head><title>IPv6 Report</title></head>
<body>
<h1>IPv6 Allocation Report</h1>
<h2>Prefixes by Scope</h2>
<table border="1">
<tr><th>Scope</th><th>Prefix Count</th></tr>
{"".join(f"<tr><td>{scope}</td><td>{count}</td></tr>" for scope, count in by_scope.most_common())}
</table>
<h2>Prefixes by Status</h2>
<table border="1">
<tr><th>Status</th><th>Count</th></tr>
{"".join(f"<tr><td>{status}</td><td>{count}</td></tr>" for status, count in by_status.items())}
</table>
</body></html>"""

with open("ipv6_report.html", "w") as f:
    f.write(html)
print("HTML report: ipv6_report.html")
```

## Conclusion

IPv6 allocation reports should answer three questions: what is allocated and to whom (inventory), what is empty or potentially reclaim-able (optimization), and what is the growth trend (capacity planning). Generate reports weekly from IPAM via API rather than manually, and export to CSV for stakeholders who need spreadsheet access. The most actionable report content is the list of /48 prefixes with no child allocations - these are candidates for reclamation or reuse.
