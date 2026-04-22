# How to Monitor IPv4 Routing Table Changes with SNMP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SNMP, Routing Table, IPv4, Monitoring, Python, Network Management

Description: Learn how to use SNMP to poll and monitor IPv4 routing table changes on network devices, detecting new routes, removed routes, and next-hop changes.

## SNMP OIDs for IPv4 Routing Table

The IP-FORWARD-MIB provides access to the IPv4 CIDR routing table. RFC 4292 deprecates this table in favor of `inetCidrRouteTable`, but many IPv4-only implementations still expose `ipCidrRouteTable`:

| OID | Name | Description |
|---|---|---|
| `1.3.6.1.2.1.4.24.4.1.1` | ipCidrRouteDest | Destination network |
| `1.3.6.1.2.1.4.24.4.1.2` | ipCidrRouteMask | Subnet mask |
| `1.3.6.1.2.1.4.24.4.1.4` | ipCidrRouteNextHop | Next-hop IP address |
| `1.3.6.1.2.1.4.24.4.1.6` | ipCidrRouteType | 1=other, 2=reject, 3=local, 4=remote |
| `1.3.6.1.2.1.4.24.4.1.7` | ipCidrRouteProto | Protocol (1=other, 8=RIP, 13=OSPF, 14=BGP) |
| `1.3.6.1.2.1.4.24.4.1.8` | ipCidrRouteAge | Seconds since added/updated |
| `1.3.6.1.2.1.4.24.4.1.11` | ipCidrRouteMetric1 | Route metric |

## Step 1: Walk the Routing Table via SNMP

```bash
# Walk the CIDR routing table

snmpwalk -v2c -c public 192.168.1.1 ipCidrRouteTable

# Or use the MIB name directly
snmpwalk -v2c -c public 192.168.1.1 IP-FORWARD-MIB::ipCidrRouteDest

# Walk the route entry subtree to include destination and next-hop columns
snmpbulkwalk -v2c -c public 192.168.1.1 \
  1.3.6.1.2.1.4.24.4.1
```

## Step 2: Python Script to Monitor Routing Table Changes

