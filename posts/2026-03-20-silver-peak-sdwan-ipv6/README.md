# How to Configure Silver Peak SD-WAN with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Silver Peak, SD-WAN, HPE Aruba, EdgeConnect, Orchestrator, WAN

Description: Configure IPv6 in Silver Peak (now HPE Aruba) SD-WAN including EdgeConnect appliance IPv6 interface setup, Orchestrator policy configuration, and IPv6 path quality monitoring.

---

Silver Peak SD-WAN, now HPE Aruba EdgeConnect, supports IPv6 on LAN and WAN interfaces. EdgeConnect appliances managed by the Orchestrator can route IPv6 traffic across overlay tunnels, apply business intent overlays to IPv6 flows, and monitor IPv6 path quality.

## EdgeConnect IPv6 Interface Configuration

```text
HPE Aruba Orchestrator:
Navigate to: Configuration > Networking > Deployment
Edit: [Appliance Name]

LAN Interface Configuration:
  Interface: lan0
  IPv4: 192.168.1.1/24
  IPv6: 2001:db8:100::1/64 (Static)
  Router Advertisement: Enabled (V6 tab)
    Max Interval: 30s
    Min Interval: 10s
    Prefix: 2001:db8:100::/64
    Autonomous: Yes
    Onlink: Yes
    Managed Flag: No
    Other Flag: Yes

WAN Interface Configuration:
  Interface: wan0
  Mode: DHCPv4 + DHCPv6 or DHCPv4 + SLAAC
  IPv4: Dynamic (DHCPv4 from ISP)
  IPv6: Dynamic (DHCPv6 or SLAAC from ISP)
  Label: MPLS, Internet, or Broadband
```

## EdgeConnect Local Configuration

```bash
# SSH into EdgeConnect appliance

ssh admin@edgeconnect-ip

# Show interface status, including IPv6 addresses
show interfaces lan0
show interfaces wan0

# EdgeConnect deployment changes are normally pushed from Orchestrator.
# If you configure locally, use the CLI syntax from the EdgeConnect CLI reference:
interface lan0 ip-address 2001:db8:100::1/64

# Configure IPv6 default route
ip default-gateway 2001:db8:200::1 wan0

# Show routing and default-gateway state
show ip route
show ip default-gateway

# Verify SD-WAN tunnels
show tunnel summary
show tunnel <tunnel-name> ipsec status
show tunnel <tunnel-name> stats latency

# Test IPv6 connectivity
ping -I lan0 2001:4860:4860::8888
```

## Business Intent Overlay for IPv6

```text
Orchestrator > Configuration > Overlays & Security > Business Intent Overlays

Create Overlay: "IPv6-VoIP-Overlay"
  Match:
    ACL rule matching IPv6 voice subnets or applications
    Protocol: UDP
    Destination Port: 10000-20000
    DSCP: EF
  Service Level Objective (SLO):
    Latency: < 100ms
    Loss: < 1%
    Jitter: < 20ms
  WAN Links:
    Primary: MPLS, Broadband
  Link Bonding Policy:
    Mode: High Availability or High Quality

Create Overlay: "IPv6-Bulk-Overlay"
  Match:
    ACL rule matching IPv6 bulk-data subnets or applications
    Protocol: TCP
    Destination: Internal IPv6 subnets
  Service Level Objective (SLO):
    Loss: < 5%
  Link Bonding Policy:
    Mode: High Efficiency
```

## IPv6 Tunnel Configuration

```bash
# EdgeConnect tunnels are built from WAN interface labels and overlay policy.
# In modern deployments, IPSec over UDP is the default tunnel mode.

# Check tunnel state and endpoints
show tunnel summary
show tunnel peers
show tunnel <tunnel-name> configured
show tunnel <tunnel-name> ipsec status
show tunnel <tunnel-name> stats latency

# Configure a WAN interface with IPv6 addressing
# In Orchestrator UI:
# Configuration > Networking > Deployment
# WAN IP: 2001:db8:200::10/64 (if ISP provides IPv6 WAN)
# Next Hop: 2001:db8:200::1
# Local WAN Label: Broadband-IPv6

# The default UDP destination port for tunnel UDP mode is 4163.
```

## Monitor IPv6 Traffic with EdgeConnect APIs

