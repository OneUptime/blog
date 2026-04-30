# How to Fix 'Network Unreachable' Errors Due to Missing Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Unreachable, Routing, Ip route, OSPF, Troubleshooting

Description: Learn how to diagnose and fix 'Network Unreachable' ICMP errors caused by missing routes in routing tables, preventing packets from reaching their destination networks.

## What "Network Unreachable" Means

Unlike "Request Timed Out" where packets are sent but no reply comes back, the local `connect: Network is unreachable` error means the host has no route to the destination. The OS returns that error without sending the packet. An ICMP "Destination Network Unreachable" can also come from an upstream router that has no route.

```bash
ping 10.20.30.1
# connect: Network is unreachable   <- Local routing table has no route

# vs

ping 10.20.30.1
# From 192.168.1.1 icmp_seq=1 Destination Network Unreachable

# This version comes from a REMOTE router - it has no route
```

## Step 1: Check the Local Routing Table

```bash
# Linux - show all routes
ip route show
route -n   # Older syntax

# Check specific destination
ip route get 10.20.30.1
# Output: "RTNETLINK answers: Network is unreachable" = no route exists

# Windows
route print -4
# Or
netstat -rn

# Check if default route exists
ip route show default
# 'default via 192.168.1.1 dev eth0' - this is your default gateway
# If missing, traffic to destinations without a more specific route will fail
```

## Step 2: Add a Missing Default Route

```bash
# Linux - add default gateway
sudo ip route add default via 192.168.1.1 dev eth0

# Verify
ip route show default
ping 8.8.8.8

# Make persistent (netplan)
# In the eth0 section of /etc/netplan/01-netcfg.yaml:
# network:
#   ethernets:
#     eth0:
#       routes:
#         - to: default
#           via: 192.168.1.1
sudo netplan apply
```

```cmd
REM Windows - add default gateway
route add 0.0.0.0 mask 0.0.0.0 192.168.1.1

REM Permanent (persist across reboots)
route -p add 0.0.0.0 mask 0.0.0.0 192.168.1.1

REM Or via PowerShell
New-NetRoute -InterfaceAlias "Ethernet" -DestinationPrefix "0.0.0.0/0" -NextHop 192.168.1.1
```

## Step 3: Add a Missing Specific Route

```bash
# Route to a specific network (e.g., remote office at 10.20.0.0/16)
sudo ip route add 10.20.0.0/16 via 192.168.1.254 dev eth0

# Verify reachability
ip route get 10.20.30.1
# Should show: 10.20.30.1 via 192.168.1.254 dev eth0

# Make permanent (NetworkManager)
nmcli con mod "Wired connection 1" +ipv4.routes "10.20.0.0/16 192.168.1.254"
nmcli con up "Wired connection 1"
```

## Step 4: Fix Missing Routes on Cisco Routers

```text
! Check routing table for missing prefix
Router# show ip route 10.20.30.0

! If "% Subnet not in table" - route is missing
! Add static route
Router(config)# ip route 10.20.30.0 255.255.255.0 192.168.1.254

! Or, if this static route should be advertised into OSPF
Router(config)# router ospf 1
Router(config-router)# redistribute static subnets

! Verify
Router# show ip route 10.20.30.0
Router# ping 10.20.30.1 source GigabitEthernet0/0
```

## Step 5: Fix OSPF/BGP Route Missing

```bash
# If a network should appear via dynamic routing but doesn't:

# Check OSPF neighbors
vtysh -c "show ip ospf neighbor"
# Expected adjacencies should reach Full
# (on broadcast/NBMA networks, some neighbors may stay 2-Way)

# Check the OSPF database and OSPF routing table
vtysh -c "show ip ospf database"
vtysh -c "show ip ospf route"

# Check BGP
vtysh -c "show bgp ipv4 unicast summary"
vtysh -c "show bgp ipv4 unicast 10.20.30.0/24"

# If route is in BGP but not in routing table:
vtysh -c "show ip route 10.20.30.0/24"
# In summary output, "(Policy)" means missing import/export policy
# Also inspect the prefix for next-hop reachability or bestpath issues
```

## Step 6: Diagnose with Traceroute

```bash
# Help narrow down where forwarding or replies stop
traceroute 10.20.30.1

# If you see:
# 1  192.168.1.1  1ms
# 2  10.0.0.1     2ms
# 3  * * *        (timeout)
# 4  * * *        (timeout)

# The break may be at 10.0.0.1 or farther downstream
# Asterisks can also mean filtered or rate-limited ICMP replies
# If 10.0.0.1 is the last responding hop, start there and check its route to 10.20.30.0
```

## Step 7: Persistent Route Script

```bash
#!/bin/bash
# /etc/network/if-up.d/add-routes
# Runs when interface comes up (ifupdown-based systems)

if [ "$IFACE" = "eth0" ]; then
    # Add corporate network routes
    ip route add 10.20.0.0/16 via 192.168.1.254 dev eth0 2>/dev/null
    ip route add 172.16.0.0/12 via 192.168.1.254 dev eth0 2>/dev/null
    echo "Custom routes added"
fi
```

```bash
chmod +x /etc/network/if-up.d/add-routes
```

## Conclusion

"Network Unreachable" often means the local routing table lacks a path to the destination, though an upstream router can also return an ICMP network unreachable. Check with `ip route get [destination]` and add missing routes with `ip route add` (Linux) or `route add` (Windows). For permanent routes, update netplan/NetworkManager configs or Cisco running config with `write memory`. If routes should come from OSPF or BGP, verify neighbor adjacency and check for policy or route-map filters suppressing the prefix.
