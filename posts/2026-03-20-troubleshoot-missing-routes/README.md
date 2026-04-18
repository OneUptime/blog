# How to Troubleshoot Missing Routes in the Routing Table

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Routing, Troubleshooting, OSPF, BGP

Description: Systematically diagnose why expected routes are missing from the routing table, covering static routes, OSPF, BGP, and kernel route management.

## Introduction

A missing route is one of the most common networking problems. Traffic to a destination fails because the router has no entry for that prefix, causing packets to be dropped or sent via a default route to the wrong place. The troubleshooting approach depends on the route source: static, OSPF, or BGP.

## Step 1: Verify the Route is Missing

```bash
# Check the main routing table

ip route show

# Search for a specific prefix
ip route show 10.20.0.0/24

# Check all tables (policy routing may put routes elsewhere)
ip route show table all | grep "10.20.0"

# Check local table (for connected/loopback routes)
ip route show table local
```

## Step 2: Static Route Missing

```bash
# Check if the static route was ever added
# (Netplan/NetworkManager/systemd-networkd install routes as "proto static";
#  bare "ip route add" without explicit proto defaults to "proto boot")
ip route show | grep -E "proto (static|boot)"

# Try adding it manually
ip route add 10.20.0.0/24 via 192.168.1.1

# Common errors:
# "RTNETLINK answers: Network is unreachable"
#   -> Next-hop 192.168.1.1 is not reachable from any interface
# "RTNETLINK answers: File exists"
#   -> Route already exists (check ip route show)

# Verify the persistent config (Netplan, interfaces, etc.)
cat /etc/netplan/*.yaml | grep -A5 "routes"
```

## Step 3: OSPF Route Missing

```bash
# Check OSPF neighbor state - must be FULL for route exchange
vtysh -c "show ip ospf neighbor"

# Check if OSPF has the route in its own database
vtysh -c "show ip ospf route" | grep "10.20.0"

# Check the OSPF LSA database to confirm the prefix is being advertised
vtysh -c "show ip ospf database"

# Check for OSPF interface state
vtysh -c "show ip ospf interface eth0"
# Should show: State DR/BDR/DROther (broadcast), Point-to-Point, or Loopback — not Down
```

## Step 4: BGP Route Missing

```bash
# Check if BGP received the prefix at all
vtysh -c "show ip bgp 10.20.0.0/24"

# Check if BGP neighbor is established
vtysh -c "show ip bgp summary"

# Route may be in BGP table but not best path (check for > marker)
# If not best, it won't be installed in the kernel

# Check if a route-map is filtering the route
# (requires "neighbor 10.0.0.2 soft-reconfiguration inbound" to be configured)
vtysh -c "show ip bgp neighbor 10.0.0.2 received-routes" | grep "10.20.0"
```

## Step 5: Kernel Route Not Installed

```bash
# FRR may have the route but fail to install in kernel
# Check FRR's own RIB
vtysh -c "show ip route 10.20.0.0/24"

# Compare with kernel table
ip route show 10.20.0.0/24

# If FRR has it but kernel doesn't, check for conflicts with higher-preference routes
# or kernel route installation errors in syslog
journalctl -u frr --since "1 hour ago" | grep -i "route\|error"
```

## Step 6: Route Flapping

```bash
# Check for routes appearing and disappearing
ip monitor route 2>&1 | tee /tmp/route-monitor.log

# Run for a few minutes, then check
grep "10.20.0" /tmp/route-monitor.log
```

## Conclusion

Missing routes follow a clear troubleshooting path: verify the table, identify the route source, then diagnose that source specifically. For static routes check configuration persistence; for OSPF check neighbor state and LSA propagation; for BGP check session state, policy filters, and best-path selection. Each layer has its own verification command.