```python
#!/usr/bin/env python3
# silverpeak_ipv6_monitor.py - Monitor IPv6 via EdgeConnect appliance APIs

import csv
import io
import tarfile
import requests

EDGE_URL = "https://edgeconnect.example.com/rest/json"
USERNAME = "api-user"
PASSWORD = "password"
TIMEOUT = (5, 30)
VERIFY_SSL = True

def get_session():
    """Authenticate to the EdgeConnect appliance API."""
    session = requests.Session()
    resp = session.post(
        f"{EDGE_URL}/login",
        json={"user": USERNAME, "password": PASSWORD},
        timeout=TIMEOUT,
        verify=VERIFY_SSL,
    )
    resp.raise_for_status()

    csrf_token = session.cookies.get("edgeosCsrfToken")
    if csrf_token:
        session.headers.update({"X-XSRF-Token": csrf_token})

    return session

def has_ipv6_value(record):
    """Return True when any field in an API record contains an IPv6 address."""
    return any(":" in str(value) for value in record.values())

def get_ipv6_flows(session):
    """Get active IPv6 flows from the appliance."""
    resp = session.get(
        f"{EDGE_URL}/flows",
        params={"filter": "all", "uptime": "last5m"},
        timeout=TIMEOUT,
        verify=VERIFY_SSL,
    )
    resp.raise_for_status()
    payload = resp.json()

    if isinstance(payload, list):
        records = payload
    elif isinstance(payload, dict):
        records = next(
            (value for value in payload.values() if isinstance(value, list)),
            []
        )
    else:
        records = []

    return [
        record for record in records
        if isinstance(record, dict) and has_ipv6_value(record)
    ]

def get_latest_minute_stats(session):
    """Download the latest per-minute statistics archive."""
    range_resp = session.get(
        f"{EDGE_URL}/stats/minuteRange",
        timeout=TIMEOUT,
        verify=VERIFY_SSL,
    )
    range_resp.raise_for_status()
    newest = range_resp.json()["newest"]

    stats_resp = session.get(
        f"{EDGE_URL}/stats/minuteStats/st2-{newest}.tgz",
        timeout=TIMEOUT,
        verify=VERIFY_SSL,
    )
    stats_resp.raise_for_status()
    return stats_resp.content

def print_ipv6_flow_rows(stats_tgz):
    """Print IPv6 rows from flow.csv in the minute statistics archive."""
    with tarfile.open(fileobj=io.BytesIO(stats_tgz), mode="r:gz") as archive:
        flow_member = next(
            (member for member in archive.getmembers()
             if member.name.endswith("flow.csv")),
            None,
        )
        if not flow_member:
            print("flow.csv was not present in the minute stats archive")
            return

        flow_file = archive.extractfile(flow_member)
        if flow_file is None:
            print("flow.csv could not be read from the minute stats archive")
            return

        data = flow_file.read().decode("utf-8", errors="replace")
        rows = [
            row for row in csv.DictReader(io.StringIO(data))
            if has_ipv6_value(row)
        ]

    print(f"IPv6 flow rows in latest minute stats: {len(rows)}")
    for row in rows[:10]:
        print(row)

if __name__ == '__main__':
    session = get_session()
    try:
        flows = get_ipv6_flows(session)
        print(f"Active IPv6 flows: {len(flows)}")

        for flow in flows[:10]:
            print(flow)

        print_ipv6_flow_rows(get_latest_minute_stats(session))
    finally:
        session.post(
            f"{EDGE_URL}/logout",
            timeout=TIMEOUT,
            verify=VERIFY_SSL,
        )
```

## Quality of Service for IPv6

```bash
# EdgeConnect QoS for IPv6 traffic
# Configure traffic class and DSCP handling in:
# Configuration > Overlays & Security > Business Intent Overlays

# QoS classes for IPv6:
# Class EF: VoIP RTP (DSCP EF, port 10000-20000)
# Class AF41: Video (DSCP AF41)
# Class CS3: SIP signaling (DSCP CS3)
# Class BE: Best effort

# Apply DSCP-based QoS policy via CLI
qos-map IPv6-QoS 10 match dscp ef
qos-map IPv6-QoS 10 set traffic-class 1 lan-qos trust-lan wan-qos ef
qos-map IPv6-QoS 20 match dscp af41
qos-map IPv6-QoS 20 set traffic-class 2 lan-qos trust-lan wan-qos af41
qos-map IPv6-QoS activate

# Verify QoS configuration and tunnel QoS statistics
show qos-map IPv6-QoS
show qos-map IPv6-QoS stats
show tunnel <tunnel-name> stats qos ef
```

HPE Aruba EdgeConnect SD-WAN IPv6 deployment centers on configuring IPv6-enabled LAN interfaces with Router Advertisements for client addressing, defining Business Intent Overlays that match IPv6 flows for intelligent path selection, and leveraging the Orchestrator's centralized policy management to ensure consistent IPv6 QoS and routing across all branch sites.
