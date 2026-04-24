# How to Manage IPv6 Routing with Python pyroute2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Pyroute2, Routing, Linux Networking

Description: Use Python pyroute2 to programmatically manage IPv6 routes, addresses, and interfaces on Linux using netlink sockets without subprocess calls to ip commands.

## Install pyroute2

```bash
pip install pyroute2
```

## Add and Remove IPv6 Addresses

```python
from pyroute2 import IPRoute
import socket

def add_ipv6_address(interface: str, address: str, prefixlen: int):
    """Add an IPv6 address to an interface."""
    with IPRoute() as ipr:
        # Get interface index
        idx = ipr.link_lookup(ifname=interface)[0]

        # Add IPv6 address
        ipr.addr("add",
                 index=idx,
                 address=address,
                 prefixlen=prefixlen,
                 family=socket.AF_INET6)
        print(f"Added {address}/{prefixlen} to {interface}")

def remove_ipv6_address(interface: str, address: str, prefixlen: int):
    """Remove an IPv6 address from an interface."""
    with IPRoute() as ipr:
        idx = ipr.link_lookup(ifname=interface)[0]
        ipr.addr("delete",
                 index=idx,
                 address=address,
                 prefixlen=prefixlen,
                 family=socket.AF_INET6)
        print(f"Removed {address}/{prefixlen} from {interface}")

def list_ipv6_addresses(interface: str):
    """List all IPv6 addresses on an interface."""
    with IPRoute() as ipr:
        idx = ipr.link_lookup(ifname=interface)[0]
        addrs = ipr.get_addr(family=socket.AF_INET6, index=idx)
        for addr in addrs:
            ip = addr.get_attr("IFA_ADDRESS")
            prefix = addr["prefixlen"]
            scope = addr["scope"]
            print(f"  {ip}/{prefix} scope={scope}")

# Example usage (requires root):

# add_ipv6_address("eth0", "2001:db8::1", 64)
# list_ipv6_addresses("eth0")
```

## Manage IPv6 Routes

```python
from pyroute2 import IPRoute
import socket

def add_ipv6_route(prefix: str, prefixlen: int,
                   gateway: str = None, interface: str = None,
                   metric: int = 1024):
    """Add an IPv6 route."""
    with IPRoute() as ipr:
        kwargs = {
            "family": socket.AF_INET6,
            "dst": prefix,
            "dst_len": prefixlen,
            "priority": metric,
        }

        if gateway:
            kwargs["gateway"] = gateway

        if interface:
            idx = ipr.link_lookup(ifname=interface)[0]
            kwargs["oif"] = idx

        ipr.route("add", **kwargs)
        gw_str = gateway or "direct"
        print(f"Added route {prefix}/{prefixlen} via {gw_str}")

def del_ipv6_route(prefix: str, prefixlen: int):
    """Delete an IPv6 route."""
    with IPRoute() as ipr:
        ipr.route("delete",
                  family=socket.AF_INET6,
                  dst=prefix,
                  dst_len=prefixlen)
        print(f"Deleted route {prefix}/{prefixlen}")

def get_ipv6_routes(table: int = 254):
    """List IPv6 routes from routing table."""
    with IPRoute() as ipr:
        routes = ipr.get_routes(family=socket.AF_INET6, table=table)
        for route in routes:
            dst = route.get_attr("RTA_DST") or "::"
            dst_len = route["dst_len"]
            gw = route.get_attr("RTA_GATEWAY")
            oif_idx = route.get_attr("RTA_OIF")
            metric = route.get_attr("RTA_PRIORITY")

            # Resolve interface name
            if oif_idx:
                links = ipr.get_links(oif_idx)
                iface = links[0].get_attr("IFLA_IFNAME") if links else str(oif_idx)
            else:
                iface = "-"

            gw_str = gw or "direct"
            print(f"  {dst}/{dst_len} via {gw_str} dev {iface} metric {metric}")

# Example usage (requires root):
# add_ipv6_route("2001:db8:remote::", 48, gateway="2001:db8::254")
# get_ipv6_routes()
```

## Watch for IPv6 Route Changes

```python
from pyroute2 import IPRSocket
from pyroute2.netlink.rtnl import RTMGRP_IPV6_ROUTE
import select
import socket
import time

def watch_ipv6_routes(duration: int = 30):
    """Monitor IPv6 routing table changes using netlink events."""
    print(f"Watching IPv6 routing changes for {duration}s...")

    with IPRSocket() as ipr:
        # Subscribe only to IPv6 route events
        ipr.bind(groups=RTMGRP_IPV6_ROUTE)
        end_time = time.time() + duration

        while time.time() < end_time:
            timeout = max(0, end_time - time.time())
            readable, _, _ = select.select([ipr], [], [], timeout)
            if not readable:
                break

            for msg in ipr.get():
                if msg["family"] != socket.AF_INET6:
                    continue
                event = msg.get("event", "unknown")
                dst = msg.get_attr("RTA_DST") or "::"
                dst_len = msg.get("dst_len", 0)
                gw = msg.get_attr("RTA_GATEWAY") or "direct"
                print(f"[{event}] {dst}/{dst_len} via {gw}")

# Example:
# watch_ipv6_routes(30)
```

## NDB: Higher-Level Interface

```python
from pyroute2 import NDB
import socket

def configure_interface_ipv6(interface: str, address: str, prefixlen: int,
                              default_gw: str = None):
    """Configure IPv6 on interface using NDB (higher-level API)."""
    with NDB() as ndb:
        with ndb.interfaces[interface] as iface:
            # Add IPv6 address
            iface.add_ip(address=address, prefixlen=prefixlen)
            iface_idx = iface["index"]

        # Add default route if specified
        if default_gw:
            ndb.routes.create(
                family=socket.AF_INET6,
                dst="::/0",
                gateway=default_gw,
                oif=iface_idx,
            ).commit()

        # Read back addresses
        iface = ndb.interfaces[interface]
        print(f"Interface {interface} IPv6 addresses:")
        for addr in iface.ipaddr.summary():
            if ":" in addr.address:  # IPv6 addresses contain colons
                print(f"  {addr.address}/{addr.prefixlen}")

# Example usage (requires root):
# configure_interface_ipv6("eth0", "2001:db8::1", 64, "2001:db8::254")
```

## Conclusion

`pyroute2` provides a Python netlink API to manage Linux IPv6 networking without subprocess calls to `ip`: `IPRoute.addr("add")` adds addresses, `IPRoute.route("add")` installs routes, and `bind()` on an RTNL socket subscribes to route-change events. Use `family=socket.AF_INET6` (value 10) in `IPRoute` calls to restrict operations to IPv6. `NDB` provides a higher-level, transaction-based interface that automatically commits changes. Changing routes, addresses, or interface configuration requires root privileges or `CAP_NET_ADMIN`. Use `pyroute2` for network automation scripts, SDN controllers, and tools that need to programmatically manage Linux IPv6 routing without shelling out.
