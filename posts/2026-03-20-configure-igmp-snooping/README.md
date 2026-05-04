# How to Configure IGMP Snooping on a Network Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IGMP, Snooping, Multicast, Switch, Cisco, Networking

Description: Configure IGMP snooping on managed network switches to prevent multicast flooding, limit multicast traffic to only ports with interested receivers, and reduce network congestion.

## Introduction

Without IGMP snooping, a switch treats multicast frames like broadcasts and floods them to all ports on the VLAN. IGMP snooping allows the switch to "snoop" on IGMP membership messages between hosts and routers, building a table of which ports have joined which multicast groups. The switch then forwards multicast traffic only to ports that have active group members, eliminating unnecessary flooding and reducing bandwidth consumption.

## How IGMP Snooping Works

```text
Without IGMP Snooping:
  Host A sends UDP multicast to 239.1.1.1
  Switch floods to ALL ports in the VLAN
  All hosts receive the traffic (even uninterested ones)

With IGMP Snooping:
  1. Host B sends IGMP Join for 239.1.1.1
  2. Switch sees IGMP Join on Port 3 → records: 239.1.1.1 → Port 3
  3. Host A sends multicast to 239.1.1.1
  4. Switch forwards ONLY to Port 3 (and mrouter port)
  5. Ports 1, 2, 4, 5 do NOT receive the multicast

Switch IGMP Snooping Table:
  VLAN 10:
    Group 239.1.1.1 → Ports: Gi0/3, Gi0/7
    Group 239.1.1.2 → Ports: Gi0/2
    Group 224.0.0.251 → Ports: Gi0/1, Gi0/3, Gi0/5

Mrouter port:
  Port connected to multicast router receives ALL multicast
  Detected by IGMP queries from router
```

## Enable IGMP Snooping on Cisco IOS

```text
! Cisco IOS switch IGMP snooping configuration:

! Enable globally (usually enabled by default):
ip igmp snooping

! Enable on specific VLAN:
ip igmp snooping vlan 10

! Disable on specific VLAN (if multicast flooded intentionally):
no ip igmp snooping vlan 20

! View IGMP snooping status:
show ip igmp snooping

! View multicast groups per VLAN:
show ip igmp snooping groups
show ip igmp snooping groups vlan 10

! View mrouter ports:
show ip igmp snooping mrouter
show ip igmp snooping mrouter vlan 10

! Statically configure mrouter port:
ip igmp snooping vlan 10 mrouter interface GigabitEthernet0/1
```

## Configure IGMP Querier

```text
! IGMP querier sends periodic membership queries
! Required if no multicast router is present

! Enable IGMP querier on Cisco switch:
ip igmp snooping querier
ip igmp snooping vlan 10 querier address 192.168.10.1

! Set query interval (default 60 seconds):
ip igmp snooping vlan 10 querier query-interval 30

! Verify querier:
show ip igmp snooping querier
show ip igmp snooping querier vlan 10

! Output:
! Vlan  IP Address  IGMP Version  Port    State  Uptime  Expires
! 10    192.168.10.1    v2       Local   Active  00:30:00  00:00:59
```

## IGMP Snooping on Linux Bridge

```bash
# Linux kernel bridge supports IGMP snooping:

# Check if IGMP snooping is enabled on bridge:

cat /sys/class/net/br0/bridge/multicast_snooping
# 1 = enabled, 0 = disabled

# Enable IGMP snooping:
echo 1 > /sys/class/net/br0/bridge/multicast_snooping

# Or via ip command:
ip link set dev br0 type bridge mcast_snooping 1

# Set IGMP query interval (in centiseconds, 1/100 second):
echo 12500 > /sys/class/net/br0/bridge/multicast_query_interval
# 12500 centiseconds = 125 seconds (kernel default)

# Enable multicast querier:
echo 1 > /sys/class/net/br0/bridge/multicast_querier

# View IGMP multicast database on bridge:
bridge mdb show
# Output shows group memberships per port

# Via ip command:
ip mdb show dev br0

# Persist via systemd-networkd (MulticastSnooping= belongs in a .netdev file):
cat > /etc/systemd/network/10-br0.netdev << 'EOF'
[NetDev]
Name=br0
Kind=bridge

[Bridge]
MulticastSnooping=yes
MulticastQuerier=yes
EOF
```

## IGMP Snooping on Open vSwitch (OVS)

```bash
# Open vSwitch IGMP snooping:

# Enable mcast snooping on bridge:
ovs-vsctl set bridge br0 mcast_snooping_enable=true

# View multicast groups:
ovs-appctl mcast-snooping/show br0

# Output format:
# port  VLAN  GROUP           Age
# eth1  10    239.1.1.1       150

# Disable flooding of unregistered multicast on the bridge:
ovs-vsctl set bridge br0 other_config:mcast-snooping-disable-flood-unregistered=true
# Or per port:
ovs-vsctl set port eth2 other_config:mcast-snooping-flood=false

# Check OVS version supports mcast snooping:
ovs-vsctl --version
# Requires OVS 2.4+
```

## Verify IGMP Snooping is Working

```bash
# Method 1: Check multicast traffic on a port NOT in the group
# Before IGMP snooping: traffic visible on all ports
# After IGMP snooping: traffic only visible on ports with members

# On a host NOT joined to 239.1.1.1:
tcpdump -i eth0 -n 'dst 239.1.1.1'
# Should see NO traffic if snooping works correctly

# Method 2: Watch IGMP snooping table population
# On Cisco:
watch -n 5 "show ip igmp snooping groups vlan 10"

# Method 3: Send multicast and monitor which ports receive it
# (requires physical access or port mirroring)

# On Linux bridge:
watch -n 2 "bridge mdb show"
# Should update when hosts join/leave groups
```

## Conclusion

IGMP snooping eliminates multicast flooding by tracking IGMP membership messages at the switch. Enable it on all VLANs carrying multicast traffic. Configure an IGMP querier if no multicast router is present - without periodic queries, switches will time out membership entries and flood again. On Linux bridges, use `echo 1 > /sys/class/net/br0/bridge/multicast_snooping` and enable the multicast querier. Verify operation by confirming that multicast traffic does NOT appear on ports with no group members. Use `bridge mdb show` on Linux or `show ip igmp snooping groups` on Cisco to inspect the membership database.
