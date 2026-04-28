# How to Use ntopng for IPv6 Traffic Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ntopng, Traffic Analysis, Network Monitoring, Flow Analysis

Description: Configure ntopng to monitor and analyze IPv6 traffic flows, view top IPv6 talkers, protocol distribution, and generate IPv6-specific traffic reports.

## Introduction

`ntopng` is a web-based network traffic analysis tool that provides real-time visibility into IPv6 flows. It captures packets directly or receives NetFlow/sFlow data, and presents IPv6 traffic statistics including top talkers, geographical distribution, protocol breakdown, and historical trends. ntopng treats IPv4 and IPv6 traffic equally and provides unified monitoring.

## Installation

```bash
# Ubuntu/Debian

sudo apt install -y software-properties-common
sudo add-apt-repository -y universe
sudo apt install -y ntopng

# Or via ntop repository for latest version
curl -s https://packages.ntop.org/apt-stable/22.04/all/apt-ntop-stable.deb | \
    sudo dpkg -i -
sudo apt update && sudo apt install -y ntopng

# RHEL/CentOS
sudo yum install -y epel-release
sudo yum install -y ntopng
```

## Basic Configuration

```ini
# /etc/ntopng/ntopng.conf

# Listen on interface for packet capture
-i=eth0

# Web interface port
-w=3000

# Community edition (no license needed for basic use)
--community

# Data directory
-d=/var/lib/ntopng

# Dump flows to disk
--dump-flows=es  # or 'syslog', 'clickhouse'

# IPv6 specific: enable geolocation
--geoip-dir=/usr/share/GeoIP
```

## Starting ntopng

```bash
# Start service
sudo systemctl start ntopng
sudo systemctl enable ntopng

# Start manually for testing
sudo ntopng -i eth0 -w 3000 --community

# Monitor multiple interfaces (including IPv6-only)
sudo ntopng -i eth0 -i eth1 -w 3000

# Capture from pcap file for offline analysis
sudo ntopng -i /tmp/ipv6-capture.pcap -w 3000
```

## Accessing IPv6 Statistics via ntopng REST API

```bash
# Get all active IPv6 flows
curl -s -u admin:admin "http://localhost:3000/lua/rest/v2/get/flow/active.lua" | \
    python3 -m json.tool | grep "ipv6\|ip6"

# Get top IPv6 hosts by traffic
curl -s -u admin:admin \
    "http://localhost:3000/lua/rest/v2/get/host/active.lua?ifid=1&version=6&sortColumn=traffic&sortOrder=desc" | \
    python3 -m json.tool

# Get interface statistics including IPv6 breakdown
curl -s -u admin:admin \
    "http://localhost:3000/lua/rest/v2/get/interface/data.lua?ifid=1" | \
    python3 -c "
import json, sys
d = json.load(sys.stdin)
stats = d.get('stats', {})
print(f'IPv6 bytes in:  {stats.get(\"ipv6.bytes.sent\", 0):,}')
print(f'IPv6 bytes out: {stats.get(\"ipv6.bytes.rcvd\", 0):,}')
"
```

## Monitoring IPv6 with nProbe (Flow Export)

```bash
# Export IPv6 flows from nProbe to ntopng (IPv6 capture is enabled by default)
nprobe --zmq "tcp://*:5556" \
    -i eth0 \
    -T "@NTOPNG@"

# ntopng receives from nProbe via ZMQ
ntopng --zmq "tcp://127.0.0.1:5556" -w 3000
```

## IPv6 Traffic Analysis Script

```python
#!/usr/bin/env python3
"""Query ntopng for IPv6 traffic statistics."""

import requests
import json

NTOPNG_URL = "http://localhost:3000"
AUTH = ("admin", "admin")

def get_ipv6_top_hosts(interface_id=1, top_n=10):
    """Get top IPv6 hosts by traffic."""
    url = f"{NTOPNG_URL}/lua/rest/v2/get/host/active.lua"
    params = {
        "ifid": interface_id,
        "version": 6,
        "sortColumn": "traffic",
        "sortOrder": "desc",
    }

    response = requests.get(url, params=params, auth=AUTH)
    data = response.json()

    hosts = data.get("rsp", {}).get("hosts", [])
    print(f"Top {top_n} IPv6 Hosts:")
    for i, host in enumerate(hosts[:top_n], 1):
        ip = host.get("ip", "unknown")
        traffic = host.get("bytes.sent", 0) + host.get("bytes.rcvd", 0)
        print(f"  {i}. {ip}: {traffic:,} bytes")

def get_ipv6_protocol_breakdown(interface_id=1):
    """Get IPv6 protocol distribution from interface stats."""
    url = f"{NTOPNG_URL}/lua/rest/v2/get/interface/data.lua"
    params = {"ifid": interface_id}

    response = requests.get(url, params=params, auth=AUTH)
    data = response.json()

    print("\nIPv6 Protocol Distribution:")
    stats = data.get("rsp", {}).get("stats", {})
    for key, value in stats.items():
        if "ipv6" in key.lower():
            print(f"  {key}: {value}")

if __name__ == "__main__":
    get_ipv6_top_hosts()
    get_ipv6_protocol_breakdown()
```

## Key IPv6 Metrics to Monitor in ntopng

In the ntopng web interface, navigate to:

- **Dashboard**: Shows IPv4 vs IPv6 traffic ratio in real time
- **Hosts**: Filter by "IPv6" to see only IPv6 hosts
- **Flows**: Filter by IP version to isolate IPv6 flows
- **Traffic Analysis > Protocol**: See ICMPv6 breakdown (NDP, ping, errors)
- **Alerts**: Configure alerts for unusual IPv6 traffic patterns

## Conclusion

ntopng provides unified IPv4/IPv6 traffic visibility through a web interface and REST API. Deploy it with packet capture on your network interface to immediately see IPv6 top talkers, protocol distribution, and flow details. The REST API enables integration with monitoring systems like Grafana for long-term IPv6 traffic trending and capacity planning.
