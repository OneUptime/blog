# How to Monitor Open vSwitch with ovs-vsctl on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Open vSwitch, Monitoring, SDN

Description: Use ovs-vsctl, ovs-ofctl, and ovs-appctl to monitor and inspect Open vSwitch configuration, flow tables, statistics, and runtime behavior on Ubuntu.

---

Effective OVS monitoring requires knowing which tools to use for which tasks. The three main tools are `ovs-vsctl` (manages the OVS database and configuration), `ovs-ofctl` (manages OpenFlow flows and views statistics), and `ovs-appctl` (communicates with the running OVS daemon for runtime diagnostics). Together, they cover everything from static configuration inspection to live traffic analysis.

## The Three Main OVS Tools

| Tool | Purpose |
|---|---|
| `ovs-vsctl` | Manages the OVS configuration database (bridges, ports, interfaces) |
| `ovs-ofctl` | Interacts with the OpenFlow component (flows, statistics) |
| `ovs-appctl` | Sends commands to the running OVS daemon |

## Checking Overall Configuration

```bash
# The most useful single command - shows everything
sudo ovs-vsctl show

# List all bridges
sudo ovs-vsctl list-br

# List all ports on a bridge
sudo ovs-vsctl list-ports br0

# List all interfaces on a bridge
sudo ovs-vsctl list-ifaces br0

# Get a specific configuration value
sudo ovs-vsctl get bridge br0 fail_mode
sudo ovs-vsctl get port bond0 bond_mode
sudo ovs-vsctl get interface eth0 admin_state
sudo ovs-vsctl get interface eth0 link_state
```

## Checking Interface Link State

```bash
# Check if physical interfaces are up
sudo ovs-vsctl get interface eth0 link_state
sudo ovs-vsctl get interface eth0 admin_state

# Check link speed
sudo ovs-vsctl get interface eth0 link_speed

# Check all interface states at once
sudo ovs-vsctl list interface | grep -E "name|link_state|admin_state"
```

## Viewing Port Statistics with ovs-ofctl

```bash
# Show per-port statistics (packets, bytes, errors)
sudo ovs-ofctl dump-ports br0

# Sample output:
# OFPST_PORT reply (xid=0x2):
#   port  1: rx pkts=12345, bytes=1234567, drop=0, errs=0, frame=0, over=0, crc=0
#            tx pkts=9876, bytes=987654, drop=0, errs=0, coll=0

# Show port descriptions (human-readable port names and speeds)
sudo ovs-ofctl dump-ports-desc br0

# Show port stats by name
sudo ovs-ofctl dump-ports br0 | grep -A5 "port LOCAL"
```

## Inspecting Flow Tables

```bash
# Show all flows (the OpenFlow forwarding rules)
sudo ovs-ofctl dump-flows br0

# Show flows with statistics (packet/byte counts per flow)
sudo ovs-ofctl dump-flows br0 | grep -v "n_packets=0"

# Show flows sorted by packet count (most active first)
sudo ovs-ofctl dump-flows br0 | sort -t, -k2 -n -r | head -20

# Show flows for a specific table
sudo ovs-ofctl dump-flows br0 table=0

# Show flows matching a specific pattern
sudo ovs-ofctl dump-flows br0 "dl_vlan=100"
sudo ovs-ofctl dump-flows br0 "nw_src=10.0.0.0/24"
```

## Monitoring the MAC Learning Table

OVS learns which MAC addresses are on which ports, like a hardware switch.

```bash
# Show the forwarding database (learned MAC-to-port mappings)
sudo ovs-appctl fdb/show br0

# Sample output:
# port  VLAN  MAC                Age
#    1   100  aa:bb:cc:dd:ee:ff    3
#    2   200  11:22:33:44:55:66   15
#    0     0  ff:ff:ff:ff:ff:ff    0

# Flush the MAC learning table (causes brief traffic flood as OVS relearns)
sudo ovs-appctl fdb/flush br0
```

## Checking Bond Status

```bash
# Show comprehensive bond status
sudo ovs-appctl bond/show

# Show specific bond
sudo ovs-appctl bond/show bond0

# Check LACP status (for balance-tcp bonds)
sudo ovs-appctl lacp/show

# Show LACP per-port details
sudo ovs-appctl lacp/show bond0
```

## Monitoring VLAN Configuration

