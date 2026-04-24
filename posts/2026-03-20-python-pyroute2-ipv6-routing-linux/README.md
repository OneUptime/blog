# How to Use Python pyroute2 for IPv6 Routing on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Pyroute2, IPv6, Linux, Routing, Netlink, Network Automation

Description: Use pyroute2 to manage IPv6 routes, addresses, and interfaces on Linux using the Netlink API from Python.

## What is pyroute2?

`pyroute2` is a Python library for Linux network management using the Netlink socket API. It provides a programmatic interface to the same functionality as `ip` commands (iproute2).

```bash
pip install pyroute2
```

## Managing IPv6 Addresses

Add, list, and remove IPv6 addresses on interfaces:

```python
import socket
from pyroute2 import IPRoute

with IPRoute() as ipr:
    # Get interface index for eth0
    idx = ipr.link_lookup(ifname="eth0")[0]

    # Add IPv6 address to eth0
    ipr.addr(
        "add",
        index=idx,
        address="2001:db8:1::10",
        prefixlen=64,
        family=socket.AF_INET6
    )
    print("IPv6 address added")

    # List all IPv6 addresses on eth0
    addresses = ipr.get_addr(family=socket.AF_INET6, index=idx)
    for addr in addresses:
        ip = addr.get_attr("IFA_ADDRESS")
        prefix_len = addr["prefixlen"]
        print(f"  {ip}/{prefix_len}")

    # Remove the address
    ipr.addr(
        "delete",
        index=idx,
        address="2001:db8:1::10",
        prefixlen=64,
        family=socket.AF_INET6
    )
    print("IPv6 address removed")
```

## Managing IPv6 Routes

Add, list, and remove IPv6 routes:

```python
import socket
from pyroute2 import IPRoute

with IPRoute() as ipr:
    # Get interface index
    idx = ipr.link_lookup(ifname="eth0")[0]

    # Add a static IPv6 route
    ipr.route(
        "add",
        dst="2001:db8:100::/48",
        dst_len=48,
        gateway="2001:db8:1::1",  # Next hop
        oif=idx,
        family=socket.AF_INET6
    )
    print("Route added")

    # Add a default IPv6 route
    ipr.route(
        "add",
        dst="::",
        dst_len=0,
        gateway="fe80::1",
        oif=idx,
        family=socket.AF_INET6
    )

    # List all IPv6 routes
    routes = ipr.get_routes(family=socket.AF_INET6)
    for route in routes:
        dst = route.get_attr("RTA_DST") or "::"
        prefix_len = route["dst_len"]
        gw = route.get_attr("RTA_GATEWAY") or "(connected)"
        print(f"  {dst}/{prefix_len} via {gw}")

    # Delete a route
    ipr.route(
        "delete",
        dst="2001:db8:100::/48",
        dst_len=48,
        family=socket.AF_INET6
    )
```

## IPv6 Policy Routing

Add routes to specific routing tables (for policy routing):

```python
import socket
from pyroute2 import IPRoute

CUSTOM_TABLE = 200  # Custom routing table ID

with IPRoute() as ipr:
    idx = ipr.link_lookup(ifname="eth1")[0]

    # Add a route to a custom table
    ipr.route(
        "add",
        dst="2001:db8:200::/48",
        dst_len=48,
        gateway="2001:db8:1::1",
        oif=idx,
        family=socket.AF_INET6,
        table=CUSTOM_TABLE
    )

    # Add an ip rule to direct traffic to the custom table
    ipr.rule(
        "add",
        family=socket.AF_INET6,
        src="2001:db8:300::/48",
        table=CUSTOM_TABLE,
        priority=100
    )
```

## Monitoring IPv6 Routing Events

Use Netlink notifications to react to routing changes:

```python
import socket
from pyroute2 import IPRoute

def monitor_ipv6_routes():
    """Monitor IPv6 routing table changes in real-time."""
    with IPRoute() as ipr:
        # Subscribe to RTNL notifications
        ipr.bind()

        print("Monitoring IPv6 routing events...")
        while True:
            messages = ipr.get()
            for msg in messages:
                event = msg.get("event")
                if event not in {"RTM_NEWROUTE", "RTM_DELROUTE"}:
                    continue
                if msg.get("family") != socket.AF_INET6:
                    continue

                dst = msg.get_attr("RTA_DST") or "::"
                prefix_len = msg.get("dst_len", 0)
                print(f"Event: {event} → {dst}/{prefix_len}")

monitor_ipv6_routes()
```

## Getting IPv6 Interface Statistics

```python
from pyroute2 import IPRoute

with IPRoute() as ipr:
    # Get all links with stats
    links = ipr.get_links()
    for link in links:
        ifname = link.get_attr("IFLA_IFNAME")
        stats = link.get_attr("IFLA_STATS64")
        if stats and ifname != "lo":
            rx_bytes = stats["rx_bytes"]
            tx_bytes = stats["tx_bytes"]
            print(f"{ifname}: RX={rx_bytes:,} TX={tx_bytes:,} bytes")
```

## Conclusion

`pyroute2` provides low-level Netlink access to Linux IPv6 routing tables from Python. Combined with Python's `ipaddress` module for address manipulation, it forms the foundation for network automation tools that need to programmatically manage IPv6 routes, addresses, and policy routing rules on Linux systems.
