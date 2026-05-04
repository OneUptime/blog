# How to Configure VLAN Priority (CoS) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, COS, 802.1p, QoS, Linux, VLAN Priority, Ip link, Networking

Description: Learn how to configure 802.1p Class of Service (CoS) priority bits on VLAN interfaces in Linux to ensure VoIP and critical traffic is prioritized across 802.1Q trunks.

---

802.1p CoS uses 3 bits in the 802.1Q tag (PCP field) to mark traffic priority from 0 (lowest) to 7 (highest). Linux supports this via VLAN ingress/egress QoS maps.

## Understanding 802.1p Priority Values

| CoS Value | Traffic Type |
|-----------|-------------|
| 7 | Network control |
| 6 | Internetwork control |
| 5 | Voice (VoIP) |
| 4 | Video |
| 3 | Critical applications |
| 2 | Excellent effort |
| 1 | Background |
| 0 | Best effort (default) |

## Setting VLAN Egress Priority Map

The egress map translates the Linux internal SKB priority to an 802.1p CoS value:

```bash
# Create VLAN interface

ip link add link eth0 name eth0.100 type vlan id 100

# Set egress QoS map: Linux priority → 802.1p CoS
# Syntax: ip link set <iface> type vlan egress-qos-map <linux-prio>:<cos-value>
ip link set eth0.100 type vlan egress-qos-map 0:0   # Best effort → CoS 0
ip link set eth0.100 type vlan egress-qos-map 6:5   # Linux prio 6 → VoIP CoS 5
ip link set eth0.100 type vlan egress-qos-map 7:6   # Linux prio 7 → CoS 6

ip link set eth0.100 up

# Verify
ip -d link show eth0.100
# Output includes:
#   egress-qos-map { 0:0 6:5 7:6 }
```

## Setting VLAN Ingress Priority Map

The ingress map translates incoming 802.1p CoS to Linux SKB priority:

```bash
# Incoming CoS 5 (VoIP) → Linux priority 6
ip link set eth0.100 type vlan ingress-qos-map 5:6
ip link set eth0.100 type vlan ingress-qos-map 6:7
ip link set eth0.100 type vlan ingress-qos-map 0:0

# Verify
ip -d link show eth0.100
# ingress-qos-map { 0:0 5:6 6:7 }
```

## Using tc to Set Priority on Outgoing Packets

```bash
# Mark VoIP traffic (UDP port 5060) with high priority
tc qdisc add dev eth0.100 root handle 1: prio bands 3

tc filter add dev eth0.100 parent 1: prio 1 u32 \
  match ip protocol 17 0xff \
  match ip dport 5060 0xffff \
  action skbedit priority 6   # Sets SKB priority, mapped to CoS via egress-qos-map
```

## Persistent Configuration with systemd-networkd

```ini
# /etc/systemd/network/eth0.100.netdev
[NetDev]
Name=eth0.100
Kind=vlan

[VLAN]
Id=100
GVRP=false
MVRP=false
EgressQOSMaps=0-0 6-5 7-6
IngressQOSMaps=5-6 6-7
```

## Key Takeaways

- 802.1p CoS uses the PCP field (3 bits) in the 802.1Q VLAN tag to mark traffic priority (0-7).
- Use `egress-qos-map` to map Linux SKB priority values to 802.1p CoS on outgoing frames.
- Use `ingress-qos-map` to map incoming 802.1p CoS to Linux SKB priority for local scheduling.
- CoS only has effect when the downstream switch honors 802.1p markings; configure QoS policies on the switch as well.