```bash
# Show VLAN membership for all ports
sudo ovs-vsctl list port | grep -E "name|tag|trunks|vlan_mode"

# Get VLAN tag for a specific port
sudo ovs-vsctl get port vm0 tag

# Get trunk VLAN list for a trunk port
sudo ovs-vsctl get port eth0 trunks

# Show VLAN statistics using OpenFlow
sudo ovs-ofctl dump-flows br0 "dl_vlan=100"
```

## Checking the OVS Datapath

The OVS datapath is the kernel component that actually forwards packets. Monitoring it shows low-level forwarding activity.

```bash
# Show datapath statistics
sudo ovs-dpctl show

# Show datapath flows (kernel-level, not OpenFlow)
sudo ovs-dpctl dump-flows

# Show datapath statistics with hit counts
sudo ovs-dpctl show --statistics

# Check if the kernel datapath module is loaded
lsmod | grep openvswitch
```

## Tracing Packet Path Through OVS

The `ofproto/trace` command simulates how OVS would handle a specific packet - extremely useful for debugging flow tables.

```bash
# Trace how OVS would handle a packet from port 1 with specific fields
sudo ovs-appctl ofproto/trace br0 \
  "in_port=1,dl_src=aa:bb:cc:dd:ee:ff,dl_dst=11:22:33:44:55:66,dl_type=0x800,nw_src=10.0.0.1,nw_dst=10.0.0.2"

# Trace a VLAN-tagged packet
sudo ovs-appctl ofproto/trace br0 \
  "in_port=eth0,dl_vlan=100,dl_src=aa:bb:cc:dd:ee:ff,dl_dst=11:22:33:44:55:66"

# The output shows which flow rules matched and what actions were taken
```

## Monitoring with ovs-vswitchd Logs

```bash
# View real-time OVS daemon logs
sudo tail -f /var/log/openvswitch/ovs-vswitchd.log

# Increase log verbosity for debugging
sudo ovs-appctl vlog/set dbg

# Increase verbosity for a specific module only
sudo ovs-appctl vlog/set ofproto:dbg

# Return to normal verbosity
sudo ovs-appctl vlog/set info

# List available log modules and their current levels
sudo ovs-appctl vlog/list
```

## Checking Controller Connectivity

If you are using an OpenFlow controller, check its connection status.

```bash
# Show controller connection status
sudo ovs-vsctl get-controller br0
sudo ovs-ofctl show br0

# Check if controller is connected
sudo ovs-vsctl get bridge br0 controller
sudo ovs-vsctl list controller

# Show connection details
sudo ovs-appctl ofproto/list-tunnels
```

## Performance Monitoring

```bash
# Check CPU usage by OVS processes
ps aux | grep -E "ovs-vswitchd|ovsdb-server"

# Check memory usage
sudo ovs-appctl memory/show

# Show dpif statistics (datapath packet processing rates)
sudo ovs-appctl dpif/show

# Show detailed statistics on flows in the datapath
sudo ovs-dpctl dump-flows -m | head -50
```

## Creating a Quick Status Dashboard Script

```bash
#!/bin/bash
# ovs-status.sh - Quick OVS health overview

echo "=== OVS Status $(date) ==="
echo ""

echo "--- Bridges ---"
sudo ovs-vsctl list-br

echo ""
echo "--- Interface States ---"
for bridge in $(sudo ovs-vsctl list-br); do
    echo "Bridge: $bridge"
    for iface in $(sudo ovs-vsctl list-ifaces $bridge 2>/dev/null); do
        state=$(sudo ovs-vsctl get interface "$iface" link_state 2>/dev/null | tr -d '"')
        echo "  $iface: $state"
    done
done

echo ""
echo "--- Bond Status ---"
sudo ovs-appctl bond/show 2>/dev/null || echo "No bonds configured"

echo ""
echo "--- Active Flows (non-zero packet count) ---"
for bridge in $(sudo ovs-vsctl list-br); do
    echo "Bridge: $bridge"
    sudo ovs-ofctl dump-flows "$bridge" 2>/dev/null | grep -v "n_packets=0" | grep -v "OFPST" | head -10
done

echo ""
echo "--- MAC Table ---"
for bridge in $(sudo ovs-vsctl list-br); do
    echo "Bridge: $bridge"
    sudo ovs-appctl fdb/show "$bridge" 2>/dev/null | head -20
done
```

```bash
chmod +x /usr/local/bin/ovs-status.sh
sudo ovs-status.sh
```

These monitoring commands give you complete visibility into OVS operation, from high-level configuration down to per-packet forwarding decisions. In production, set up regular collection of port statistics and flow hit counts to track trends over time.
