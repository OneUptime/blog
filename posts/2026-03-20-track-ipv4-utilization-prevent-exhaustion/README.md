# How to Track IPv4 Address Utilization and Prevent Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, IPAM, Monitoring, Address Management, Automation, NetBox

Description: Monitor IPv4 address utilization across subnets and implement alerting to prevent address exhaustion before it impacts operations.

IPv4 address exhaustion causes pod scheduling failures, VM provisioning errors, and service outages. Proactive monitoring prevents these incidents.

## Monitoring with NetBox API

```python
#!/usr/bin/env python3
# check_ip_utilization.py

import requests
import ipaddress

NETBOX_URL = "http://netbox.example.com"
TOKEN = "nbt_key.token"
ALERT_THRESHOLD = 80  # Alert when prefix is 80% utilized

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/json"
}

def paginated_get(path, params=None):
    """Yield all objects from a paginated NetBox API endpoint."""
    url = f"{NETBOX_URL}{path}"
    while url:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        yield from data["results"]
        url = data["next"]
        params = None

def usable_range(prefix):
    """Return the first and last usable IPv4 addresses for a NetBox prefix."""
    network = ipaddress.ip_network(prefix["prefix"])
    first = int(network.network_address)
    last = int(network.broadcast_address)
    if not prefix.get("is_pool") and network.prefixlen < 31:
        first += 1
        last -= 1
    return first, last

def add_interval(intervals, start, end, first, last):
    start = max(start, first)
    end = min(end, last)
    if start <= end:
        intervals.append((start, end))

def used_address_count(prefix):
    first, last = usable_range(prefix)
    intervals = []

    for ip in paginated_get(
        "/api/ipam/ip-addresses/",
        {"parent": prefix["prefix"], "family": 4, "limit": 1000}
    ):
        address = int(ipaddress.ip_interface(ip["address"]).ip)
        add_interval(intervals, address, address, first, last)

    for ip_range in paginated_get(
        "/api/ipam/ip-ranges/",
        {"parent": prefix["prefix"], "family": 4, "limit": 1000}
    ):
        if ip_range.get("mark_utilized"):
            start = int(ipaddress.ip_interface(ip_range["start_address"]).ip)
            end = int(ipaddress.ip_interface(ip_range["end_address"]).ip)
            add_interval(intervals, start, end, first, last)

    if not intervals:
        return 0

    intervals.sort()
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        last_start, last_end = merged[-1]
        if start <= last_end + 1:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))

    return sum(end - start + 1 for start, end in merged)

def prefix_utilization(prefix):
    first, last = usable_range(prefix)
    total = last - first + 1
    if prefix.get("mark_utilized"):
        return 100.0, 0
    used = used_address_count(prefix)
    available = max(total - used, 0)
    return min(used * 100 / total, 100), available

def check_prefix_utilization():
    """Check all active prefixes and alert on high utilization."""
    prefixes = paginated_get(
        "/api/ipam/prefixes/",
        {"status": "active", "family": 4, "limit": 1000}
    )

    alerts = []
    for prefix in prefixes:
        utilized_pct, available = prefix_utilization(prefix)
        if utilized_pct > ALERT_THRESHOLD:
            alerts.append({
                "prefix": prefix["prefix"],
                "description": prefix.get("description", ""),
                "utilization": f"{utilized_pct:.1f}%",
                "available": available
            })

    return alerts

if __name__ == "__main__":
    alerts = check_prefix_utilization()
    if alerts:
        print("HIGH UTILIZATION ALERT:")
        for a in alerts:
            print(f"  {a['prefix']} ({a['description']}): {a['utilization']} used, {a['available']} IPs available")
    else:
        print("All prefixes within normal utilization")
```

## Monitoring Kubernetes IP Pool Utilization

```bash
#!/bin/bash
# check-calico-ipam.sh - Alert when Calico IP pool > 80% used

THRESHOLD=80

check_pool() {
    DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config \
        calicoctl ipam show 2>/dev/null
}

# Parse output and check utilization
check_pool | awk -F'|' -v threshold="$THRESHOLD" '
function trim(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
/^[|] IP Pool/ {
    split(trim($4), total, " ");
    split(trim($5), used, " ");
    t = total[1]+0;
    u = used[1]+0;
    if (t > 0) {
        pct = u * 100 / t;
        printf "Pool utilization: %g/%g = %.1f%%\n", u, t, pct;
        if (pct > threshold) {
            print "ALERT: IP pool utilization above " threshold "%!";
            exit 1;
        }
    }
}'
```

## phpIPAM Subnet Utilization Report

```bash
# Get utilization for all matching subnets via phpIPAM API
TOKEN="your-token"
BASE_URL="http://phpipam.example.com/api/myapp"
FILTER_VALUE="10"

TOKEN="$TOKEN" BASE_URL="$BASE_URL" FILTER_VALUE="$FILTER_VALUE" python3 - <<'PY'
import json
import os
import urllib.parse
import urllib.request

base_url = os.environ["BASE_URL"]
token = os.environ["TOKEN"]

def get_json(path, params=None):
    url = f"{base_url}{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"token": token})
    with urllib.request.urlopen(request) as response:
        return json.load(response)

subnets = get_json("/subnets/", {
    "filter_by": "subnet",
    "filter_value": os.environ["FILTER_VALUE"],
    "filter_match": "partial"
})

for subnet in subnets.get("data", []):
    usage = get_json(f"/subnets/{subnet['id']}/usage/").get("data", {})
    used = int(usage.get("used", 0))
    free = int(usage.get("freehosts", 0))
    total = int(usage.get("maxhosts", used + free))
    if total > 0:
        pct = used * 100 // total
        status = "ALERT" if pct > 80 else "OK"
        print(f"{status}: {subnet['subnet']}/{subnet['mask']} - {pct}% used ({used}/{total})")
PY
```

## Prometheus Metrics for IP Utilization

```python
#!/usr/bin/env python3
# netbox_exporter.py - Export IP utilization metrics for Prometheus
from prometheus_client import start_http_server, Gauge
from check_ip_utilization import paginated_get, prefix_utilization
import time

IPAM_UTILIZATION = Gauge(
    "ipam_prefix_utilization_percent",
    "IPv4 prefix utilization percentage",
    ["prefix", "description"]
)

def update_metrics():
    for prefix in paginated_get(
        "/api/ipam/prefixes/",
        {"status": "active", "family": 4, "limit": 1000}
    ):
        util, _ = prefix_utilization(prefix)
        IPAM_UTILIZATION.labels(
            prefix=prefix["prefix"],
            description=prefix.get("description", "")
        ).set(util)

if __name__ == "__main__":
    start_http_server(9100)
    while True:
        update_metrics()
        time.sleep(300)
```

## Alerting with Cron

```bash
# /etc/cron.d/ip-utilization-check
# Run every hour and email if any prefix is over 80%
0 * * * * root output="$(python3 /usr/local/bin/check_ip_utilization.py)"; echo "$output" | grep -q ALERT && echo "$output" | mail -s "IP Utilization Alert" netops@example.com
```

Regular automated utilization monitoring prevents the "we ran out of IPs" incident that typically only gets discovered when a critical server fails to provision.
