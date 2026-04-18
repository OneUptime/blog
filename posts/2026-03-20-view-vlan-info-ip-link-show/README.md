# How to View VLAN Information with ip -d link show

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, Ip link, Linux, 802.1Q, Networking, Inspection, Bridge

Description: Learn how to use the ip -d link show command to inspect VLAN interface details including VLAN ID, parent interface, protocol, and egress/ingress QoS mappings on Linux.

---

The `ip -d link show` command displays detailed interface information including VLAN configuration. The `-d` flag adds protocol-specific details not shown in standard output.

## Basic VLAN Inspection

```bash
# Show all interfaces with detail

ip -d link show

# Show a specific VLAN interface
ip -d link show eth0.100

# Output example:
# 5: eth0.100@eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DEFAULT
#     link/ether aa:bb:cc:dd:ee:ff brd ff:ff:ff:ff:ff:ff promiscuity 0
#     vlan protocol 802.1Q id 100 <REORDER_HDR>
#           ingress-qos-map { }
#           egress-qos-map { }
```

## Understanding the Output

```text
eth0.100@eth0          → VLAN interface name @ parent interface
mtu 1500               → MTU of the VLAN interface
vlan protocol 802.1Q   → VLAN encapsulation protocol
id 100                 → VLAN ID
<REORDER_HDR>          → Reorder headers (normal for VLAN)
ingress-qos-map {}     → DSCP/802.1p ingress QoS mapping (empty = none)
egress-qos-map {}      → 802.1p egress QoS mapping (empty = none)
```

## Listing All VLAN Interfaces

```bash
# List only VLAN interfaces
ip -d link show type vlan

# Show compact view with VLAN IDs
ip -d link show type vlan | grep -E "^[0-9]+:|vlan"
```

## Reading VLAN Config from /proc

```bash
# Legacy interface: /proc/net/vlan/
cat /proc/net/vlan/config
# Output:
# VLAN Dev name    | VLAN ID
# Name-Type: VLAN_NAME_TYPE_RAW_PLUS_VID_NO_PAD
# eth0.10        | 10  | eth0
# eth0.20        | 20  | eth0
# eth0.100       | 100 | eth0

# Per-interface stats
cat /proc/net/vlan/eth0.100
```

## Showing VLAN Bridge Port Information

```bash
# If VLAN interface is attached to a bridge
bridge vlan show

# Output shows VLAN membership per port:
# port    vlan ids
# eth0.10  10
# eth1     20 PVID Egress Untagged
# br0       1
```

## Checking VLAN with JSON Output

```bash
# Machine-readable JSON output
ip -d -j link show type vlan | python3 -m json.tool | grep -E "ifname|vlanid|link"

# Example output:
# "ifname": "eth0.100",
# "link": "eth0",
# "vlanid": 100,
```

## Key Takeaways

- `ip -d link show <iface>` displays VLAN ID, parent interface, protocol (802.1Q), and QoS mappings.
- `ip -d link show type vlan` filters output to only show VLAN interfaces.
- `/proc/net/vlan/config` provides a quick summary of all VLAN interfaces and their IDs.
- Use `bridge vlan show` to see VLAN membership for interfaces connected to a Linux bridge.