```python
#!/usr/bin/env python3
"""
routing_table_monitor.py
Polls SNMP routing table and alerts on changes
Requires: pip install pysnmp
"""
import asyncio
import ipaddress
from pysnmp.hlapi.v3arch.asyncio import *

ROUTER_IP = '192.168.1.1'
COMMUNITY = 'public'
POLL_INTERVAL = 60  # seconds

# OIDs for routing table
OID_DEST     = '1.3.6.1.2.1.4.24.4.1.1'
OID_MASK     = '1.3.6.1.2.1.4.24.4.1.2'
OID_NEXTHOP  = '1.3.6.1.2.1.4.24.4.1.4'
OID_PROTO    = '1.3.6.1.2.1.4.24.4.1.7'

PROTO_NAMES = {
    1: 'other',
    2: 'local',
    3: 'static',
    4: 'ICMP',
    8: 'RIP',
    9: 'IS-IS',
    13: 'OSPF',
    14: 'BGP',
    16: 'EIGRP',
}


def parse_route_index(name, base_oid):
    """Return the destination/mask/TOS key from an ipCidrRoute OID."""
    oid = str(name)
    prefix = f"{base_oid}."
    if not oid.startswith(prefix):
        return None

    parts = oid[len(prefix):].split('.')
    if len(parts) < 13:
        return None

    # ipCidrRouteTable index: dest(4), mask(4), tos(1), nextHop(4)
    return '.'.join(parts[:9])


def route_label(route):
    """Format destination and mask as a CIDR prefix when both are available."""
    dest = route.get('dest', 'unknown')
    mask = route.get('mask')
    if mask:
        try:
            return str(ipaddress.IPv4Network(f"{dest}/{mask}", strict=False))
        except ValueError:
            pass
    return dest


async def get_routing_table(ip, community):
    """Walk SNMP routing table and return as a dict."""
    routes = {}
    snmp_engine = SnmpEngine()
    target = await UdpTransportTarget.create((ip, 161), timeout=10)

    for oid, val in [(OID_DEST, 'dest'), (OID_MASK, 'mask'), (OID_NEXTHOP, 'nexthop'), (OID_PROTO, 'proto')]:
        async for (error_indication, error_status, error_index, var_binds) in walk_cmd(
            snmp_engine,
            CommunityData(community, mpModel=1),
            target,
            ContextData(),
            ObjectType(ObjectIdentity(oid)),
            lexicographicMode=False,
            lookupMib=False
        ):
            if error_indication:
                break
            if error_status:
                break

            for name, value in var_binds:
                route_key = parse_route_index(name, oid)
                if route_key is None:
                    continue

                if route_key not in routes:
                    routes[route_key] = {'nexthops': set()}

                if val == 'nexthop':
                    routes[route_key]['nexthops'].add(str(value))
                else:
                    routes[route_key][val] = str(value)

    for route in routes.values():
        if 'nexthops' in route:
            route['nexthop'] = ','.join(sorted(route.pop('nexthops')))

    return routes


async def main():
    # Initial snapshot
    prev_routes = await get_routing_table(ROUTER_IP, COMMUNITY)
    print(f"Initial routing table: {len(prev_routes)} routes")

    while True:
        await asyncio.sleep(POLL_INTERVAL)
        curr_routes = await get_routing_table(ROUTER_IP, COMMUNITY)

        # Detect added routes
        added = set(curr_routes.keys()) - set(prev_routes.keys())
        for key in added:
            r = curr_routes[key]
            print(f"[ADDED] {route_label(r)} via {r.get('nexthop')} "
                  f"({PROTO_NAMES.get(int(r.get('proto', 1)), 'unknown')})")

        # Detect removed routes
        removed = set(prev_routes.keys()) - set(curr_routes.keys())
        for key in removed:
            r = prev_routes[key]
            print(f"[REMOVED] {route_label(r)} via {r.get('nexthop')}")

        # Detect next-hop changes
        for key in set(curr_routes.keys()) & set(prev_routes.keys()):
            if curr_routes[key].get('nexthop') != prev_routes[key].get('nexthop'):
                print(f"[CHANGED] {route_label(curr_routes[key])}: "
                      f"{prev_routes[key].get('nexthop')} -> {curr_routes[key].get('nexthop')}")

        prev_routes = curr_routes
        print(f"Routing table: {len(curr_routes)} routes")


if __name__ == '__main__':
    asyncio.run(main())
```

## Step 3: Run the Monitor

```bash
pip install pysnmp
python3 routing_table_monitor.py

# Expected output during normal operation:
# Initial routing table: 1542 routes
# Routing table: 1542 routes
# Routing table: 1542 routes

# When a change occurs:
# [ADDED] 192.168.50.0/24 via 10.0.0.2 (OSPF)
# [REMOVED] 172.16.5.0/24 via 10.0.0.1
# [CHANGED] 0.0.0.0/0: 203.0.113.1 -> 198.51.100.1
```

## Step 4: Alert on Route Count Thresholds

Monitor the total route count-a sudden drop may indicate a BGP or OSPF failure:

```bash
# Get the total number of IPv4 CIDR routes
snmpget -v2c -c public 192.168.1.1 IP-FORWARD-MIB::ipCidrRouteNumber.0

# Or count entries in the routing table
snmpwalk -v2c -c public 192.168.1.1 ipCidrRouteDest | wc -l
```

## Conclusion

SNMP routing table monitoring detects route changes-additions, removals, and next-hop shifts-that indicate BGP route leaks, OSPF reconvergence, or network failures. Use the Python script as a lightweight monitor that alerts when changes occur, and integrate with your incident management system for automated notifications when the routing table changes unexpectedly.
