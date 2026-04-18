# How to View the Routing Table on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Linux, IPv4

Description: Learn how to view and interpret the IPv4 routing table on Linux using ip route, route, and netstat commands.

## Viewing the Routing Table with `ip route`

The modern command for viewing routing tables on Linux is `ip route`:

```bash
# Show main routing table

ip route show

# Shorter alias
ip route

# Resolve hostnames in output (default is numeric)
ip -r route show
```

Sample output:

```text
default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.10 metric 100
192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.10
10.0.0.0/8 via 10.0.0.1 dev eth1 proto static metric 50
```

### Interpreting the Output

| Field | Meaning |
|-------|---------|
| `default` | Default gateway (0.0.0.0/0) |
| `via 192.168.1.1` | Next-hop gateway |
| `dev eth0` | Outgoing interface |
| `proto dhcp/static/kernel` | How route was learned |
| `scope link` | Directly connected network |
| `src 192.168.1.10` | Preferred source IP for packets |
| `metric 100` | Route priority (lower = preferred) |

## Filtering Routes

```bash
# Show only the default route
ip route show default

# Show routes for a specific interface
ip route show dev eth0

# Show routes for a specific protocol
ip route show proto static

# Show routes matching a prefix
ip route show 10.0.0.0/8

# Which route will be used for a specific destination?
ip route get 8.8.8.8
```

Sample output of `ip route get`:

```text
8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.10
    cache
```

## Viewing All Routing Tables

Linux supports multiple routing tables. View all:

```bash
# View specific table by number
ip route show table main       # Table 254 (default)
ip route show table local      # Table 255 (local/loopback routes)
ip route show table default    # Table 253

# List all routes in all tables
ip route show table all
```

## Legacy Commands

```bash
# Using route (from net-tools)
route -n

# Using netstat
netstat -rn
```

Sample `route -n` output:

```text
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         192.168.1.1     0.0.0.0         UG    100    0        0 eth0
192.168.1.0     0.0.0.0         255.255.255.0   U     100    0        0 eth0
10.0.0.0        10.0.0.1        255.0.0.0       UG    50     0        0 eth1
```

### Route Flags

| Flag | Meaning |
|------|---------|
| U | Route is up |
| G | Uses a gateway (not directly connected) |
| H | Route to a host (specific IP, not network) |
| ! | Route is rejected |

## Python: Parsing the Routing Table

```python
import subprocess

def get_routes():
    result = subprocess.run(['ip', 'route', 'show'], capture_output=True, text=True)
    routes = []
    for line in result.stdout.strip().split('\n'):
        if line:
            routes.append(line.strip())
    return routes

for route in get_routes():
    print(route)
```

## Key Takeaways

- `ip route show` is the modern way to view the routing table on Linux.
- `ip route get DEST` shows which route will be used for a specific destination.
- `proto kernel` routes are automatically created for directly connected interfaces.
- Lower metric values indicate more preferred routes.

**Related Reading:**

- [How to Add a Static Route on Linux](https://oneuptime.com/blog/post/2026-03-20-add-static-route-linux/view)
- [How to Configure a Default Gateway on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-default-gateway-linux/view)
- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
